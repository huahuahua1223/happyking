"use client"

// Directly from UI components import toast function
import { toast } from "@/components/ui/toast"

// Export toast function for components to use
export { toast }

// For backwards compatibility, also export original type
export type { ToastProps } from "@/components/ui/toast"

// Export a simple hook that returns the toast function
export const useToast = () => {
  return { toast }
}
