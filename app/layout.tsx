import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/navbar"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { WalletProvider } from "@/hooks/use-wallet"
import { LanguageProvider } from "@/lib/i18n/context"
import EmergencyNav from "./emergency-nav"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Happy King - Web3 Meme Culture Platform",
  description: "A platform for meme culture, entertainment and web3 integration",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 添加更强大的全局错误处理脚本 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
// 设置全局错误处理
window.addEventListener('error', function(event) {
  console.error('Global error caught:', event.error);
  
  // 注释掉SES错误检测和安全模式启用
  /*
  // 检查是否是SES相关错误
  if (event.filename && event.filename.includes('lockdown') || 
      event.error && (event.error.toString().includes('SES') || 
                      event.error.toString().includes('addToast is not a function'))) {
    console.warn('SES or Toast error detected, enabling emergency mode');
    
    // 标记SES错误
    localStorage.setItem('ses_error_detected', 'true');
    
    // 阻止默认行为，防止应用崩溃
    event.preventDefault();
    
    // 如果不是已经在安全模式页面，则重定向
    if (!window.location.pathname.includes('/safe-mode')) {
      // 使用纯HTML导航而不是router.push，避免更多的JS执行
      try {
        // 尝试显示应急导航
        const navElement = document.getElementById('emergency-nav');
        if (navElement) {
          navElement.style.display = 'block';
        }
      } catch (e) {
        // 如果应急导航不可用，尝试重定向
        window.location.href = '/safe-mode';
      }
    }
  }
  */
});

// 拦截所有Promise错误
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled Promise rejection:', event.reason);
  
  // 注释掉SES错误检测和安全模式启用
  /*
  // 检查是否是SES相关错误
  if (event.reason && 
      (event.reason.toString().includes('SES') || 
       event.reason.toString().includes('lockdown') ||
       event.reason.toString().includes('addToast is not a function'))) {
    console.warn('SES error in Promise detected, enabling emergency mode');
    
    // 标记SES错误
    localStorage.setItem('ses_error_detected', 'true');
    
    // 阻止默认行为
    event.preventDefault();
  }
  */
});

// 注释掉检查SES错误标记
/*
// 检查是否已经标记了SES错误
if (localStorage.getItem('ses_error_detected') === 'true') {
  console.warn('SES error previously detected, emergency mode active');
  
  // 禁用所有可能导致问题的JavaScript
  try {
    // 防止window.ethereum访问导致的问题
    Object.defineProperty(window, 'ethereum', {
      get: function() {
        console.warn('Ethereum access blocked by emergency mode');
        return {
          isMetaMask: false,
          request: function() { return Promise.resolve(null); },
          on: function() { return { remove: function() {} }; },
          removeListener: function() {}
        };
      },
      configurable: true
    });
    
    // 创建安全的toast替代函数
    window.safeToast = function(message) {
      console.log('Safe toast:', message);
      // 这里可以添加一个简单的视觉提示，但不要使用复杂的UI组件
    };
  } catch (e) {
    console.error('Failed to apply emergency protections:', e);
  }
}
*/

// 为后续添加专用的toast容器
document.addEventListener('DOMContentLoaded', function() {
  var toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;';
  document.body.appendChild(toastContainer);
  
  // 添加简单的CSS
  var style = document.createElement('style');
  style.textContent = '.safe-toast{padding:10px 15px;margin-bottom:10px;border-radius:4px;color:white;box-shadow:0 4px 8px rgba(0,0,0,0.2);} .safe-toast-success{background:#4caf50;} .safe-toast-error{background:#f44336;} .safe-toast-info{background:#2196f3;}';
  document.head.appendChild(style);
});
`,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <LanguageProvider>
            <WalletProvider>
              <div className="flex min-h-screen flex-col">
                <Navbar />
                <EmergencyNav />
                <main className="flex-1">{children}</main>
                <Toaster />
              </div>
            </WalletProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
