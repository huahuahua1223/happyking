"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext, useCallback } from "react"
import { ethers } from "ethers"

// 定义钱包上下文类型
interface WalletContextType {
  address: string | null
  balance: string
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  chainId: string | null
  switchToMainnet: () => Promise<void>
}

// 创建钱包上下文
const WalletContext = createContext<WalletContextType>({
  address: null,
  balance: "0",
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  chainId: null,
  switchToMainnet: async () => {},
})

// 钱包提供者组件
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState("0")
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [chainId, setChainId] = useState<string | null>(null)

  // 更新余额
  const updateBalance = useCallback(async () => {
    if (!address || !window.ethereum) return

    try {
      // 使用 ethers v6 的方式创建 provider
      const provider = new ethers.BrowserProvider(window.ethereum)
      const balance = await provider.getBalance(address)
      // 将余额转换为 ETH 并保留 4 位小数
      const formattedBalance = ethers.formatEther(balance).slice(0, 6)
      setBalance(formattedBalance)
    } catch (error) {
      console.error("获取余额失败:", error)
      setBalance("0")
    }
  }, [address])

  // 检查钱包连接状态
  const checkConnection = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" })
      if (accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)

        // 获取链ID
        const chainId = await window.ethereum.request({ method: "eth_chainId" })
        setChainId(chainId)

        // 更新余额
        updateBalance()
      }
    } catch (error) {
      console.error("检查钱包连接状态失败:", error)
      setIsConnected(false)
      setAddress(null)
    }
  }, [updateBalance])

  // 连接钱包
  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      console.log("MetaMask 未安装")
      return
    }

    setIsConnecting(true)

    try {
      // 请求用户授权连接
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })

      if (accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)

        // 获取链ID
        const chainId = await window.ethereum.request({ method: "eth_chainId" })
        setChainId(chainId)

        // 更新余额
        await updateBalance()
      }
    } catch (error) {
      console.error("连接钱包失败:", error)
    } finally {
      setIsConnecting(false)
    }
  }, [updateBalance])

  // 断开钱包连接
  const disconnect = useCallback(() => {
    setAddress(null)
    setBalance("0")
    setIsConnected(false)
    setChainId(null)
  }, [])

  // 切换到主网
  const switchToMainnet = useCallback(async () => {
    if (!window.ethereum) return

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1" }], // 以太坊主网的链ID
      })
    } catch (error) {
      console.error("切换网络失败:", error)
    }
  }, [])

  // 监听账户变化
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // 用户断开了连接
        disconnect()
      } else if (accounts[0] !== address) {
        // 用户切换了账户
        setAddress(accounts[0])
        updateBalance()
      }
    }

    const handleChainChanged = (chainId: string) => {
      setChainId(chainId)
      // 当链改变时，刷新页面是推荐的做法
      window.location.reload()
    }

    // 添加事件监听器
    window.ethereum.on("accountsChanged", handleAccountsChanged)
    window.ethereum.on("chainChanged", handleChainChanged)

    // 初始检查连接状态
    checkConnection()

    // 清理事件监听器
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [address, disconnect, updateBalance, checkConnection])

  // 当地址变化时更新余额
  useEffect(() => {
    if (isConnected) {
      updateBalance()
    }
  }, [isConnected, updateBalance])

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        chainId,
        switchToMainnet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

// 使用钱包上下文的钩子
export function useWallet() {
  return useContext(WalletContext)
}
