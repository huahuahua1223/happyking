"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle, RefreshCw, ShieldAlert, XCircle } from "lucide-react"

export default function DebugPage() {
  const [browserInfo, setBrowserInfo] = useState<Record<string, any>>({})
  const [walletInfo, setWalletInfo] = useState<Record<string, any>>({})
  const [errorLogs, setErrorLogs] = useState<string[]>([])
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({
    basicNavigation: null,
    walletDetection: null,
    errorHandling: null,
    localStorage: null,
  })

  // 收集浏览器信息
  useEffect(() => {
    const info: Record<string, any> = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      localStorage: typeof localStorage !== "undefined",
      sessionStorage: typeof sessionStorage !== "undefined",
    }

    // 检查是否在应急模式
    info.emergencyMode = localStorage.getItem("ses_error_detected") === "true"
    info.safeMode = localStorage.getItem("app_safe_mode") === "true"

    setBrowserInfo(info)
  }, [])

  // 收集钱包信息
  useEffect(() => {
    const info: Record<string, any> = {
      ethereumAvailable: typeof window !== "undefined" && !!window.ethereum,
    }

    if (info.ethereumAvailable) {
      try {
        info.isMetaMask = window.ethereum.isMetaMask
        info.selectedAddress = window.ethereum.selectedAddress

        // 安全地获取chainId
        window.ethereum
          .request({ method: "eth_chainId" })
          .then((chainId: string) => {
            setWalletInfo((prev) => ({ ...prev, chainId }))
          })
          .catch((err: any) => {
            setWalletInfo((prev) => ({ ...prev, chainIdError: err.message }))
          })
      } catch (error) {
        info.error = error instanceof Error ? error.message : "Unknown error"
      }
    }

    setWalletInfo(info)
  }, [])

  // 收集错误日志
  useEffect(() => {
    const logs: string[] = []

    // 检查localStorage中是否有错误日志
    const storedLogs = localStorage.getItem("app_error_logs")
    if (storedLogs) {
      try {
        const parsedLogs = JSON.parse(storedLogs)
        if (Array.isArray(parsedLogs)) {
          logs.push(...parsedLogs)
        }
      } catch (e) {
        logs.push(`Error parsing stored logs: ${e instanceof Error ? e.message : "Unknown error"}`)
      }
    }

    setErrorLogs(logs)

    // 设置错误监听器来捕获新错误
    const errorHandler = (event: ErrorEvent) => {
      const errorMsg = `${new Date().toISOString()} - ${event.message} (${event.filename}:${event.lineno})`
      setErrorLogs((prev) => [...prev, errorMsg])

      // 存储到localStorage
      try {
        const currentLogs = JSON.parse(localStorage.getItem("app_error_logs") || "[]")
        currentLogs.push(errorMsg)
        localStorage.setItem("app_error_logs", JSON.stringify(currentLogs.slice(-50))) // 只保留最近50条
      } catch (e) {
        console.error("Failed to store error log:", e)
      }
    }

    window.addEventListener("error", errorHandler)

    return () => {
      window.removeEventListener("error", errorHandler)
    }
  }, [])

  // 运行诊断测试
  const runTests = async () => {
    const results: Record<string, boolean> = {
      basicNavigation: false,
      walletDetection: false,
      errorHandling: false,
      localStorage: false,
    }

    // 测试基本导航
    try {
      const testLink = document.createElement("a")
      testLink.href = "/"
      testLink.click()
      results.basicNavigation = true
    } catch (e) {
      console.error("Navigation test failed:", e)
    }

    // 测试钱包检测
    try {
      results.walletDetection = typeof window !== "undefined" && !!window.ethereum
    } catch (e) {
      console.error("Wallet detection test failed:", e)
    }

    // 测试错误处理
    try {
      const originalConsoleError = console.error
      let errorCaught = false

      console.error = () => {
        errorCaught = true
      }

      // 故意触发一个错误
      try {
        // @ts-ignore - 故意触发错误
        const nonExistentVariable = undefined // Declare the variable
        const test = nonExistentVariable.property
      } catch (e) {
        // 预期的错误
      }

      console.error = originalConsoleError
      results.errorHandling = errorCaught
    } catch (e) {
      console.error("Error handling test failed:", e)
    }

    // 测试localStorage
    try {
      localStorage.setItem("test_key", "test_value")
      const value = localStorage.getItem("test_key")
      localStorage.removeItem("test_key")
      results.localStorage = value === "test_value"
    } catch (e) {
      console.error("LocalStorage test failed:", e)
    }

    setTestResults(results)
  }

  // 切换应急模式
  const toggleEmergencyMode = () => {
    const currentMode = localStorage.getItem("ses_error_detected") === "true"
    localStorage.setItem("ses_error_detected", (!currentMode).toString())
    window.location.reload()
  }

  // 清除所有应用数据
  const clearAllData = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      alert("所有本地数据已清除。页面将刷新。")
      window.location.reload()
    } catch (e) {
      alert(`清除数据失败: ${e instanceof Error ? e.message : "未知错误"}`)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">应用诊断工具</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              应急控制
            </CardTitle>
            <CardDescription>管理应用的应急模式和安全设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>应急模式状态:</span>
              <span className={`font-medium ${browserInfo.emergencyMode ? "text-red-500" : "text-green-500"}`}>
                {browserInfo.emergencyMode ? "已启用" : "已禁用"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>安全模式状态:</span>
              <span className={`font-medium ${browserInfo.safeMode ? "text-amber-500" : "text-green-500"}`}>
                {browserInfo.safeMode ? "已启用" : "已禁用"}
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={toggleEmergencyMode}>
              {browserInfo.emergencyMode ? "禁用应急模式" : "启用应急模式"}
            </Button>
            <Button variant="destructive" onClick={clearAllData}>
              清除所有数据
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              诊断测试
            </CardTitle>
            <CardDescription>运行测试以检查应用功能</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(testResults).map(([test, result]) => (
              <div key={test} className="flex items-center justify-between">
                <span>{test}:</span>
                <span className="flex items-center">
                  {result === null ? (
                    "未测试"
                  ) : result ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      通过
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500 mr-1" />
                      失败
                    </>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button onClick={runTests} className="w-full">
              运行所有测试
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="browser" className="mt-6">
        <TabsList>
          <TabsTrigger value="browser">浏览器信息</TabsTrigger>
          <TabsTrigger value="wallet">钱包信息</TabsTrigger>
          <TabsTrigger value="errors">错误日志</TabsTrigger>
        </TabsList>
        <TabsContent value="browser" className="p-4 border rounded-md mt-2">
          <h3 className="text-lg font-medium mb-4">浏览器信息</h3>
          <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
            {JSON.stringify(browserInfo, null, 2)}
          </pre>
        </TabsContent>
        <TabsContent value="wallet" className="p-4 border rounded-md mt-2">
          <h3 className="text-lg font-medium mb-4">钱包信息</h3>
          <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
            {JSON.stringify(walletInfo, null, 2)}
          </pre>
        </TabsContent>
        <TabsContent value="errors" className="p-4 border rounded-md mt-2">
          <h3 className="text-lg font-medium mb-4">错误日志</h3>
          {errorLogs.length > 0 ? (
            <div className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
              {errorLogs.map((log, index) => (
                <div key={index} className="py-1 border-b border-border last:border-0">
                  {log}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">没有记录到错误</p>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-6 p-4 border rounded-md bg-amber-50 dark:bg-amber-950/30">
        <h3 className="text-lg font-medium mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" />
          紧急导航链接
        </h3>
        <p className="mb-4 text-amber-700 dark:text-amber-400">如果应用导航不起作用，请使用以下直接链接:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <a
            href="/"
            className="bg-white dark:bg-amber-900 text-amber-800 dark:text-amber-100 px-3 py-2 rounded text-center font-medium border border-amber-200 dark:border-amber-800"
          >
            首页
          </a>
          <a
            href="/dashboard"
            className="bg-white dark:bg-amber-900 text-amber-800 dark:text-amber-100 px-3 py-2 rounded text-center font-medium border border-amber-200 dark:border-amber-800"
          >
            仪表盘
          </a>
          <a
            href="/news"
            className="bg-white dark:bg-amber-900 text-amber-800 dark:text-amber-100 px-3 py-2 rounded text-center font-medium border border-amber-200 dark:border-amber-800"
          >
            新闻
          </a>
          <a
            href="/tokens"
            className="bg-white dark:bg-amber-900 text-amber-800 dark:text-amber-100 px-3 py-2 rounded text-center font-medium border border-amber-200 dark:border-amber-800"
          >
            代币
          </a>
        </div>
      </div>
    </div>
  )
}
