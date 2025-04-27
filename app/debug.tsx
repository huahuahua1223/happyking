"use client"

import React from "react"

import { useEffect } from "react"

export default function DebugPage() {
  useEffect(() => {
    console.log("Debug page loaded")

    // 检查事件系统
    const testButton = document.createElement("button")
    testButton.textContent = "Test Click"
    testButton.addEventListener("click", () => {
      console.log("Button clicked")
    })

    // 检查React事件系统
    console.log("React version:", React.version)

    // 检查导航
    console.log("Window location:", window.location.href)

    // 检查是否有全局错误
    console.log("Any errors in window.onerror:", !!window.onerror)

    // 添加全局错误处理
    window.addEventListener("error", (event) => {
      console.error("Global error caught:", event.error)
    })
  }, [])

  const handleTestClick = () => {
    console.log("React handler clicked")
    alert("React handler works!")
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      <p className="mb-4">This page is for debugging application issues.</p>

      <div className="space-y-4">
        <button onClick={handleTestClick} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Test React Event Handler
        </button>

        <div>
          <h2 className="text-xl font-bold mb-2">Navigation Links</h2>
          <div className="space-y-2">
            <a href="/" className="block text-blue-500 hover:underline">
              Home (Regular Link)
            </a>
            <a href="/dashboard" className="block text-blue-500 hover:underline">
              Dashboard (Regular Link)
            </a>
            <a href="/news" className="block text-blue-500 hover:underline">
              News (Regular Link)
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
