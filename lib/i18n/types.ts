/**
 * 国际化类型定义
 * Internationalization type definitions
 */

// 支持的语言列表
// Supported languages list
export type SupportedLanguage = "zh" | "en" | string

// 语言选项接口
// Language option interface
export interface LanguageOption {
  code: SupportedLanguage
  name: string
  nativeName: string // 语言的本地名称 (Native name of the language)
  flag?: string // 可选的国旗图标 (Optional flag icon)
}

// 翻译函数类型
// Translation function type 
export type TFunction = (key: string, params?: Record<string, string | number>) => string

// 语言上下文接口
// Language context interface
export interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
  t: TFunction
  availableLanguages: LanguageOption[]
}

// 翻译字典类型
// Translation dictionary type
export type TranslationDictionary = Record<string, string>

// 语言包类型
// Language pack type
export type LanguagePack = Record<SupportedLanguage, TranslationDictionary>
