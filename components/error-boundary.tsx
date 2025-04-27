"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error("捕获到错误:", error)
      setHasError(true)
      setError(error.error || new Error(error.message))
    }

    // 添加全局错误处理
    window.addEventListener("error", errorHandler)

    // 清理函数
    return () => {
      window.removeEventListener("error", errorHandler)
    }
  }, [])

  if (hasError) {
    // 如果提供了自定义的 fallback，则使用它
    if (fallback) {
      return <>{fallback}</>
    }

    // 默认的错误 UI
    return (
      <Card className="p-6 my-4 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h2 className="text-2xl font-bold mb-2">出现了一些问题</h2>
        <p className="text-muted-foreground mb-4">{error?.message || "应用程序遇到了意外错误，请尝试刷新页面"}</p>
        <Button
          onClick={() => {
            setHasError(false)
            setError(null)
            window.location.reload()
          }}
          className="mx-auto"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新页面
        </Button>
      </Card>
    )
  }

  return <>{children}</>
}
