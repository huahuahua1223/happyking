"use client"

import type React from "react"

import { usePathname } from "next/navigation"

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // 检查是否在创建页面
  const isCreatePage = pathname === "/news/create"

  // 如果是创建页面，直接渲染子组件，不添加任何额外的布局或组件
  if (isCreatePage) {
    return children
  }

  // 对于其他页面，使用正常的布局
  return <div>{children}</div>
}
