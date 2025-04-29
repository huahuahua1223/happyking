import { AGGREGATOR_URL, PUBLISHER_URL } from "@/lib/constants";
import axios from "axios";
import { Buffer } from "buffer";
import { v4 as uuidv4 } from "uuid";


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

interface ChunkMetadata {
  fileId: string;
  chunks: { blobId: string; index: number; size: number }[];
  totalSize: number;
  fileName: string;
  mimeType: string;
}

interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
}

// 上传 JSON 数据
 async function uploadJsonData(data: object): Promise<string> {
  const jsonString = JSON.stringify(data)
  const blob = new Blob([jsonString], { type: "application/json" })
  const buffer = await blob.arrayBuffer()

  const response = await axios.put(PUBLISHER_URL, buffer, {
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


// 辅助函数：规范化Walrus blobId
function normalizeWalrusBlobId(blobId: string): string {
  if (!blobId) return '';
  
  // 移除开头的斜杠
  let normalized = blobId.startsWith('/') ? blobId.substring(1) : blobId;
  
  // 移除可能包含的URL部分
  if (normalized.includes('aggregator.walrus')) {
    try {
      const url = new URL(normalized);
      normalized = url.pathname.split('/').pop() || '';
    } catch (e) {
      // 如果不是有效URL，保持原样
    }
  }
  
  // 如果是路径格式，提取最后一部分
  if (normalized.includes('/')) {
    normalized = normalized.split('/').pop() || '';
  }
  
  return normalized.trim();
}

async function fetchDataById(blobId: string, retries = 3, timeout = 30000): Promise<ArrayBuffer> {
  const normalizedBlobId = normalizeWalrusBlobId(blobId)
  if (!normalizedBlobId) throw new Error("无效的 blobId")

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(`${AGGREGATOR_URL}/${normalizedBlobId}`, {
        responseType: "arraybuffer",
        timeout,
        maxRedirects: 5,
      })
      console.log(`获取 blobId ${normalizedBlobId} 成功，状态: ${response.status}`)
      return response.data
    } catch (error) {
      console.error(`尝试 ${attempt} 获取 blobId ${normalizedBlobId} 失败:`, error)
      if (axios.isAxiosError(error)) {
        if ((error.code === "ETIMEDOUT" || error.response?.status === 502) && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 5000 * attempt))
          continue
        }
      }
      throw error
    }
  }
  throw new Error(`获取 blobId ${normalizedBlobId} 失败，尝试 ${retries} 次`)
}


async function uploadToWalrus(
  file: File,
  onProgress?: (progress: number) => void,
  statusCallback?: (status: string) => void,
  t?: (key: string) => string
): Promise<string> {
  const chunkSize = 1 * 1024 * 1024; // 参考 Node.js 脚本，设为 1MB
  const maxConcurrent = 3; // 折中并发数，参考 Node.js 的 5
  const retryCount = 5; // 与 Node.js 脚本一致
  const maxRetryDelay = 10000; // 最大重试延迟 10 秒
  const timeout = 60000; // 增加超时到 60 秒

  const fileName = file.name;
  const totalSize = file.size;
  const mimeType = file.type || "application/octet-stream";
  const chunkCount = Math.ceil(totalSize / chunkSize);

  statusCallback?.(t ? t("space.uploading") : "Uploading...");

  const uploadChunk = async (index: number, attempt = 1): Promise<{ blobId: string; size: number }> => {
    const offset = index * chunkSize;
    const blob = file.slice(offset, offset + chunkSize);
    const buffer = Buffer.from(await blob.arrayBuffer());

    try {
      const response = await axios.put(PUBLISHER_URL, buffer, {
        headers: { "Content-Type": mimeType },
        timeout,
      });

      const data = response.data as WalrusResponse;
      const blobId =
        data.alreadyCertified?.blobId || data.newlyCreated?.blobObject?.blobId;
      if (!blobId) throw new Error("No blobId in response");

      return { blobId, size: buffer.length };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data || error.message;

        if (status === 429 || message.includes("too many requests")) {
          // 处理速率限制
          if (attempt <= retryCount) {
            const delay = Math.min(2000 * Math.pow(2, attempt - 1), maxRetryDelay); // 指数退避
            console.warn(`Rate limit hit, retrying chunk ${index} after ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return uploadChunk(index, attempt + 1);
          }
          throw new Error(`Rate limit exceeded after ${retryCount} attempts: ${message}`);
        }
        if (status === 413) {
          throw new Error(`Chunk too large (size: ${buffer.length} bytes)`);
        }
        if (status === 502 || error.code === "ETIMEDOUT" || error.code === "ERR_NETWORK") {
          if (attempt <= retryCount) {
            const delay = 3000 * attempt;
            console.warn(`Network error, retrying chunk ${index} after ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return uploadChunk(index, attempt + 1);
          }
        }
        throw new Error(`Upload failed: ${message}`);
      }
      throw new Error(`Upload failed: ${String(error)}`);
    }
  };

  const chunks: { blobId: string; index: number; size: number }[] = [];
  let uploadedBytes = 0;

  try {
    for (let i = 0; i < chunkCount; i += maxConcurrent) {
      const batch = Array.from(
        { length: Math.min(maxConcurrent, chunkCount - i) },
        (_, j) => i + j
      );
      const results = await Promise.all(batch.map((index) => uploadChunk(index)));

      results.forEach((result, j) => {
        chunks.push({ blobId: result.blobId, index: i + j, size: result.size });
        uploadedBytes += result.size;
        const percentage = (uploadedBytes / totalSize) * 100;
        onProgress?.(percentage);
      });
    }

    const metadata: ChunkMetadata = {
      fileId: uuidv4(),
      chunks: chunks.sort((a, b) => a.index - b.index),
      totalSize,
      fileName,
      mimeType,
    };

    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
    const metadataBuffer = Buffer.from(await metadataBlob.arrayBuffer());
    const metadataResponse = await axios.put(PUBLISHER_URL, metadataBuffer, {
      headers: { "Content-Type": "application/json" },
      timeout,
    });

    const metadataData = metadataResponse.data as WalrusResponse;
    const metadataId =
      metadataData.alreadyCertified?.blobId ||
      metadataData.newlyCreated?.blobObject?.blobId;

    if (!metadataId) throw new Error("No metadata blobId in response");

    statusCallback?.(t ? t("space.upload.success") : "Upload successful");
    return metadataId;
  } catch (error) {
    const errorMessage = axios.isAxiosError(error)
      ? error.response?.data || error.message
      : String(error);
    throw new Error(`Upload failed: ${errorMessage}`);
  }
}

async function getWalrusContent(blobId: string): Promise<any> {
  try {
    const normalizedBlobId = normalizeWalrusBlobId(blobId)
    if (!normalizedBlobId) {
      console.error("无效的 blobId:", blobId)
      return { error: "无效的内容ID", text: "内容无法加载" }
    }

    console.log(`从 Walrus 获取内容: blobId=${normalizedBlobId}`)
    const buffer = await fetchDataById(normalizedBlobId)
    const text = new TextDecoder().decode(buffer)

    try {
      const jsonData = JSON.parse(text)
      console.log(`成功解析 JSON: ${normalizedBlobId}`)
      return jsonData
    } catch (e) {
      console.log(`非 JSON，返回文本: ${normalizedBlobId}`)
      return { text }
    }
  } catch (error) {
    console.error(`从 Walrus 获取内容失败: ${blobId}`, error)
    return {
      error: error instanceof Error ? error.message : "未知错误",
      text: "内容加载失败",
      originalBlobId: blobId,
    }
  }
}

 async function uploadTextData(text: string): Promise<string> {
  const blob = new Blob([text], { type: "text/plain" })
  const buffer = await blob.arrayBuffer()

  const response = await axios.put(PUBLISHER_URL, buffer, {
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

// 生成文件唯一ID
function generateFileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`
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
    // 使用类型断言
    let updatedChunk: ChunkStatus = { ...chunk, status: "uploading" }

    try {
      const fileSlice = file.slice(chunk.start, chunk.end)
      const buffer = await fileSlice.arrayBuffer()

      updateStatus({
        message: `上传分片 ${chunk.index + 1}/${totalChunks}...`,
        currentChunk: chunk.index,
      })

      while (updatedChunk.retryCount < MAX_CHUNK_RETRIES) {
        try {
          const response = await axios.put(PUBLISHER_URL, buffer, {
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

      const metadataResponse = await axios.put(PUBLISHER_URL, metadataBuffer, {
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

// 存储上传会话的本地存储键
const UPLOAD_SESSION_KEY = "walrus-upload-session"

// 清除上传会话
function clearUploadSession(): void {
  try {
    localStorage.removeItem(UPLOAD_SESSION_KEY)
  } catch (error) {
    console.error("Failed to clear upload session:", error)
  }
}

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

  // 尝试恢复上传会话
  let chunks: ChunkStatus[] = []
  let resumedUpload = false

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

// 取消上传并清除会话
export function cancelUpload(): void {
  clearUploadSession()
}

export { fetchDataById, getWalrusContent, uploadJsonData, uploadTextData, uploadToWalrus };

