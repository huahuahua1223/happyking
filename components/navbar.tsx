"use client"

import type React from "react"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Home, LayoutDashboard, User, Newspaper, Coins, Search, Bell, Menu, X } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useLanguage } from "@/lib/i18n/context"

// 注释掉应急模式相关代码
export default function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { disconnect } = useWallet()
  const { t } = useLanguage()
  // 注释掉应急模式状态
  // const [isEmergencyMode, setIsEmergencyMode] = useState(false)

  // 注释掉应急模式检查
  /*
  // 检查是否处于应急模式
  useEffect(() => {
    const sesErrorDetected = localStorage.getItem("ses_error_detected") === "true"
    setIsEmergencyMode(sesErrorDetected)
  }, [])
  */

  // 注释掉应急模式警告组件
  /*
  // 应急模式警告
  const EmergencyModeWarning = () => (
    <div className="bg-red-500 text-white px-3 py-1 rounded-md flex items-center text-sm">
      <AlertTriangle className="h-4 w-4 mr-1" />
      应急模式
    </div>
  )
  */

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t("nav.menu")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            {/* 注释掉应急模式参数 */}
            <MobileNav /* isEmergencyMode={isEmergencyMode} */ />
          </SheetContent>
        </Sheet>

        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="text-xl font-bold">{t("app.name")}</span>
        </Link>

        <div className="hidden md:flex items-center space-x-1">
          {/* 注释掉应急模式条件渲染 */}
          {/* {isEmergencyMode ? (
            <>
              <a
                href="/"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <Home className="h-4 w-4 mr-2" />
                <span>{t("nav.home")}</span>
              </a>
              // ... 其他应急模式链接
            </>
          ) : ( */}
          <>
            <NavItem href="/" icon={<Home className="h-4 w-4 mr-2" />} label={t("nav.home")} />
            <NavItem href="/dashboard" icon={<LayoutDashboard className="h-4 w-4 mr-2" />} label={t("nav.dashboard")} />
            <NavItem href="/news" icon={<Newspaper className="h-4 w-4 mr-2" />} label={t("nav.news")} />
            <NavItem href="/tokens" icon={<Coins className="h-4 w-4 mr-2" />} label={t("nav.tokens")} />
          </>
          {/* )} */}
        </div>

        <div className="flex items-center ml-auto space-x-2">
          {/* 注释掉应急模式警告 */}
          {/* {isEmergencyMode && <EmergencyModeWarning />} */}

          {isSearchOpen ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder={t("app.search")} className="w-[200px] pl-8 md:w-[300px]" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                onClick={() => setIsSearchOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
              <Search className="h-5 w-5" />
              <span className="sr-only">{t("app.search")}</span>
            </Button>
          )}

          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">{t("nav.notifications")}</span>
          </Button>

          <LanguageSwitcher variant="icon" />

          {/* 注释掉应急模式条件 */}
          {/* {!isEmergencyMode && <ConnectWalletButton />} */}
          <ConnectWalletButton />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/vibrant-street-market.png" alt="User" />
                  <AvatarFallback>HK</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* <DropdownMenuLabel>{t("user.profile")}</DropdownMenuLabel> */}
              <DropdownMenuSeparator />
              <Link href="/user">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>{t("nav.user")}</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => disconnect()}>{t("app.logout")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

// 修改 NavItem 组件，移除嵌套的 Button，直接使用 Link
function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

// 修改 MobileNav 组件，注释掉应急模式参数
function MobileNav(/* { isEmergencyMode } */) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col gap-4 py-4">
      <Link href="/" className="flex items-center space-x-2 px-4">
        <span className="text-xl font-bold">{t("app.name")}</span>
      </Link>
      <div className="flex flex-col space-y-2 px-2">
        {/* 注释掉应急模式条件渲染 */}
        {/* {isEmergencyMode ? (
          <>
            <a
              href="/"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
            >
              <Home className="mr-2 h-4 w-4" />
              {t("nav.home")}
            </a>
            // ... 其他应急模式链接
          </>
        ) : ( */}
        <>
          <Link
            href="/"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
          >
            <Home className="mr-2 h-4 w-4" />
            {t("nav.home")}
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {t("nav.dashboard")}
          </Link>
          <Link
            href="/news"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
          >
            <Newspaper className="mr-2 h-4 w-4" />
            {t("nav.news")}
          </Link>
          <Link
            href="/tokens"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
          >
            <Coins className="mr-2 h-4 w-4" />
            {t("nav.tokens")}
          </Link>
        </>
        {/* )} */}

        <LanguageSwitcher />
      </div>
    </div>
  )
}
