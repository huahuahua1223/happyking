"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useContracts } from "@/hooks/use-contracts"
import { AGGREGATOR_URL } from "@/lib/constants"
import { useLanguage } from "@/lib/i18n/context"
import { getAllSpaces } from "@/services/space-service"
import { fetchDataById, getWalrusContent } from "@/services/upload-service"
import { Flame, Loader2, MessageSquare, ThumbsUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

// 定义空间类型
interface SpaceData {
  id: number
  title: string
  creator: string
  creatorAvatar: string
  type: "text" | "meme" | "video"
  image?: string // 仅 meme 类型使用
  videoUrl?: string // 仅 video 类型使用
  textPreview?: string // 仅 text 类型使用
  likes: number
  comments: number
  heat: number
  walrusBlobId: string
}

// 全局缓存
const walrusContentCache = new Map<string, any>()
const videoUrlCache = new Map<string, string>()

export default function SpaceGrid() {
  const { t } = useLanguage()
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null)
  const [spaces, setSpaces] = useState<SpaceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { space: spaceContract } = useContracts()

  // 从区块链获取空间数据并初始化
  useEffect(() => {
    async function fetchSpaces() {
      if (!spaceContract) return

      try {
        setLoading(true)
        setError(null)

        const spacesFromChain = await getAllSpaces(spaceContract)
        console.log("从区块链获取的空间:", spacesFromChain)

        const formattedSpaces = spacesFromChain.map((space, index) => {
          const spaceType = Number(space.spaceType)
          let type: SpaceData["type"] = "text"
          if (spaceType === 1) type = "meme"
          else if (spaceType === 2) type = "video"

          return {
            id: index + 1,
            title: space.title || "未命名空间",
            creator: space.creator || "未知创建者",
            creatorAvatar: "/martial-arts-master-humor.png",
            type,
            image: type === "meme" ? `${AGGREGATOR_URL}/${space.walrusBlobId}` : undefined,
            videoUrl: undefined,
            textPreview: undefined,
            likes: Number(space.likes) || 0,
            comments: 0,
            heat: Number(space.heat) || 0,
            walrusBlobId: space.walrusBlobId || "",
          }
        })

        setSpaces(formattedSpaces)

        // 异步加载内容
        formattedSpaces.forEach(fetchWalrusContent)
      } catch (err) {
        console.error("获取空间失败:", err)
        setError("获取空间数据失败，请稍后再试")
      } finally {
        setLoading(false)
      }
    }

    fetchSpaces()
  }, [spaceContract])

  // 获取 Walrus 内容
  const fetchWalrusContent = async (space: SpaceData) => {
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
  const updateSpaceContent = async (space: SpaceData, content: any) => {
    if (space.type === "text") {
      const textPreview = content.text || "无文本内容"
      setSpaces((prev) =>
        prev.map((s) =>
          s.id === space.id ? { ...s, textPreview } : s
        )
      )
    } else if (space.type === "video") {
      // 检查视频 URL 缓存
      if (videoUrlCache.has(space.walrusBlobId)) {
        setSpaces((prev) =>
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

        setSpaces((prev) =>
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
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">正在加载空间数据...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
          <p>{error}</p>
        </div>
        <p className="text-muted-foreground">请检查您的网络连接或钱包状态</p>
      </div>
    )
  }

  if (spaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-yellow-50 text-yellow-600 p-4 rounded-lg mb-4">
          <p>暂无空间数据</p>
        </div>
        <p className="text-muted-foreground">成为第一个创建空间的用户吧！</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">{t("space.all")}</TabsTrigger>
          <TabsTrigger value="video">{t("space.type.video")}</TabsTrigger>
          <TabsTrigger value="meme">{t("space.type.meme")}</TabsTrigger>
          <TabsTrigger value="text">{t("space.type.text")}</TabsTrigger>
        </TabsList>

        {["all", "video", "meme", "text"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {spaces
                .filter((space) => tab === "all" || space.type === tab)
                .map((space) => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    isVideoHovered={hoveredVideo === space.id}
                    onMouseEnter={() => space.type === "video" && setHoveredVideo(space.id)}
                    onMouseLeave={() => setHoveredVideo(null)}
                  />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function SpaceCard({
  space,
  isVideoHovered,
  onMouseEnter,
  onMouseLeave,
}: {
  space: SpaceData
  isVideoHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const [imageError, setImageError] = useState(false)

  return (
    <Link href={`/space/${space.id}`}>
      <Card
        className="overflow-hidden transition-all hover:shadow-lg"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="relative aspect-video">
          {space.type === "meme" && (
            <Image
              src={imageError ? "/martial-arts-master-humor.png" : space.image!}
              alt={space.title}
              fill
              className="object-cover"
              onError={() => {
                console.error(`图片加载失败: ${space.image}`)
                setImageError(true)
              }}
            />
          )}
          {space.type === "video" && space.videoUrl && (
            <video
              src={space.videoUrl}
              className="w-full h-full object-cover"
              muted
              loop
              autoPlay={isVideoHovered}
            />
          )}
          {space.type === "text" && (
            <div className="w-full h-full bg-muted flex items-center justify-center p-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {space.textPreview || "加载文本中..."}
              </p>
            </div>
          )}
          {space.type === "video" && !space.videoUrl && (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {space.type === "video" && space.videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              {isVideoHovered ? (
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
            <div
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                window.location.href = "/user"
              }}
              className="cursor-pointer"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={space.creatorAvatar} alt="创建者" />
                <AvatarFallback>用户</AvatarFallback>
              </Avatar>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                window.location.href = "/user"
              }}
              className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {space.creator.substring(0, 6)}...{space.creator.substring(space.creator.length - 4)}
            </div>
          </div>
          <h3 className="font-bold mb-2 line-clamp-2">{space.title}</h3>
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
  )
}