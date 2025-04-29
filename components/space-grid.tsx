"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useContracts } from "@/hooks/use-contracts"
import { getAllSpaces } from "@/services/space-service"
import { getWalrusContent } from "@/services/upload-service"
import { Flame, Loader2, MessageSquare, ThumbsUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useLanguage } from "@/lib/i18n/context"

// 在文件顶部添加AGGREGATOR_URL导入
import { AGGREGATOR_URL } from "@/lib/constants"

// 定义空间类型
interface SpaceData {
  id: number
  title: string
  creator: string
  creatorAvatar: string
  type: string
  image: string
  likes: number
  comments: number
  heat: number
  walrusBlobId: string
}

// 全局缓存，用于存储已获取的Walrus内容
const walrusContentCache = new Map<string, any>()

export default function SpaceGrid() {
  const { t } = useLanguage()
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null)
  const [spaces, setSpaces] = useState<SpaceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { space: spaceContract } = useContracts()

  // 从区块链获取空间数据
  useEffect(() => {
    async function fetchSpaces() {
      if (!spaceContract) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        // 从区块链获取所有空间
        const spacesFromChain = await getAllSpaces(spaceContract)
        console.log("从区块链获取的空间:", spacesFromChain)

        // 转换数据格式
        const formattedSpaces = spacesFromChain.map((space, index) => {
          let spaceType = Number(space.spaceType)
          // 根据空间类型确定类型标签
          let type = "text"
          if (spaceType ===  1) {
            type = "meme"
          } else if (spaceType === 2) {
            type = "video"
          }

          // 创建格式化的空间对象
          return {
            id: index + 1, // 使用索引+1作为ID
            title: space.title || "未命名空间",
            creator: space.creator || "未知创建者",
            creatorAvatar: "/abstract-user-icon.png", // 默认头像
            type,
            image: `${AGGREGATOR_URL}${space.walrusBlobId}`,
            likes: Number(space.likes) || 0,
            comments: 0, // 评论数暂时没有
            heat: Number(space.heat) || 0,
            walrusBlobId: space.walrusBlobId || "",
          }
        })

        setSpaces(formattedSpaces)

        // 获取每个空间的Walrus内容
       /* for (const space of formattedSpaces) {
          if (space.walrusBlobId) {
            fetchWalrusContent(space)
          }
        }*/
      } catch (err) {
        console.error("获取空间失败:", err)
        setError("获取空间数据失败，请稍后再试")
      } finally {
        setLoading(false)
      }
    }

    fetchSpaces()
  }, [spaceContract])

  // 从Walrus获取内容并更新空间图片
  async function fetchWalrusContent(space: SpaceData) {
    try {
      // 检查缓存中是否已有此内容
      if (walrusContentCache.has(space.walrusBlobId)) {
        const cachedContent = walrusContentCache.get(space.walrusBlobId)
        updateSpaceWithWalrusContent(space, cachedContent)
        return
      }

      console.log(`获取空间 ${space.id} 的Walrus内容...`)
      const content = await getWalrusContent(space.walrusBlobId)

      if (content) {
        console.log(`空间 ${space.id} 的Walrus内容:`, content)

        // 将内容存入缓存
        walrusContentCache.set(space.walrusBlobId, content)

        // 更新空间图片
        updateSpaceWithWalrusContent(space, content)
      }
    } catch (err) {
      console.error(`获取空间 ${space.id} 的Walrus内容失败:`, err)
    }
  }

  // 修改updateSpaceWithWalrusContent函数，直接使用AGGREGATOR_URL和blobId
  function updateSpaceWithWalrusContent(space: SpaceData, content: any) {
    // 从AGGREGATOR_URL和blobId构建图片URL
    const imageUrl = `${AGGREGATOR_URL}${space.walrusBlobId}`

    // 直接更新空间的图片URL，不再尝试从内容中提取
    setSpaces((prevSpaces) => prevSpaces.map((s) => (s.id === space.id ? { ...s, image: imageUrl } : s)))

    console.log(`已更新空间 ${space.id} 的图片URL: ${imageUrl}`)
  }

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">正在加载空间数据...</p>
      </div>
    )
  }

  // 如果有错误，显示错误信息
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

  // 如果没有空间数据，显示提示信息
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

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {spaces.map((space) => (
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

        <TabsContent value="video" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {spaces
              .filter((space) => space.type === "video")
              .map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  isVideoHovered={hoveredVideo === space.id}
                  onMouseEnter={() => setHoveredVideo(space.id)}
                  onMouseLeave={() => setHoveredVideo(null)}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="meme" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {spaces
              .filter((space) => space.type === "meme")
              .map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  isVideoHovered={hoveredVideo === space.id}
                  onMouseEnter={() => setHoveredVideo(space.id)}
                  onMouseLeave={() => setHoveredVideo(null)}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="text" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {spaces
              .filter((space) => space.type === "text")
              .map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  isVideoHovered={hoveredVideo === space.id}
                  onMouseEnter={() => setHoveredVideo(space.id)}
                  onMouseLeave={() => setHoveredVideo(null)}
                />
              ))}
          </div>
        </TabsContent>
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
          <Image
            src={imageError ? "/abstract-thumbnail.png" : space.image}
            alt={space.title}
            fill
            className="object-cover"
            onError={(e) => {
              console.error(`图片加载失败: ${space.image}`)
              setImageError(true)
            }}
          />
          {space.type === "video" && (
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
                <AvatarImage src={space.creatorAvatar || "/abstract-user-icon.png"} alt="创建者" />
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
