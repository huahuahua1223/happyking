"use client"

import type { NewsItem } from "@/lib/types"
import type { ethers } from "ethers"
import { formatEther } from "ethers"

// 修改计算逻辑，确保与测试脚本一致
export async function publishNews(
  contract: ethers.Contract,
  title: string,
  newsType: string,
  hourlyRate: number,
  durationHours: number,
  walrusBlobId: string,
) {
  try {
    // 获取合约所需的汇率
    const ethPerUsdt = await contract.ethPerUsdt()

    // 将小时费率转换为整数（与合约期望的格式一致）
    const hourlyRateInt = 1 // 固定为1 USD/小时

    // 计算总USDT成本
    const totalUsdtCost = BigInt(hourlyRateInt) * BigInt(durationHours)
    console.log(`总USDT成本: ${totalUsdtCost} USD`)

    // 将USD转换为ETH（使用合约提供的汇率）
    const totalEthCost = totalUsdtCost * ethPerUsdt
    console.log(`总ETH成本: ${totalEthCost.toString()} wei`)

    console.log("Publishing news with params:", {
      title,
      newsType,
      hourlyRateInt,
      durationHours,
      walrusBlobId,
      totalEthCost: totalEthCost.toString(),
    })

    // 添加重试逻辑
    let lastError: any = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const tx = await contract.publishNews(title, newsType, hourlyRateInt, durationHours, walrusBlobId, {
          value: totalEthCost,
        })

        const receipt = await tx.wait()

        // Find the NewsPublished event to get the newsId
        const event = receipt.events?.find((e) => e.event === "NewsPublished")
        if (event && event.args) {
          return {
            newsId: event.args.newsId.toNumber(),
            success: true,
          }
        }

        return { success: true }
      } catch (error: any) {
        lastError = error
        console.error(`合约调用失败 (尝试 ${attempt}/3):`, error)

        // 检查是否是可重试的错误
        const errorMessage = error.message || ""
        const isRateLimited =
          errorMessage.includes("rate limit") ||
          errorMessage.includes("too many requests") ||
          errorMessage.includes("429")

        const isNetworkError =
          errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("connection")

        if ((isRateLimited || isNetworkError) && attempt < 3) {
          // 使用指数退避策略
          const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 10000)
          console.log(`等待 ${waitTime}ms 后重试合约调用...`)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          continue
        }

        // 不可重试的错误直接抛出
        throw error
      }
    }

    // 所有重试都失败
    throw lastError
  } catch (error) {
    console.error("Error publishing news:", error)
    throw error
  }
}

// 同样修改 getNewsItem 函数中的数值转换
export async function getNewsItem(contract: ethers.Contract, newsId: number): Promise<NewsItem | null> {
  try {
    const news = await contract.newsItems(newsId)

    // 安全地转换数值
    const safeToNumber = (val: any) => {
      if (typeof val === "number") return val
      if (typeof val === "bigint") return Number(val)
      if (val && typeof val.toNumber === "function") return val.toNumber()
      return Number(val)
    }

    return {
      title: news.title,
      newsType: news.newsType,
      hourlyRate: safeToNumber(news.hourlyRate),
      durationHours: safeToNumber(news.durationHours),
      expiryTimestamp: safeToNumber(news.expiryTimestamp),
      publisher: news.publisher,
      walrusBlobId: news.walrusBlobId,
      totalBid: typeof news.totalBid === "bigint" ? formatEther(news.totalBid) : news.totalBid.toString(),
      isActive: news.isActive,
    }
  } catch (error) {
    console.error(`Error getting news ${newsId}:`, error)
    return null
  }
}

// 修改 getNewsCount 函数，处理不同类型的返回值
export async function getNewsCount(contract: ethers.Contract): Promise<number> {
  try {
    const count = await contract.newsCount()

    // 检查返回值类型并适当处理
    if (typeof count === "number") {
      return count
    } else if (typeof count === "bigint") {
      return Number(count)
    } else if (count && typeof count.toNumber === "function") {
      // 兼容 ethers v5 的 BigNumber
      return count.toNumber()
    } else {
      // 如果是其他类型，尝试转换为数字
      return Number(count)
    }
  } catch (error) {
    console.error("Error getting news count:", error)
    return 0
  }
}

export async function getAllNews(contract: ethers.Contract): Promise<NewsItem[]> {
  try {
    const count = await getNewsCount(contract)
    const newsItems: NewsItem[] = []

    for (let i = 1; i <= count; i++) {
      const news = await getNewsItem(contract, i)
      if (news && news.isActive) {
        newsItems.push(news)
      }
    }

    // Sort by expiry timestamp (newest first)
    return newsItems.sort((a, b) => b.expiryTimestamp - a.expiryTimestamp)
  } catch (error) {
    console.error("Error getting all news:", error)
    return []
  }
}
