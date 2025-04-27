"use client"

/**
 * 错误处理工具
 * Error handling utilities
 */
import { useLanguage } from "@/lib/i18n/context"

// 定义错误类型和对应的用户友好消息键
// Define error types and corresponding user-friendly message keys
const ERROR_MESSAGE_KEYS: Record<string, string> = {
  // 网络错误
  // Network errors
  network: "error.network",
  timeout: "error.timeout",
  server: "error.server",

  // 限流错误
  // Rate limiting errors
  rate_limit: "error.rate_limit",

  // 上传错误
  // Upload errors
  upload_failed: "error.upload_failed",
  file_too_large: "error.file_too_large",
  file_too_large_video: "error.file_too_large_video",
  invalid_file_type: "error.invalid_file_type",
  upload_timeout: "error.upload_timeout",

  // 合约错误
  // Contract errors
  contract_error: "error.contract_error",
  wallet_rejected: "error.wallet_rejected",
  insufficient_funds: "error.insufficient_funds",

  // 通用错误
  // Generic errors
  unknown: "error.unknown",
  testnet_unstable: "error.testnet_unstable",
}

/**
 * 获取用户友好的错误消息
 * Get user-friendly error message
 *
 * @param error 错误对象或消息 Error object or message
 * @param errorType 错误类型 Error type
 * @param t 翻译函数 Translation function
 * @returns 用户友好的错误消息 User-friendly error message
 */
export function getUserFriendlyError(error: any, errorType = "unknown", t: (key: string) => string): string {
  // 检查是否是已知错误类型
  // Check if it's a known error type
  if (errorType in ERROR_MESSAGE_KEYS) {
    return t(ERROR_MESSAGE_KEYS[errorType])
  }

  // 检查是否是HTTP错误
  // Check if it's an HTTP error
  if (error?.response?.status) {
    const status = error.response.status

    // 处理常见HTTP错误
    // Handle common HTTP errors
    if (status === 429) {
      return t(ERROR_MESSAGE_KEYS["rate_limit"])
    } else if (status >= 500) {
      return t(ERROR_MESSAGE_KEYS["server"])
    } else if (status === 413) {
      return t(ERROR_MESSAGE_KEYS["file_too_large"])
    } else if (status === 415) {
      return t(ERROR_MESSAGE_KEYS["invalid_file_type"])
    } else if (status === 408 || error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return t(ERROR_MESSAGE_KEYS["upload_timeout"])
    }
  }

  // 检查网络错误
  // Check for network errors
  if (error?.message?.includes("Network Error") || error?.code === "ERR_NETWORK") {
    return t(ERROR_MESSAGE_KEYS["network"])
  }

  // 返回通用错误消息
  // Return generic error message
  return t(ERROR_MESSAGE_KEYS["unknown"])
}

/**
 * 获取技术错误详情（仅用于开发和日志）
 * Get technical error details (for development and logging only)
 *
 * @param error 错误对象 Error object
 * @returns 错误详情字符串 Error details string
 */
export function getTechnicalErrorDetails(error: any): string {
  if (!error) return "No error details available"

  let details = ""

  if (error.message) {
    details += `Message: ${error.message}\n`
  }

  if (error.response) {
    details += `Status: ${error.response.status}\n`
    details += `Status Text: ${error.response.statusText}\n`

    if (error.response.data) {
      details += `Response Data: ${JSON.stringify(error.response.data)}\n`
    }
  }

  if (error.stack) {
    details += `Stack: ${error.stack}\n`
  }

  return details || String(error)
}

/**
 * 错误处理钩子
 * Error handling hook
 */
export function useErrorHandler() {
  const { t } = useLanguage()

  return {
    getUserFriendlyError: (error: any, errorType = "unknown") => getUserFriendlyError(error, errorType, t),
    getTechnicalErrorDetails,
  }
}
