"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, AlertTriangle } from "lucide-react"
import { useLanguage } from "@/lib/i18n/context"
import { useWallet } from "@/hooks/use-wallet"

// 目标链ID
const TARGET_CHAIN_ID = 656476
// 正确的十六进制链ID
const TARGET_CHAIN_ID_HEX = `0x${TARGET_CHAIN_ID.toString(16)}`

// 目标链信息
const TARGET_CHAIN = {
  chainId: TARGET_CHAIN_ID_HEX, // 正确的十六进制格式
  chainName: "EduChain Testnet",
  nativeCurrency: {
    name: "EDU",
    symbol: "EDU",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.open-campus-codex.gelato.digital"],
  blockExplorerUrls: ["https://opencampus-codex.blockscout.com/"],
}

// 安全地访问window.ethereum
const getEthereum = () => {
  try {
    if (typeof window !== "undefined" && window.ethereum) {
      return window.ethereum
    }
    return null
  } catch (error) {
    console.error("访问window.ethereum时出错:", error)
    return null
  }
}

export function ConnectWalletButton() {
  const {
    isConnected,
    address,
    chainId,
    balance,
    isWrongNetwork,
    connect,
    disconnect,
    switchNetwork,
    isSafeMode,
    setSafeMode,
  } = useWallet()

  const [isConnecting, setIsConnecting] = useState(false)
  const { t } = useLanguage()

  // 连接钱包
  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      await connect()

      // 只记录到控制台，不显示任何弹窗
      console.log(`钱包已连接: ${t("wallet.connected")}`)
    } catch (error) {
      console.error("连接钱包失败:", error)

      // 只记录到控制台，不显示任何弹窗
      console.error(`钱包连接失败: ${error instanceof Error ? error.message : t("wallet.connect.unknown.error")}`)
    } finally {
      setIsConnecting(false)
    }
  }

  // 切换网络
  const handleSwitchNetwork = async () => {
    try {
      await switchNetwork()

      // 只记录到控制台，不显示任何弹窗
      console.log(`网络已切换: ${t("wallet.network.switched")}`)
    } catch (error) {
      console.error("切换网络失败:", error)

      // 只记录到控制台，不显示任何弹窗
      console.error(`切换网络失败: ${t("wallet.network.switch.failed")}`)
    }
  }

  // 断开连接
  const handleDisconnect = () => {
    disconnect()

    // 只记录到控制台，不显示任何弹窗
    console.log(`钱包已断开连接: ${t("wallet.disconnected")}`)
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)

      // 只记录到控制台，不显示任何弹窗
      console.log(`地址已复制: ${address}`)
    }
  }

  const openExplorer = () => {
    if (address) {
      window.open(`https://opencampus-codex.blockscout.com/address/${address}`, "_blank")
    }
  }

  // 切换安全模式
  const toggleSafeMode = () => {
    setSafeMode(!isSafeMode)

    // 只记录到控制台，不显示任何弹窗
    console.log(`安全模式已${!isSafeMode ? "启用" : "禁用"}`)
  }

  // 已连接状态
  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isWrongNetwork ? "destructive" : "outline"} className="flex items-center gap-2">
            {isWrongNetwork && <AlertTriangle className="h-4 w-4" />}
            <Wallet className="h-4 w-4" />
            <span className="hidden md:inline">
              {address.substring(0, 6)}...{address.substring(address.length - 4)}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t("wallet.my.wallet")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isWrongNetwork && (
            <>
              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleSwitchNetwork}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                <span>{t("wallet.switch.to.educhain")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem disabled className="flex justify-between">
            <span>{t("wallet.balance")}:</span>
            <span>{balance ? `${balance} EDU` : t("app.loading")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
            <Copy className="mr-2 h-4 w-4" />
            <span>{t("wallet.copy.address")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openExplorer} className="cursor-pointer">
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>{t("wallet.view.explorer")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t("wallet.disconnect")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // 未连接状态 - 直接连接MetaMask
  return (
    <Button disabled={isConnecting} onClick={handleConnect}>
      <Wallet className="mr-2 h-4 w-4" />
      {isConnecting ? t("wallet.connecting") : t("wallet.connect")}
    </Button>
  )
}
