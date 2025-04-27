"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { useWallet } from "@/hooks/use-wallet"
import { CONTRACT_ADDRESSES } from "@/lib/constants"
import { UserProfileABI } from "@/lib/abis/UserProfileABI"
import { SpaceABI } from "@/lib/abis/SpaceABI"
import { TokenLaunchABI } from "@/lib/abis/TokenLaunchABI"
import { NewsABI } from "@/lib/abis/NewsABI"
import { HKNFTABI } from "@/lib/abis/HKNFTABI"

export function useContracts() {
  const { isConnected, address } = useWallet()
  const [contracts, setContracts] = useState<{
    userProfile: ethers.Contract | null
    space: ethers.Contract | null
    tokenLaunch: ethers.Contract | null
    news: ethers.Contract | null
    hkNFT: ethers.Contract | null
  }>({
    userProfile: null,
    space: null,
    tokenLaunch: null,
    news: null,
    hkNFT: null,
  })

  useEffect(() => {
    const setupContracts = async () => {
      if (!isConnected || !address || !window.ethereum) return

      try {
        // 创建provider和signer
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()

        console.log("设置合约中...", "地址:", address)

        // 创建合约实例
        const userProfileContract = new ethers.Contract(CONTRACT_ADDRESSES.UserProfile, UserProfileABI, signer)
        const spaceContract = new ethers.Contract(CONTRACT_ADDRESSES.Space, SpaceABI, signer)
        const tokenLaunchContract = new ethers.Contract(CONTRACT_ADDRESSES.TokenLaunch, TokenLaunchABI, signer)
        const newsContract = new ethers.Contract(CONTRACT_ADDRESSES.News, NewsABI, signer)
        const hkNFTContract = new ethers.Contract(CONTRACT_ADDRESSES.HKNFT, HKNFTABI, signer)

        console.log("合约设置成功")

        setContracts({
          userProfile: userProfileContract,
          space: spaceContract,
          tokenLaunch: tokenLaunchContract,
          news: newsContract,
          hkNFT: hkNFTContract,
        })
      } catch (error) {
        console.error("设置合约失败:", error)
        setContracts({
          userProfile: null,
          space: null,
          tokenLaunch: null,
          news: null,
          hkNFT: null,
        })
      }
    }

    setupContracts()
  }, [isConnected, address])

  return contracts
}
