"use client"

import { useLanguage } from "@/lib/i18n/context"
import { getUserFriendlyError, getTechnicalErrorDetails } from "./error-handler"

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