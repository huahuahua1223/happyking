import axios from "axios"

const PUBLISHER = "https://publisher.walrus-testnet.walrus.space/v1/blobs"
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space/v1/blobs"

interface WalrusResponse {
  alreadyCertified?: { blobId: string }
  newlyCreated?: { blobObject: { blobId: string } }
}

// 上传文本数据
export async function uploadTextData(text: string, retries = 5): Promise<string> {
  const blob = new Blob([text], { type: "text/plain" })
  const buffer = await blob.arrayBuffer()
  return uploadData(buffer, "text/plain", retries)
}

// 上传 JSON 元数据
export async function uploadJsonData(data: object, retries = 5): Promise<string> {
  const jsonString = JSON.stringify(data)
  const blob = new Blob([jsonString], { type: "application/json" })
  const buffer = await blob.arrayBuffer()
  return uploadData(buffer, "application/json", retries)
}

// 上传数据
async function uploadData(data: ArrayBuffer, contentType: string, retries = 5): Promise<string> {
  let lastError: any = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`尝试上传 (${attempt}/${retries}), 数据大小: ${data.byteLength} 字节`)

      // 增加超时时间，处理网络不稳定情况
      const response = await axios.put(PUBLISHER, data, {
        headers: { "Content-Type": contentType },
        timeout: 60000, // 60秒超时
      })

      console.log(`响应状态: ${response.status}`)
      const dataTyped = response.data as WalrusResponse

      if (dataTyped.alreadyCertified?.blobId) {
        return dataTyped.alreadyCertified.blobId
      }

      if (dataTyped.newlyCreated?.blobObject?.blobId) {
        return dataTyped.newlyCreated.blobObject.blobId
      }

      throw new Error("响应中未返回 Blob ID")
    } catch (error: any) {
      lastError = error

      // 检查是否是限流错误 (429)
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        console.log(`遇到限流 (429), 尝试 ${attempt}/${retries}`)

        // 使用指数退避策略
        const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 30000)
        console.log(`等待 ${waitTime}ms 后重试...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      // 处理其他网络错误
      if (
        axios.isAxiosError(error) &&
        (error.code === "ECONNABORTED" ||
          error.code === "ETIMEDOUT" ||
          error.response?.status === 502 ||
          error.response?.status === 503 ||
          error.response?.status === 504)
      ) {
        console.log(`网络错误: ${error.message}, 尝试 ${attempt}/${retries}`)

        // 使用指数退避策略
        const waitTime = Math.min(3000 * Math.pow(1.5, attempt - 1), 20000)
        console.log(`等待 ${waitTime}ms 后重试...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      // 其他错误直接抛出
      throw error
    }
  }

  // 所有重试都失败
  console.error(`所有 ${retries} 次尝试均失败`)
  throw lastError
}

// 查询数据
export async function fetchDataById(blobId: string, retries = 3): Promise<ArrayBuffer> {
  let lastError: any = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`尝试获取 Blob ID ${blobId} (${attempt}/${retries})`)
      const response = await axios.get(`${AGGREGATOR}/${blobId}`, {
        responseType: "arraybuffer",
        timeout: 60000, // 增加到60秒超时
      })
      return response.data
    } catch (error: any) {
      lastError = error
      console.error(`获取 Blob ID ${blobId} 失败 (尝试 ${attempt}/${retries}):`, error.message || error)

      // 如果是超时或网络错误，则重试
      if (
        axios.isAxiosError(error) &&
        (error.code === "ECONNABORTED" ||
          error.code === "ETIMEDOUT" ||
          error.message.includes("timeout") ||
          error.response?.status === 502 ||
          error.response?.status === 503 ||
          error.response?.status === 504)
      ) {
        // 使用指数退避策略
        const waitTime = Math.min(3000 * Math.pow(1.5, attempt - 1), 15000)
        console.log(`等待 ${waitTime}ms 后重试...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      // 其他错误直接抛出
      throw error
    }
  }

  // 所有重试都失败
  console.error(`所有 ${retries} 次尝试获取 Blob ID ${blobId} 均失败`)
  throw lastError
}

// 查询并解析JSON数据
export async function fetchJsonDataById(blobId: string): Promise<any> {
  try {
    const buffer = await fetchDataById(blobId)
    const text = new TextDecoder().decode(buffer)
    try {
      return JSON.parse(text)
    } catch (parseError) {
      console.error(`解析 Blob ID ${blobId} 的JSON数据失败:`, parseError)
      // 返回一个空对象而不是抛出错误
      return {}
    }
  } catch (error) {
    console.error(`获取 Blob ID ${blobId} 失败:`, error)
    // 返回一个空对象而不是抛出错误
    return {}
  }
}

// 查询并解析文本数据
export async function fetchTextDataById(blobId: string): Promise<string> {
  const buffer = await fetchDataById(blobId)
  return new TextDecoder().decode(buffer)
}
