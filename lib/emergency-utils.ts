// Add this new utility file for emergency navigation and error handling

/**
 * 应急工具 - 提供应急模式相关功能
 * Emergency utilities for handling critical errors and navigation
 */

// 检查是否处于应急模式
// Check if emergency mode is active
export function isEmergencyModeActive(): boolean {
  try {
    return localStorage.getItem("ses_error_detected") === "true"
  } catch (error) {
    console.error("检查应急模式状态失败:", error)
    return false
  }
}

// 启用应急模式
// Enable emergency mode
export function enableEmergencyMode(): void {
  try {
    localStorage.setItem("ses_error_detected", "true")
    console.warn("应急模式已启用")

    // 当SES错误被检测到时阻止访问window.ethereum
    // Block window.ethereum access when SES error is detected
    try {
      if (typeof window !== "undefined") {
        Object.defineProperty(window, "ethereum", {
          get: () => {
            console.warn("应急模式已拦截对window.ethereum的访问")
            return {
              isMetaMask: false,
              request: () => Promise.resolve(null),
              on: () => ({ remove: () => {} }),
              removeListener: () => {},
            }
          },
          configurable: true,
        })
      }
    } catch (e) {
      console.error("无法保护window.ethereum:", e)
    }
  } catch (error) {
    console.error("启用应急模式失败:", error)
  }
}

// 禁用应急模式
// Disable emergency mode
export function disableEmergencyMode(): void {
  try {
    localStorage.removeItem("ses_error_detected")
    console.warn("应急模式已禁用")
  } catch (error) {
    console.error("禁用应急模式失败:", error)
  }
}

// 安全的本地存储访问
// Safe localStorage access
export function safeLocalStorage(key: string, value?: string): string | null {
  try {
    // 如果提供了value，则设置值
    // If value is provided, set it
    if (value !== undefined) {
      localStorage.setItem(key, value)
      return value
    }
    // 否则获取值
    // Otherwise get the value
    return localStorage.getItem(key)
  } catch (error) {
    console.error(`本地存储访问失败 [${key}]:`, error)
    return null
  }
}

// 安全的toast函数
// Safe toast function (used when toast system might fail)
export function safeToast(message: string, type: "success" | "error" | "info" = "info"): void {
  try {
    // 尝试使用现有的toast系统 (如果已集成到应用中)
    // Try to use existing toast system if integrated
    const toastContainer = document.getElementById("toast-container")
    if (toastContainer) {
      const toast = document.createElement("div")
      toast.className = `safe-toast safe-toast-${type}`
      toast.textContent = message
      toastContainer.appendChild(toast)

      // 3秒后自动移除
      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (toast.parentNode === toastContainer) {
          toastContainer.removeChild(toast)
        }
      }, 3000)
      return
    }

    // 后备方案：使用原生alert
    // Fallback: use native alert
    if (type === "error") {
      console.error(message)
    } else {
      console.log(message)
    }

    // 对于重要消息，使用alert确保用户看到
    // For important messages, use alert to ensure user sees it
    if (type === "error") {
      alert(message)
    }
  } catch (error) {
    // 绝对的后备方案：仅记录到控制台
    // Ultimate fallback: just log to console
    console.warn(`安全toast失败: ${message}`, error)
  }
}

// 注册全局错误处理器
// Register global error handler
export function registerGlobalErrorHandler(): void {
  try {
    window.addEventListener("error", (event) => {
      // 检查是否是SES相关错误
      // Check if it's SES-related error
      if (
        event.error &&
        (event.error.toString().includes("SES") || event.error.toString().includes("addToast is not a function"))
      ) {
        console.warn("检测到SES相关错误，启用应急模式", event.error)
        enableEmergencyMode()

        // 阻止默认处理以防止应用崩溃
        // Prevent default handling to avoid application crash
        event.preventDefault()
      }
    })

    window.addEventListener("unhandledrejection", (event) => {
      // 检查是否是SES相关的Promise错误
      // Check if it's SES-related Promise error
      if (
        event.reason &&
        (event.reason.toString().includes("SES") || event.reason.toString().includes("addToast is not a function"))
      ) {
        console.warn("检测到SES相关Promise错误，启用应急模式", event.reason)
        enableEmergencyMode()

        // 阻止默认处理以防止应用崩溃
        // Prevent default handling to avoid application crash
        event.preventDefault()
      }
    })

    console.log("全局错误处理器已注册")
  } catch (error) {
    console.error("注册全局错误处理器失败:", error)
  }
}
