"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, MessageSquare, Calendar, Loader2, Flame } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useContracts } from "@/hooks/use-contracts"
import { useWallet } from "@/hooks/use-wallet"
import { getAllSpaces } from "@/services/space-service"
import { useEffect, useState } from "react"
import { AGGREGATOR_URL, SPACE_TYPE_LABELS, SpaceType } from "@/lib/constants"
import { fetchDataById, getWalrusContent } from "@/services/upload-service"
import { useLanguage } from "@/lib/i18n/context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// 定义空间数据类型
interface UserSpace {
  id: number
  title: string
  image?: string
  videoUrl?: string // 视频文件的URL
  textPreview?: string // 文本内容预览
  type: string
  typeNumber: number
  spaceId: string
  date: string
  likes: number
  comments: number
  heat: number
  walrusBlobId: string
  originalIndex?: number
  creator: string
  creatorAvatar: string
}

// 全局缓存
const walrusContentCache = new Map<string, any>()
const videoUrlCache = new Map<string, string>()

export function UserContent() {
  const { t } = useLanguage()
  const [userSpaces, setUserSpaces] = useState<UserSpace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null)
  
  const { address } = useWallet()
  const { space: spaceContract } = useContracts()

  useEffect(() => {
    async function fetchUserSpaces() {
      if (!spaceContract || !address) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        
        // 从区块链获取所有空间
        const allSpaces = await getAllSpaces(spaceContract)
        console.log("获取到的所有空间:", allSpaces)
        
        // 筛选出当前用户创建的空间，并记录原始索引
        const userSpacesWithIndices: any[] = [];
        allSpaces.forEach((space, index) => {
          if (space.creator && space.creator.toLowerCase() === address.toLowerCase()) {
            // 添加原始索引并保存到新数组中
            userSpacesWithIndices.push({
              ...space,
              originalIndex: index + 1 // 索引+1作为ID
            });
          }
        });
        
        console.log("当前用户创建的空间:", userSpacesWithIndices)
        
        // 转换数据格式
        const formattedSpaces = userSpacesWithIndices.map((space, index) => {
          let spaceType = Number(space.spaceType)
          // 根据空间类型确定类型标签
          let type = "text"
          if (spaceType === 1) {
            type = "meme"
          } else if (spaceType === 2) {
            type = "video"
          }
          
          // 创建日期，使用当前时间作为占位符
          const date = new Date()
          const dateText = date.toISOString().split('T')[0]
          
          return {
            id: index + 1,
            title: space.title || "未命名空间",
            image: spaceType === 1 ? `${AGGREGATOR_URL}/${space.walrusBlobId}` : undefined,
            videoUrl: undefined,
            textPreview: undefined,
            type: SPACE_TYPE_LABELS[spaceType as SpaceType] || "未知",
            typeNumber: spaceType,
            spaceId: String(space.originalIndex), // 使用添加的原始索引作为spaceId
            date: dateText,
            likes: Number(space.likes) || 0,
            comments: 0, // 评论数暂无
            heat: Number(space.heat) || 0,
            walrusBlobId: space.walrusBlobId,
            creator: space.creator || "未知创建者",
            creatorAvatar: "/martial-arts-master-humor.png",
          }
        })
        
        setUserSpaces(formattedSpaces)
        
        // 异步加载内容
        formattedSpaces.forEach(fetchWalrusContent)
      } catch (err) {
        console.error("获取用户空间失败:", err)
        setError("无法加载您的空间数据")
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserSpaces()
  }, [spaceContract, address])
  
  // 获取 Walrus 内容
  const fetchWalrusContent = async (space: UserSpace) => {
    if (!space.walrusBlobId) return

    try {
      // 检查缓存
      if (walrusContentCache.has(space.walrusBlobId)) {
        const cachedContent = walrusContentCache.get(space.walrusBlobId)
        updateSpaceContent(space, cachedContent)
        return
      }

      console.log(`获取空间 ${space.id} 的 Walrus 内容...`)
      const content = await getWalrusContent(space.walrusBlobId)
      walrusContentCache.set(space.walrusBlobId, content)
      updateSpaceContent(space, content)
    } catch (err) {
      console.error(`获取空间 ${space.id} 的 Walrus 内容失败:`, err)
    }
  }

  // 更新空间内容
  const updateSpaceContent = async (space: UserSpace, content: any) => {
    if (space.typeNumber === 0) { // 文本类型
      const textPreview = content?.content || content?.text || "无文本内容"
      setUserSpaces((prev) =>
        prev.map((s) =>
          s.id === space.id ? { ...s, textPreview } : s
        )
      )
    } else if (space.typeNumber === 2) { // 视频类型
      // 检查视频 URL 缓存
      if (videoUrlCache.has(space.walrusBlobId)) {
        setUserSpaces((prev) =>
          prev.map((s) =>
            s.id === space.id ? { ...s, videoUrl: videoUrlCache.get(space.walrusBlobId) } : s
          )
        )
        return
      }

      // 拉取视频分片并生成 Blob URL
      try {
        const metadata = content // getWalrusContent 返回元数据
        if (!metadata.chunks || !Array.isArray(metadata.chunks)) {
          throw new Error("无效的视频元数据")
        }

        const blobs: Blob[] = []
        for (const chunk of metadata.chunks.sort((a: any, b: any) => a.index - b.index)) {
          const chunkBuffer = await fetchDataById(chunk.blobId)
          blobs.push(new Blob([chunkBuffer], { type: metadata.mimeType }))
        }

        const videoBlob = new Blob(blobs, { type: metadata.mimeType })
        const videoUrl = URL.createObjectURL(videoBlob)
        videoUrlCache.set(space.walrusBlobId, videoUrl)

        setUserSpaces((prev) =>
          prev.map((s) =>
            s.id === space.id ? { ...s, videoUrl } : s
          )
        )
      } catch (err) {
        console.error(`处理视频 ${space.id} 失败:`, err)
      }
    }
    // meme 类型已通过 image 初始化，无需额外处理
  }
  
  // 清理 Blob URL
  useEffect(() => {
    return () => {
      videoUrlCache.forEach((url) => URL.revokeObjectURL(url))
      videoUrlCache.clear()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">加载中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-muted/20 rounded-lg">
        <p className="text-destructive">{error}</p>
        <p className="text-muted-foreground mt-2">请检查您的网络连接或钱包状态</p>
      </div>
    )
  }

  if (!address) {
    return (
      <div className="text-center p-6 bg-muted/20 rounded-lg">
        <p>请先连接钱包以查看您的内容</p>
      </div>
    )
  }

  if (userSpaces.length === 0) {
    return (
      <div className="text-center p-6 bg-muted/20 rounded-lg">
        <p>您还没有创建任何空间</p>
        <Link href="/create-space" className="text-primary hover:underline mt-2 inline-block">
          立即创建空间
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {userSpaces.map((space) => (
        <Link href={`/space/${space.spaceId}`} key={space.id}>
          <Card 
            className="overflow-hidden hover:shadow-md transition-shadow"
            onMouseEnter={() => space.typeNumber === 2 && setHoveredVideo(space.id)}
            onMouseLeave={() => setHoveredVideo(null)}
          >
            <div className="relative aspect-video">
              {space.typeNumber === 1 && ( // Meme 类型
                <Image 
                  src={space.image || "/martial-arts-master-humor.png"} 
                  alt={space.title} 
                  fill 
                  className="object-cover"
                  unoptimized
                />
              )}
              {space.typeNumber === 2 && space.videoUrl && ( // 视频类型，已加载
                <video
                  src={space.videoUrl}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay={hoveredVideo === space.id}
                />
              )}
              {space.typeNumber === 2 && !space.videoUrl && ( // 视频类型，加载中
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              {space.typeNumber === 0 && ( // 文本类型
                <div className="w-full h-full bg-gradient-to-br from-muted/10 to-muted/40 flex flex-col items-center justify-center relative p-4">
                  <div className="absolute top-3 left-3 text-4xl text-muted-foreground/30 font-serif">"</div>
                  <div className="absolute bottom-3 right-3 text-4xl text-muted-foreground/30 font-serif rotate-180">"</div>
                  <div className="text-center text-sm italic text-foreground/80 line-clamp-3">
                    {space.textPreview || "加载文本中..."}
                  </div>
                </div>
              )}
              {space.typeNumber === 2 && space.videoUrl && ( // 视频播放按钮
                <div className="absolute inset-0 flex items-center justify-center">
                  {hoveredVideo === space.id ? (
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                      <div className="w-3 h-8 bg-white rounded-sm"></div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                      <div className="w-0 h-0 border-y-8 border-y-transparent border-l-12 border-l-white ml-1"></div>
                    </div>
                  )}
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span>{space.heat}</span>
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={space.creatorAvatar} alt="创建者" />
                  <AvatarFallback>用户</AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground">
                  {space.creator.substring(0, 6)}...{space.creator.substring(space.creator.length - 4)}
                </div>
              </div>
              <h3 className="font-bold mb-2 line-clamp-2">{space.title}</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">#{space.spaceId}</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {space.date}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {space.likes}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {space.comments}
                  </span>
                </div>
                <div>
                  <Badge variant="outline" className="text-xs">
                    {space.type}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

