"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// 应急导航组件 - 当检测到严重错误时使用
export default function EmergencyNav() {
  const router = useRouter()

  useEffect(() => {
    // 检查是否有SES错误标记
    const hasSesError = localStorage.getItem("ses_error_detected") === "true"

    if (hasSesError) {
      // 如果检测到SES错误，显示应急导航
      const navElement = document.getElementById("emergency-nav")
      if (navElement) {
        navElement.style.display = "block"
      }

      // 禁用所有可能导致问题的JavaScript交互
      disableProblematicInteractions()
    }
  }, [])

  // 禁用可能导致问题的JavaScript交互
  const disableProblematicInteractions = () => {
    try {
      // 尝试移除所有与钱包相关的事件监听器
      if (window.ethereum) {
        const originalOn = window.ethereum.on
        window.ethereum.on = () => {
          console.warn("以太坊事件监听被应急模式阻止")
          return { remove: () => {} }
        }

        // 禁用请求方法
        const originalRequest = window.ethereum.request
        window.ethereum.request = () => {
          console.warn("以太坊请求被应急模式阻止")
          return Promise.resolve(null)
        }
      }

      // 显示警告消息
      console.warn("应急模式已启用 - 已禁用部分JavaScript功能以防止应用崩溃")
    } catch (error) {
      console.error("应用应急模式时出错:", error)
    }
  }

  return (
    <div id="emergency-nav" className="hidden fixed top-16 left-0 right-0 bg-red-500 text-white p-4 z-50">
      <div className="container mx-auto">
        <p className="font-bold mb-2">⚠️ 应急导航模式已启用</p>
        <p className="text-sm mb-4">检测到严重错误，已启用应急导航。部分功能可能不可用。</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <a href="/" className="bg-white text-red-500 px-3 py-2 rounded text-center font-medium">
            首页
          </a>
          <a href="/dashboard" className="bg-white text-red-500 px-3 py-2 rounded text-center font-medium">
            仪表盘
          </a>
          <a href="/news" className="bg-white text-red-500 px-3 py-2 rounded text-center font-medium">
            新闻
          </a>
          <a href="/tokens" className="bg-white text-red-500 px-3 py-2 rounded text-center font-medium">
            代币
          </a>
        </div>
      </div>
    </div>
  )
}
