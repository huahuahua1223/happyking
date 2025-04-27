"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getTranslation, SUPPORTED_LANGUAGES } from "./translations"
import type { LanguageContextType, SupportedLanguage } from "./types"

// 创建语言上下文
// Create language context
const LanguageContext = createContext<LanguageContextType>({
  language: "zh",
  setLanguage: () => {},
  t: (key) => key,
  availableLanguages: SUPPORTED_LANGUAGES,
})

// 本地存储键
// Local storage key
const LANGUAGE_STORAGE_KEY = "happy-king-language"

// 语言提供者组件
// Language provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  // 初始化语言，优先使用本地存储的语言，其次使用浏览器语言，最后使用默认语言
  // Initialize language, prioritize stored language, then browser language, finally default language
  const [language, setLanguageState] = useState<SupportedLanguage>("zh")

  // 在组件挂载时从本地存储加载语言设置
  // Load language setting from local storage when component mounts
  useEffect(() => {
    // 仅在客户端执行
    // Only execute on client side
    if (typeof window !== "undefined") {
      // 尝试从本地存储获取语言设置
      // Try to get language setting from local storage
      const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)

      if (storedLanguage && SUPPORTED_LANGUAGES.some((lang) => lang.code === storedLanguage)) {
        setLanguageState(storedLanguage)
      } else {
        // 尝试获取浏览器语言
        // Try to get browser language
        const browserLanguage = navigator.language.split("-")[0]

        // 检查是否支持浏览器语言
        // Check if browser language is supported
        if (SUPPORTED_LANGUAGES.some((lang) => lang.code === browserLanguage)) {
          setLanguageState(browserLanguage)
          localStorage.setItem(LANGUAGE_STORAGE_KEY, browserLanguage)
        }
      }
    }
  }, [])

  // 设置语言并保存到本地存储
  // Set language and save to local storage
  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    }
  }

  // 翻译函数
  // Translation function
  const t = (key: string, params?: Record<string, string | number>) => {
    return getTranslation(key, language, params)
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        availableLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

// 使用语言上下文的钩子
// Hook to use language context
export const useLanguage = () => useContext(LanguageContext)
