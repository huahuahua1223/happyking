// 完全重写这个文件，确保它正确导出toast函数

// 直接从UI组件导入toast函数和useToast钩子
import { toast, useToast } from "@/components/ui/toast"

// 导出toast函数和useToast钩子供组件使用
export { toast, useToast }

// 为了向后兼容，也导出原始类型
export type { ToasterToast, ToastProps } from "@/components/ui/toast"

