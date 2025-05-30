"use client"

import { AGGREGATOR_URL, SpaceType } from "@/lib/constants"
import type { Space } from "@/lib/types"
import { ethers } from "ethers"
import { getWalrusContent } from "./upload-service"

export async function createSpace(
  contract: ethers.Contract,
  spaceType: number,
  title: string,
  walrusBlobId: string,
  name: string,
  symbol: string,
) {
  try {
    console.log("服务: 开始创建空间...", {
      spaceType,
      title,
      walrusBlobId,
      name,
      symbol,
    })

    // 获取费用金额
    let fee = BigInt(spaceType === SpaceType.VIDEO?
      await contract.CREATE_VIDEO_FEE_USDT():
      await contract.CREATE_FEE_USDT()) * BigInt( await contract.ethPerUsdt()) 

    console.log('fee--------------',fee)

    console.log("服务: 准备创建空间，费用:", ethers.formatEther(fee), "ETH")

    // 调用合约方法创建空间
    const tx = await contract.createSpace(spaceType, title, walrusBlobId, name, symbol, 
      { value: fee })
    console.log("服务: 交易已提交，等待确认:", tx.hash)

    // 等待交易确认
    const receipt = await tx.wait()
    console.log("服务: 交易已确认:", receipt)

    // 查找 SpaceCreated 事件以获取 spaceId
    let spaceId

    // 使用 ethers.js v6 风格的事件解析
    const logs = receipt.logs || []
    for (const log of logs) {
      try {
        const parsedLog = contract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        })
        if (parsedLog && parsedLog.name === "SpaceCreated") {
          spaceId = parsedLog.args.spaceId.toString()
          break
        }
      } catch (e) {
        // 忽略无法解析的日志
      }
    }

    if (spaceId) {
      console.log("服务: 空间创建成功，ID:", spaceId)
      return {
        spaceId: spaceId,
        success: true,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("服务: 创建空间失败:", error)
    throw error
  }
}

export async function getSpace(contract: ethers.Contract, spaceId: number): Promise<Space | null> {
  try {
    const space = await contract.spaces(spaceId)

    return {
      creator: space.creator,
      spaceType: space.spaceType,
      title: space.title,
      walrusBlobId: space.walrusBlobId,
      likes: space.likes.toString(),
      heat: space.heat.toString(),
      name: space.name,
      symbol: space.symbol,
    }
  } catch (error) {
    console.error(`获取空间 ${spaceId} 失败:`, error)
    return null
  }
}

export async function getSpaceCount(contract: ethers.Contract): Promise<number> {
  try {
    const count = await contract.spaceCount()
    return count.toString()
  } catch (error) {
    console.error("获取空间数量失败:", error)
    return 0
  }
}

export async function getAllSpaces(contract: ethers.Contract): Promise<Space[]> {
  try {
    const count = await getSpaceCount(contract)
    const spaces: Space[] = []

    for (let i = 1; i <= count; i++) {
      const space = await getSpace(contract, i)
      if (space) {
        spaces.push(space)
      }
    }

    return spaces
  } catch (error) {
    console.error("获取所有空间失败:", error)
    return []
  }
}

export async function likeSpace(contract: ethers.Contract, spaceId: number) {
  try {
    console.log("服务: 开始点赞空间...", spaceId)

    // 获取点赞费用
    const likeFeeUsdt = await contract.LIKE_FEE_USDT()
    const ethPerUsdt = await contract.ethPerUsdt()

    // 使用 ethers.js v6 风格
    const fee = BigInt(likeFeeUsdt) * BigInt(ethPerUsdt)

    console.log("服务: 准备点赞，费用:", ethers.formatEther(fee), "ETH")

    // 调用合约方法点赞
    const tx = await contract.like(spaceId, { value: fee })
    console.log("服务: 交易已提交，等待确认:", tx.hash)

    // 等待交易确认
    const receipt = await tx.wait()
    console.log("服务: 交易已确认:", receipt)

    return { success: true }
  } catch (error) {
    console.error("服务: 点赞空间失败:", error)
    throw error
  }
}

export async function commentOnSpace(
  contract: ethers.Contract,
  spaceId: number,
  walrusBlobId: string,
  replyToCommentId = 0,
) {
  try {
    console.log("服务: 开始评论空间...", {
      spaceId,
      walrusBlobId,
      replyToCommentId,
    })

    // 获取评论费用
    const commentFeeUsdt = await contract.COMMENT_FEE_USDT()
    const ethPerUsdt = await contract.ethPerUsdt()

    // 使用 ethers.js v6 风格
    const fee = (BigInt(commentFeeUsdt) * BigInt(ethPerUsdt)) / BigInt(ethers.parseEther("1"))

    console.log("服务: 准备评论，费用:", ethers.formatEther(fee), "ETH")

    // 调用合约方法评论
    const tx = await contract.comment(spaceId, walrusBlobId, replyToCommentId, { value: fee })
    console.log("服务: 交易已提交，等待确认:", tx.hash)

    // 等待交易确认
    const receipt = await tx.wait()
    console.log("服务: 交易已确认:", receipt)

    // 查找 Commented 事件以获取 commentId
    let commentId

    // 使用 ethers.js v6 风格的事件解析
    const logs = receipt.logs || []
    for (const log of logs) {
      try {
        const parsedLog = contract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        })
        if (parsedLog && parsedLog.name === "Commented") {
          commentId = parsedLog.args.commentId.toString()
          break
        }
      } catch (e) {
        // 忽略无法解析的日志
      }
    }

    if (commentId) {
      console.log("服务: 评论成功，ID:", commentId)
      return {
        commentId: commentId,
        success: true,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("服务: 评论空间失败:", error)
    throw error
  }
}


/**
 * 获取空间的评论数据
 *
 * 注意：由于合约中没有直接获取评论的方法，我们通过查询Commented事件来获取评论历史
 *
 * @param spaceContract Space合约实例
 * @param spaceId 空间ID
 * @returns 评论数据数组
 */
export async function getSpaceComments(spaceContract: any, spaceId: number) {
  try {
    console.log(`尝试获取空间 ${spaceId} 的评论数据...`)

    // 由于合约中没有直接获取评论的方法，我们尝试通过查询事件来获取评论历史
    // 首先检查合约是否有过滤事件的方法
    if (!spaceContract.queryFilter) {
      console.log("合约不支持查询事件，返回空评论列表")
      return []
    }

    // 尝试获取Commented事件
    // 创建事件过滤器，查找特定空间ID的评论事件
    const filter = spaceContract.filters.Commented(spaceId)

    // 查询过去的事件
    const events = await spaceContract.queryFilter(filter)
    console.log(`找到 ${events.length} 条评论事件`)

    if (events.length === 0) {
      return []
    }

    // 处理事件数据
    const commentsPromises = events.map(async (event: any, index: number) => {
      try {
        const { user, walrusBlobId, timestamp } = event.args || {}

        // 检查blobId是否有效
        if (!walrusBlobId || typeof walrusBlobId !== 'string' || walrusBlobId.trim() === '') {
          console.log(`评论 ${index} 的blobId无效: ${walrusBlobId}`)
          return null
        }

        // 从Walrus获取评论内容
        let commentContent;
        try {
          if (walrusBlobId) {
            commentContent = await fetchCommentContent(walrusBlobId)
            
            // 检查返回的内容是否有效
            if (!commentContent || !commentContent.content || commentContent.error) {
              console.log(`评论 ${index} 的内容无效或有错误: ${walrusBlobId}`)
              return null
            }
          } else {
            return null
          }
        } catch (contentError) {
          console.error(`获取评论内容失败:`, contentError)
          return null
        }

        return {
          id: index,
          user: user || "未知用户",
          avatar: "/abstract-user-icon.png", // 默认头像
          content: commentContent.content,
          likes: 0, // 目前合约不支持评论点赞
          dislikes: 0,
          time: formatTimestamp(Number(timestamp || Date.now())),
          replies: [], // 目前合约不支持评论回复
          timestamp: Number(timestamp || Date.now()), // 用于排序
          blobId: walrusBlobId, // 保存blobId用于调试
        }
      } catch (eventError) {
        console.error(`处理评论事件 ${index} 失败:`, eventError)
        return null
      }
    });

    // 使用Promise.allSettled来确保即使某些评论获取失败，也不会中断整个评论列表的加载
    const commentsResults = await Promise.allSettled(commentsPromises);
    
    // 过滤出成功获取的评论
    const validComments = commentsResults
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);

    // 按时间倒序排序
    validComments.sort((a, b) => b.timestamp - a.timestamp);

    console.log(`成功加载 ${validComments.length} 条有效评论（共 ${events.length} 条）`);
    return validComments;
  } catch (error) {
    console.error(`获取空间 ${spaceId} 的评论数据失败:`, error)
    return []
  }
}

// 从Walrus获取评论内容
async function fetchCommentContent(blobId:string) {
  try {
    // 记录正在尝试获取的blobId
    console.log(`尝试获取评论内容, 原始blobId: ${blobId}`)
    
    // 检查blobId格式
    if (!blobId || typeof blobId !== 'string' || blobId.trim() === '') {
      console.error('无效的blobId:', blobId)
      return { content: "无效的评论内容ID" }
    }
    
    // 尝试使用getWalrusContent函数
    const content = await getWalrusContent(blobId)
    
    // 如果返回的内容带有错误信息，但仍然有内容，添加固定文本
    if (content.error && !content.content) {
      content.content = "此评论内容可能已被删除或无法访问。"
    }
    
    return content
  } catch (error) {
    console.error(`使用getWalrusContent获取评论内容失败:`, error)

    // 如果getWalrusContent失败，尝试直接从聚合器获取
    try {
      return { 
        content: "此评论内容无法加载，可能已被删除或暂时无法访问。",
        error: error instanceof Error ? error.message : "未知错误"
      }
    } catch (fetchError) {
      console.error(`直接从聚合器获取评论内容失败:`, fetchError)
      
      // 提供有意义的备用内容
      return { 
        content: "此评论内容可能已被删除或无法访问。",
        error: fetchError instanceof Error ? fetchError.message : "未知错误"
      }
    }
  }
}

// 格式化时间戳为友好的时间显示
function formatTimestamp(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  // 小于1分钟
  if (diff < 60 * 1000) {
    return "刚刚"
  }

  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes}分钟前`
  }

  // 小于1天
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours}小时前`
  }

  // 小于30天
  if (diff < 30 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days}天前`
  }

  // 大于30天，显示具体日期
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}
