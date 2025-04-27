"use client"

import { AGGREGATOR_URL, PUBLISHER_URL } from "@/lib/constants"
import { getTechnicalErrorDetails } from "@/lib/error-handler"
import axios from "axios"

// 将文件顶部的常量定义替换为:
const PUBLISHER = PUBLISHER_URL

// 上传状态类型
export type UploadStatus = {
  state: "idle" | "uploading" | "retrying" | "paused" | "completed" | "failed"
  progress: number
  message?: string
  currentChunk?: number
  totalChunks?: number
  retryCount?: number
  error?: string
}

// 分片状态类型
type ChunkStatus = {
  index: number
  start: number
  end: number
  size: number
  status: "pending" | "uploading" | "completed" | "failed"
  retryCount: number
  blobId?: string
  error?: string
}

interface WalrusResponse {
  alreadyCertified?: { blobId: string; event?: { txDigest: string; eventSeq?: string }; endEpoch?: number }
  newlyCreated?: {
    blobObject: {
      id: string
      registeredEpoch: number
      blobId: string
      size: number
      encodingType: string
      certifiedEpoch: number
      storage: {
        id: string
        startEpoch: number
        endEpoch: number
        storageSize: number
      }
      deletable: boolean
    }
    resourceOperation?: {
      registerFromScratch?: {
        encodedLength: number
        epochsAhead: number
      }
    }
  }
  cost?: number
}

// 存储上传会话的本地存储键
const UPLOAD_SESSION_KEY = "walrus-upload-session"

// 保存上传会话到本地存储
function saveUploadSession(fileId: string, chunks: ChunkStatus[]): void {
  try {
    const session = {
      fileId,
      chunks,
      timestamp: Date.now(),
    }
    localStorage.setItem(UPLOAD_SESSION_KEY, JSON.stringify(session))
  } catch (error) {
    console.error("Failed to save upload session:", error)
  }
}

// 从本地存储获取上传会话
function getUploadSession(fileId: string): ChunkStatus[] | null {
  try {
    const sessionStr = localStorage.getItem(UPLOAD_SESSION_KEY)
    if (!sessionStr) return null

    const session = JSON.parse(sessionStr)
    if (session.fileId !== fileId || Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
      // 如果文件ID不匹配或会话超过24小时，则清除会话
      localStorage.removeItem(UPLOAD_SESSION_KEY)
      return null
    }

    return session.chunks
  } catch (error) {
    console.error("Failed to get upload session:", error)
    return null
  }
}

// 清除上传会话
function clearUploadSession(): void {
  try {
    localStorage.removeItem(UPLOAD_SESSION_KEY)
  } catch (error) {
    console.error("Failed to clear upload session:", error)
  }
}

// 生成文件唯一ID
function generateFileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`
}

// 修改uploadToWalrus函数，添加状态回调和断点续传
export async function uploadToWalrus(
  file: File,
  onProgress?: (progress: number) => void,
  onStatus?: (status: UploadStatus) => void,
  t?: (key: string) => string,
  resumeUpload = true,
): Promise<string> {
  const MAX_RETRIES = 5
  let retries = 0

  // 默认翻译函数，如果没有提供
  const translate = t || ((key: string) => key)

  // 更新状态的辅助函数
  const updateStatus = (status: Partial<UploadStatus>) => {
    if (onStatus) {
      onStatus({
        state: "idle",
        progress: 0,
        ...status,
      })
    }

    // 同时更新进度
    if (onProgress && status.progress !== undefined) {
      onProgress(status.progress)
    }
  }

  // 添加指数退避重试
  const attemptUpload = async (): Promise<string> => {
    try {
      updateStatus({
        state: "uploading",
        progress: 0,
        message: translate("upload.starting"),
      })

      // 对于小文件，直接上传
      if (file.size <= 1 * 1024 * 1024) {
        updateStatus({
          message: translate("upload.small_file"),
          progress: 5,
        })
        return await uploadSingleFile(file, updateStatus)
      }

      // 对于大文件（如视频），使用分片上传
      if (file.type.startsWith("video/") || file.size > 1 * 1024 * 1024) {
        updateStatus({
          message: translate("upload.large_file"),
          progress: 5,
        })
        return await uploadLargeFile(file, updateStatus, resumeUpload)
      }

      // 默认使用单文件上传
      return await uploadSingleFile(file, updateStatus)
    } catch (error: any) {
      // 检查是否是429错误（请求过多）
      if (error.response && error.response.status === 429 && retries < MAX_RETRIES) {
        retries++
        // 使用指数退避算法计算等待时间
        const waitTime = Math.min(1000 * Math.pow(2, retries), 30000) // 最多等待30秒

        updateStatus({
          state: "retrying",
          message: translate("upload.rate_limited") + ` (${retries}/${MAX_RETRIES})`,
          retryCount: retries,
        })

        console.log(`遇到限流，等待${waitTime}ms后重试 (${retries}/${MAX_RETRIES})...`)

        // 等待一段时间后重试
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        return attemptUpload()
      }

      // 记录详细错误信息（仅用于开发和日志）
      console.error("上传失败详情:", getTechnicalErrorDetails(error))

      // 确定错误类型
      let errorType = "upload_failed"
      let errorMessage = ""

      if (error.response && error.response.status === 429) {
        errorType = "rate_limit"
        errorMessage = translate("error.rate_limit")
      } else if (
        error.code === "ECONNABORTED" ||
        error.message?.includes("timeout") ||
        error.message?.includes("exceeded")
      ) {
        errorType = "upload_timeout"
        errorMessage = translate("error.upload_timeout")
      } else if (error.message?.includes("Network Error") || !navigator.onLine) {
        errorType = "testnet_unstable"
        errorMessage = translate("error.testnet_unstable")
      } else {
        errorMessage = translate("error.upload_failed")
      }

      updateStatus({
        state: "failed",
        message: errorMessage,
        error: errorMessage,
      })

      // 抛出用户友好的错误消息
      throw new Error(errorMessage)
    }
  }

  return attemptUpload()
}

// 修改uploadSingleFile函数，添加状态更新
async function uploadSingleFile(file: File, updateStatus: (status: Partial<UploadStatus>) => void): Promise<string> {
  let retries = 0
  const MAX_RETRIES = 3

  while (retries < MAX_RETRIES) {
    try {
      updateStatus({
        state: "uploading",
        progress: 10,
        message: `${retries > 0 ? "重试中: " : ""}上传文件...`,
      })

      const response = await axios.put(PUBLISHER, await file.arrayBuffer(), {
        headers: { "Content-Type": file.type },
        timeout: 60000, // 60秒超时
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size))
          updateStatus({
            progress: Math.min(10 + percentCompleted * 0.8, 90), // 保留10%用于处理响应
            message: `上传进度: ${percentCompleted}%`,
          })
        },
      })

      updateStatus({
        progress: 95,
        message: "处理响应...",
      })

      const data = response.data as WalrusResponse

      let blobId: string
      if (data.alreadyCertified?.blobId) {
        blobId = data.alreadyCertified.blobId
      } else if (data.newlyCreated?.blobObject?.blobId) {
        blobId = data.newlyCreated.blobObject.blobId
      } else {
        throw new Error("error.upload_failed")
      }

      updateStatus({
        state: "completed",
        progress: 100,
        message: "上传完成!",
      })

      return blobId
    } catch (error: any) {
      retries++

      // 如果是429错误或最后一次重试失败，则抛出错误
      if ((error.response?.status === 429 && retries >= MAX_RETRIES) || retries >= MAX_RETRIES) {
        updateStatus({
          state: "failed",
          message: "上传失败",
          error: error.message,
        })
        throw error
      }

      // 使用指数退避等待
      const waitTime = Math.min(1000 * Math.pow(2, retries), 10000)

      updateStatus({
        state: "retrying",
        message: `上传失败，${waitTime / 1000}秒后重试 (${retries}/${MAX_RETRIES})...`,
        retryCount: retries,
      })

      console.log(`单文件上传失败，等待${waitTime}ms后重试 (${retries}/${MAX_RETRIES})...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  throw new Error("error.upload_failed")
}

// 修改uploadLargeFile函数，实现断点续传和细粒度重试
async function uploadLargeFile(
  file: File,
  updateStatus: (status: Partial<UploadStatus>) => void,
  resumeUpload = true,
): Promise<string> {
  const fileId = generateFileId(file)
  const chunkSize = 512 * 1024 // 512KB分片
  const totalChunks = Math.ceil(file.size / chunkSize)

  // 尝试恢复上传会话
  let chunks: ChunkStatus[] = []
  let resumedUpload = false

  if (resumeUpload) {
    const savedChunks = getUploadSession(fileId)
    if (savedChunks && savedChunks.length === totalChunks) {
      chunks = savedChunks
      resumedUpload = true

      updateStatus({
        state: "uploading",
        message: "恢复上传会话...",
        currentChunk: chunks.filter((c) => c.status === "completed").length,
        totalChunks,
      })

      // 计算已完成的进度
      const completedChunks = chunks.filter((c) => c.status === "completed").length
      const initialProgress = Math.floor((completedChunks / totalChunks) * 80)
      updateStatus({ progress: initialProgress })
    }
  }

  // 如果没有恢复会话，则初始化分片状态
  if (!resumedUpload) {
    chunks = Array.from({ length: totalChunks }, (_, i) => {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      return {
        index: i,
        start,
        end,
        size: end - start,
        status: "pending",
        retryCount: 0,
      }
    })

    // 保存初始会话
    saveUploadSession(fileId, chunks)
  }

  updateStatus({
    currentChunk: 0,
    totalChunks,
    message: `准备上传 ${totalChunks} 个分片${resumedUpload ? " (已恢复)" : ""}...`,
  })

  // 上传单个分片
  const uploadChunk = async (chunk: ChunkStatus): Promise<ChunkStatus> => {
    // 如果分片已完成，直接返回
    if (chunk.status === "completed" && chunk.blobId) {
      return chunk
    }

    const MAX_CHUNK_RETRIES = 3
    let updatedChunk = { ...chunk, status: "uploading" as const }

    try {
      const fileSlice = file.slice(chunk.start, chunk.end)
      const buffer = await fileSlice.arrayBuffer()

      updateStatus({
        message: `上传分片 ${chunk.index + 1}/${totalChunks}...`,
        currentChunk: chunk.index,
      })

      while (updatedChunk.retryCount < MAX_CHUNK_RETRIES) {
        try {
          const response = await axios.put(PUBLISHER, buffer, {
            headers: { "Content-Type": file.type },
            timeout: 60000, // 60秒超时
          })

          const data = response.data as WalrusResponse
          let blobId: string

          if (data.alreadyCertified?.blobId) {
            blobId = data.alreadyCertified.blobId
          } else if (data.newlyCreated?.blobObject?.blobId) {
            blobId = data.newlyCreated.blobObject.blobId
          } else {
            throw new Error("error.upload_failed")
          }

          // 更新分片状态为完成
          updatedChunk = {
            ...updatedChunk,
            status: "completed",
            blobId,
          }

          // 更新会话
          chunks[chunk.index] = updatedChunk
          saveUploadSession(fileId, chunks)

          return updatedChunk
        } catch (error: any) {
          updatedChunk.retryCount++

          // 如果是429错误或最后一次重试失败，则标记为失败
          if (
            (error.response?.status === 429 && updatedChunk.retryCount >= MAX_CHUNK_RETRIES) ||
            updatedChunk.retryCount >= MAX_CHUNK_RETRIES
          ) {
            updatedChunk = {
              ...updatedChunk,
              status: "failed",
              error: error.message,
            }

            // 更新会话
            chunks[chunk.index] = updatedChunk
            saveUploadSession(fileId, chunks)

            throw error
          }

          // 使用指数退避等待
          const waitTime = Math.min(1000 * Math.pow(2, updatedChunk.retryCount), 10000)

          updateStatus({
            state: "retrying",
            message: `分片 ${chunk.index + 1} 上传失败，${waitTime / 1000}秒后重试 (${updatedChunk.retryCount}/${MAX_CHUNK_RETRIES})...`,
          })

          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }
      }

      throw new Error(`分片 ${chunk.index + 1} 上传失败，已达到最大重试次数`)
    } catch (error) {
      console.error(`分片 ${chunk.index + 1} 上传失败:`, error)
      updatedChunk = {
        ...updatedChunk,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      }

      // 更新会话
      chunks[chunk.index] = updatedChunk
      saveUploadSession(fileId, chunks)

      throw error
    }
  }

  // 串行上传分片，一次只上传一个
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].status !== "completed") {
      try {
        await uploadChunk(chunks[i])

        // 计算进度
        const completedChunks = chunks.filter((c) => c.status === "completed").length
        const progress = Math.floor((completedChunks / totalChunks) * 80) // 保留20%用于元数据上传

        updateStatus({
          progress,
          currentChunk: i + 1,
          message: `已完成 ${completedChunks}/${totalChunks} 个分片`,
        })
      } catch (error) {
        // 如果分片上传失败，尝试继续上传下一个分片
        console.error(`分片 ${i + 1} 上传失败，继续下一个分片:`, error)

        updateStatus({
          message: `分片 ${i + 1} 上传失败，继续下一个分片...`,
        })

        // 如果连续3个分片都失败，则中断上传
        const failedChunks = chunks.slice(Math.max(0, i - 2), i + 1).filter((c) => c.status === "failed").length

        if (failedChunks >= 3) {
          updateStatus({
            state: "failed",
            message: "连续多个分片上传失败，上传中断",
            error: "连续多个分片上传失败",
          })
          throw new Error("连续多个分片上传失败，上传中断")
        }
      }
    } else {
      // 如果分片已完成，更新进度
      const completedChunks = chunks.filter((c) => c.status === "completed").length
      const progress = Math.floor((completedChunks / totalChunks) * 80)

      updateStatus({
        progress,
        currentChunk: i + 1,
        message: `已完成 ${completedChunks}/${totalChunks} 个分片 (跳过已完成分片)`,
      })
    }

    // 添加请求间隔，避免触发限流
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  // 检查是否所有分片都已上传成功
  const failedChunks = chunks.filter((c) => c.status === "failed")
  if (failedChunks.length > 0) {
    updateStatus({
      state: "failed",
      message: `${failedChunks.length} 个分片上传失败，无法完成上传`,
      error: "部分分片上传失败",
    })
    throw new Error(`${failedChunks.length} 个分片上传失败，无法完成上传`)
  }

  // 准备上传元数据
  updateStatus({
    progress: 85,
    message: "准备上传元数据...",
  })

  // 上传元数据前等待更长时间
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 上传元数据
  const completedChunks = chunks.filter((c) => c.status === "completed" && c.blobId)
  if (completedChunks.length !== totalChunks) {
    updateStatus({
      state: "failed",
      message: "部分分片缺失，无法完成上传",
      error: "部分分片缺失",
    })
    throw new Error("部分分片缺失，无法完成上传")
  }

  const metadata = {
    videoId: `video_${Date.now()}`,
    chunks: completedChunks.map((c) => ({
      blobId: c.blobId,
      index: c.index,
      size: c.size,
    })),
    totalSize: file.size,
    fileName: file.name,
    mimeType: file.type,
  }

  updateStatus({
    progress: 90,
    message: "上传元数据...",
  })

  // 元数据上传也添加重试逻辑
  let metadataRetries = 0
  const MAX_METADATA_RETRIES = 3

  while (metadataRetries < MAX_METADATA_RETRIES) {
    try {
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" })
      const metadataBuffer = await metadataBlob.arrayBuffer()

      const metadataResponse = await axios.put(PUBLISHER, metadataBuffer, {
        headers: { "Content-Type": "application/json" },
        timeout: 60000, // 60秒超时
      })

      const metadataData = metadataResponse.data as WalrusResponse
      let metadataBlobId: string

      if (metadataData.alreadyCertified?.blobId) {
        metadataBlobId = metadataData.alreadyCertified.blobId
      } else if (metadataData.newlyCreated?.blobObject?.blobId) {
        metadataBlobId = metadataData.newlyCreated.blobObject.blobId
      } else {
        throw new Error("error.upload_failed")
      }

      // 上传成功，清除会话
      clearUploadSession()

      updateStatus({
        state: "completed",
        progress: 100,
        message: "上传完成!",
      })

      return metadataBlobId
    } catch (error: any) {
      metadataRetries++

      // 如果是429错误或最后一次重试失败，则抛出错误
      if (
        (error.response?.status === 429 && metadataRetries >= MAX_METADATA_RETRIES) ||
        metadataRetries >= MAX_METADATA_RETRIES
      ) {
        updateStatus({
          state: "failed",
          message: "元数据上传失败",
          error: error.message,
        })
        throw error
      }

      // 使用指数退避等待
      const waitTime = Math.min(2000 * Math.pow(2, metadataRetries), 15000)

      updateStatus({
        state: "retrying",
        message: `元数据上传失败，${waitTime / 1000}秒后重试 (${metadataRetries}/${MAX_METADATA_RETRIES})...`,
      })

      console.log(`元数据上传失败，等待${waitTime}ms后重试 (${metadataRetries}/${MAX_METADATA_RETRIES})...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  updateStatus({
    state: "failed",
    message: "元数据上传失败，已达到最大重试次数",
    error: "元数据上传失败",
  })

  throw new Error("error.upload_failed")
}

// 添加以下新函数到文件末尾

// 上传文本数据
export async function uploadTextData(text: string): Promise<string> {
  const blob = new Blob([text], { type: "text/plain" })
  const buffer = await blob.arrayBuffer()

  const response = await axios.put(PUBLISHER, buffer, {
    headers: { "Content-Type": "text/plain" },
    timeout: 60000, // 增加超时时间到60秒
  })

  const data = response.data as WalrusResponse

  if (data.alreadyCertified?.blobId) {
    return data.alreadyCertified.blobId
  }

  if (data.newlyCreated?.blobObject?.blobId) {
    return data.newlyCreated.blobObject.blobId
  }

  throw new Error("error.upload_failed")
}

// 上传 JSON 数据
export async function uploadJsonData(data: object): Promise<string> {
  const jsonString = JSON.stringify(data)
  const blob = new Blob([jsonString], { type: "application/json" })
  const buffer = await blob.arrayBuffer()

  const response = await axios.put(PUBLISHER, buffer, {
    headers: { "Content-Type": "application/json" },
    timeout: 60000, // 增加超时时间到60秒
  })

  const data2 = response.data as WalrusResponse

  if (data2.alreadyCertified?.blobId) {
    return data2.alreadyCertified.blobId
  }

  if (data2.newlyCreated?.blobObject?.blobId) {
    return data2.newlyCreated.blobObject.blobId
  }

  throw new Error("error.upload_failed")
}

// 查询数据
export async function fetchDataById(blobId: string): Promise<ArrayBuffer> {
  try {
    const response = await axios.get(`${AGGREGATOR_URL}${blobId}`, {
      responseType: "arraybuffer",
    })
    return response.data
  } catch (error) {
    console.error("Error fetching data:", error)
    throw error
  }
}

// 查询并解析JSON数据
export async function fetchJsonDataById(blobId: string): Promise<any> {
  const buffer = await fetchDataById(blobId)
  const text = new TextDecoder().decode(buffer)
  return JSON.parse(text)
}

// 查询并解析文本数据
export async function fetchTextDataById(blobId: string): Promise<string> {
  const buffer = await fetchDataById(blobId)
  return new TextDecoder().decode(buffer)
}

// 暂停上传
export function pauseUpload(): void {
  // 这个函数可以在未来实现，目前只是一个占位符
  console.log("暂停上传功能尚未实现")
}

// 恢复上传
export async function resumeUpload(
  file: File,
  onProgress?: (progress: number) => void,
  onStatus?: (status: UploadStatus) => void,
  t?: (key: string) => string,
): Promise<string> {
  return uploadToWalrus(file, onProgress, onStatus, t, true)
}

// 取消上传并清除会话
export function cancelUpload(): void {
  clearUploadSession()
}

export async function getWalrusContent(blobId: string): Promise<any> {
  try {
    console.log(`从Walrus获取内容: ${blobId}`)

    // 获取原始数据
    const buffer = await fetchDataById(blobId)
    const text = new TextDecoder().decode(buffer)

    try {
      // 尝试解析为JSON
      const jsonData = JSON.parse(text)
      console.log(`成功解析为JSON: ${blobId}`, jsonData)
      return jsonData
    } catch (e) {
      // 如果不是JSON，则返回文本
      console.log(`不是JSON，返回文本: ${blobId}`)
      return { text }
    }
  } catch (error) {
    console.error(`从Walrus获取内容失败: ${blobId}`, error)
    throw error
  }
}
