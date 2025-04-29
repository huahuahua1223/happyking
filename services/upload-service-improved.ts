import { AGGREGATOR_URL, PUBLISHER_URL } from "@/lib/constants";
import axios from "axios";

interface WalrusResponse {
  alreadyCertified?: { blobId: string }
  newlyCreated?: { blobObject: { blobId: string } }
}

// 辅助函数：规范化 Walrus blobId
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
      const response = await axios.put(PUBLISHER_URL, data, {
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
export async function fetchDataById(blobId: string, retries = 3, timeoutMs = 15000): Promise<ArrayBuffer> {
  let lastError: any = null
  
  // 规范化 blobId
  const normalizedBlobId = normalizeWalrusBlobId(blobId);
  
  if (!normalizedBlobId) {
    throw new Error(`无效的 Blob ID: ${blobId}`);
  }
  
  console.log(`获取数据, 原始blobId: ${blobId}, 规范化后: ${normalizedBlobId}`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`尝试获取 Blob ID ${normalizedBlobId} (${attempt}/${retries})`)
      
      // 创建 AbortController 用于手动实现超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await axios.get(`${AGGREGATOR_URL}/${normalizedBlobId}`, {
          responseType: "arraybuffer",
          timeout: timeoutMs,
          signal: controller.signal as any, // 类型转换以适配 axios
        })
        
        clearTimeout(timeoutId);
        return response.data;
      } catch (axiosError) {
        clearTimeout(timeoutId);
        throw axiosError;
      }
    } catch (error: any) {
      lastError = error
      
      const errorMessage = error.message || String(error);
      console.error(`获取 Blob ID ${normalizedBlobId} 失败 (尝试 ${attempt}/${retries}):`, errorMessage);

      // 处理超时错误
      if (error.name === 'AbortError' || errorMessage.includes('aborted')) {
        console.error(`请求超时 (${timeoutMs}ms)`);
        
        if (attempt < retries) {
          // 下一次尝试增加超时时间
          timeoutMs = Math.min(timeoutMs * 1.5, 45000);
          console.log(`增加超时时间到 ${timeoutMs}ms 并重试...`);
          continue;
        }
      }
      
      // 如果是超时或网络错误，则重试
      if (
        axios.isAxiosError(error) &&
        (error.code === "ECONNABORTED" ||
          error.code === "ETIMEDOUT" ||
          errorMessage.includes("timeout") ||
          error.response?.status === 502 ||
          error.response?.status === 503 ||
          error.response?.status === 504 ||
          error.response?.status === 404)
      ) {
        // 使用指数退避策略
        const waitTime = Math.min(3000 * Math.pow(1.5, attempt - 1), 15000)
        console.log(`等待 ${waitTime}ms 后重试...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      // 其他错误，如果还有重试次数，继续尝试
      if (attempt < retries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`未知错误，等待 ${waitTime}ms 后重试...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      
      // 最后一次重试也失败，抛出错误
      throw error
    }
  }

  // 所有重试都失败
  console.error(`所有 ${retries} 次尝试获取 Blob ID ${normalizedBlobId} 均失败`)
  throw new Error(`获取内容多次尝试失败: ${lastError?.message || '未知错误'}`);
}

// 查询并解析JSON数据
export async function fetchJsonDataById(blobId: string, maxRetries = 3): Promise<any> {
  try {
    // 使用 Promise.race 和超时控制
    const timeout = 30000; // 30秒总超时
    
    const fetchPromise = (async () => {
      try {
        const buffer = await fetchDataById(blobId, maxRetries);
        const text = new TextDecoder().decode(buffer);
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error(`解析 Blob ID ${blobId} 的JSON数据失败:`, parseError);
          return { error: "数据格式错误", message: "无法解析JSON数据" };
        }
      } catch (fetchError) {
        console.error(`获取 Blob ID ${blobId} 失败:`, fetchError);
        throw fetchError;
      }
    })();
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("获取内容超时")), timeout);
    });
    
    // 返回先完成的 Promise
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.error(`获取或解析数据失败: ${error instanceof Error ? error.message : String(error)}`);
    return { 
      error: "获取数据失败", 
      message: error instanceof Error ? error.message : "未知错误",
      blobId
    };
  }
}

// 查询并解析文本数据
export async function fetchTextDataById(blobId: string): Promise<string> {
  try {
    const buffer = await fetchDataById(blobId);
    return new TextDecoder().decode(buffer);
  } catch (error) {
    console.error(`获取文本数据失败: ${error instanceof Error ? error.message : String(error)}`);
    return `无法加载内容: ${error instanceof Error ? error.message : "未知错误"}`;
  }
}
