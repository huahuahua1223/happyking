"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SafeModePage() {
  const { isSafeMode, setSafeMode } = useWallet()
  const router = useRouter()

  // 如果不在安全模式，重定向到首页
  useEffect(() => {
    if (!isSafeMode) {
      router.push("/")
    }
  }, [isSafeMode, router])

  const disableSafeMode = () => {
    setSafeMode(false)
    router.push("/")
  }

  const refreshPage = () => {
    window.location.reload()
  }

  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            安全模式已启用
          </CardTitle>
          <CardDescription>由于检测到潜在的钱包兼容性问题，应用程序已进入安全模式。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>在安全模式下，所有与钱包相关的功能都被禁用，以防止应用程序冻结或崩溃。这通常是由于以下原因之一：</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>MetaMask或其他钱包扩展程序与应用程序之间存在兼容性问题</li>
              <li>钱包扩展程序的安全机制（SES）触发了错误</li>
              <li>浏览器扩展程序之间存在冲突</li>
            </ul>
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-md border border-amber-200 dark:border-amber-800">
              <h3 className="font-medium flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <ShieldCheck className="h-5 w-5" />
                建议操作
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                <li>• 尝试刷新页面</li>
                <li>• 暂时禁用MetaMask或其他钱包扩展程序</li>
                <li>• 清除浏览器缓存后重试</li>
                <li>• 尝试使用不同的浏览器</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={refreshPage} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            刷新页面
          </Button>
          <Button onClick={disableSafeMode}>禁用安全模式</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
