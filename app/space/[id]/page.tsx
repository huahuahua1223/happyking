"use client"

import { SpaceComments } from "@/components/space-comments"
import { SpaceContent } from "@/components/space-content"
import { SpaceRelated } from "@/components/space-related"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useContracts } from "@/hooks/use-contracts"
import { useWallet } from "@/hooks/use-wallet"
import { AGGREGATOR_URL, SPACE_TYPE_LABELS, SpaceType } from "@/lib/constants"
import { getSpace, likeSpace } from "@/services/space-service"
import { fetchDataById, fetchJsonDataById, getWalrusContent } from "@/services/upload-service"
import {
  ArrowLeft,
  Bookmark,
  Flame,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Share2,
  ThumbsUp,
  Wallet,
  Copy,
  Play,
  Pause,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { useEffect, useRef, useState } from "react"
import { useLanguage } from "@/lib/i18n/context"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

// Define content interface
interface ISpaceContent {
  title?: string
  content?: string
  description?: string
  timestamp?: number
}

// 定义 params 接口
interface SpaceParams {
  id: string;
}

export default function SpaceDetailPage({ params }: { params: SpaceParams }) {
  // 使用 React.use() 解包 params
  const unwrappedParams = React.use(params as any) as SpaceParams
  const spaceId = unwrappedParams.id
  
  const router = useRouter()
  const { space } = useContracts()
  const { isConnected, address } = useWallet()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [likeLoading, setLikeLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null) 
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [spaceData, setSpaceData] = useState<{
    id: string
    title: string
    creator: string
    creatorAddress: string
    avatar: string
    type: string
    typeNumber: number
    walrusBlobId: string
    content?: string
    description?: string
    likes: number
    heat: number
    date: string
    timestamp: number
  } | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    async function fetchSpaceDetail() {
      if (!space) {
        setLoading(false)
        setError("请连接钱包以查看空间详情")
        return
      }

      try {
        setLoading(true)
        setError(null)

        const parsedSpaceId = Number.parseInt(spaceId)
        if (isNaN(parsedSpaceId)) {
          throw new Error("无效的空间ID")
        }

        // Fetch space data from blockchain
        const spaceItem = await getSpace(space, parsedSpaceId)
        if (!spaceItem) {
          throw new Error("未找到空间")
        }

        // Fetch content from Walrus
        let content: ISpaceContent = {}
        try {
          if (spaceItem.spaceType === SpaceType.TEXT) {
            // For text type, content is stored as JSON
            const jsonData = await fetchJsonDataById(spaceItem.walrusBlobId)
            content = jsonData as ISpaceContent
          } else {
            // For meme and video types, we just need the blobId for display
            content = {
              title: spaceItem.title,
              timestamp: Date.now(), // Fallback timestamp
            }
          }

          // Ensure content is not empty
          if (!content || Object.keys(content).length === 0) {
            content = {
              title: spaceItem.title || "无标题",
              content: "内容加载失败",
              timestamp: Date.now(),
            }
          }
        } catch (contentError) {
          console.error("获取空间内容失败:", contentError)
          // Use default values instead of throwing error
          content = {
            title: spaceItem.title || "无标题",
            content: "内容加载失败",
            timestamp: Date.now(),
          }
        }

        // Format date
        const date = new Date(content.timestamp || Date.now())
        const dateText = date.toISOString().split("T")[0]

        setSpaceData({
          id: spaceId,
          title: spaceItem.title,
          creator: t("dashboard.creator"), // Default creator name
          creatorAddress: spaceItem.creator,
          avatar: "/abstract-user-icon.png", // Default avatar
          type: SPACE_TYPE_LABELS[spaceItem.spaceType as SpaceType] || t("space.unknown.type"),
          typeNumber: Number(spaceItem.spaceType),
          walrusBlobId: spaceItem.walrusBlobId,
          content: content.content,
          description: content.description,
          likes: Number(spaceItem.likes) || 0,
          heat: Number(spaceItem.heat) || 0,
          date: dateText,
          timestamp: content.timestamp || Date.now(),
        })
      } catch (fetchError) {
        console.error("获取空间详情失败:", fetchError)
        setError("获取空间详情失败，请确保钱包已连接")
        toast({
          title: "获取空间失败",
          description: "无法加载空间详情，请确保钱包已连接并刷新页面",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSpaceDetail()
  }, [spaceId, space, toast])

  // 处理视频播放逻辑
  const handleVideoPlayback = () => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }
  
  // 加载视频内容
  useEffect(() => {
    async function loadVideoContent() {
      if (!spaceData || spaceData.typeNumber !== SpaceType.VIDEO || !spaceData.walrusBlobId) {
        return;
      }
      
      try {
        setVideoLoading(true);
        
        // 获取视频元数据
        const metadata = await getWalrusContent(spaceData.walrusBlobId);
        
        if (!metadata.chunks || !Array.isArray(metadata.chunks)) {
          throw new Error("无效的视频元数据");
        }
        
        // 加载视频分片
        const blobs: Blob[] = [];
        for (const chunk of metadata.chunks.sort((a: any, b: any) => a.index - b.index)) {
          const chunkBuffer = await fetchDataById(chunk.blobId);
          blobs.push(new Blob([chunkBuffer], { type: metadata.mimeType }));
        }
        
        // 创建视频Blob URL
        const videoBlob = new Blob(blobs, { type: metadata.mimeType });
        const url = URL.createObjectURL(videoBlob);
        setVideoUrl(url);
      } catch (err) {
        console.error("加载视频失败:", err);
        toast({
          title: "视频加载失败",
          description: "无法加载视频内容，请稍后再试",
          variant: "destructive",
        });
      } finally {
        setVideoLoading(false);
      }
    }
    
    loadVideoContent();
    
    // 清理函数
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [spaceData, toast]);

  // 处理点赞
  const handleLike = async () => {
    if (!space || !spaceData) {
      toast({
        title: "无法点赞",
        description: "请确保钱包已连接",
        variant: "destructive",
      })
      return
    }

    try {
      setLikeLoading(true)

      // 调用点赞服务
      const parsedSpaceId = Number(spaceData.id)
      await likeSpace(space, parsedSpaceId)

      // 更新点赞数和热度
      setSpaceData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          likes: prev.likes + 1,
          heat: prev.heat + 1, // 点赞增加1点热度
        }
      })

      toast({
        title: "点赞成功",
        description: "您已成功点赞此空间",
        variant: "default",
      })
    } catch (error) {
      console.error("点赞失败:", error)
      toast({
        title: "点赞失败",
        description: error instanceof Error ? error.message : "请确保钱包已连接并有足够的ETH",
        variant: "destructive",
      })
    } finally {
      setLikeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>加载空间详情中...</p>
        </div>
      </div>
    )
  }

  if (error || !spaceData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="inline-flex items-center mb-6 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回上一级
        </Button>

        <Card className="p-6 text-center">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">需要连接钱包</h2>
          <p className="text-muted-foreground mb-4">{error || "请连接钱包以查看空间详情"}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="inline-flex items-center mb-6 text-muted-foreground hover:text-foreground"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回上一级
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="relative h-[400px] w-full">
              {spaceData.typeNumber === SpaceType.MEME ? (
                <Image
                  src={`${AGGREGATOR_URL}/${spaceData.walrusBlobId}`}
                  alt={spaceData.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    // Fallback image if the blob fails to load
                    e.currentTarget.src = "/martial-arts-master-humor.png"
                  }}
                  unoptimized
                />
              ) : spaceData.typeNumber === SpaceType.VIDEO ? (
                <div className="relative w-full h-full bg-black">
                  {videoLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
                      <p className="text-sm text-white/70">加载视频中...</p>
                    </div>
                  ) : videoUrl ? (
                    <>
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        className="w-full h-full object-contain" 
                        playsInline
                        controls={false}
                        onClick={handleVideoPlayback}
                      />
                      <button 
                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          handleVideoPlayback();
                        }}
                      >
                        <div className="h-16 w-16 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                          {isPlaying ? (
                            <Pause className="h-8 w-8 text-white" />
                          ) : (
                            <Play className="h-8 w-8 text-white ml-1" />
                          )}
                        </div>
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-white/70">无法加载视频</p>
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 right-4">
                    <Badge variant="secondary" className="flex items-center gap-1 text-base">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span>{spaceData.heat}</span>
                    </Badge>
                  </div>
                </div>
              ) : (
                // 文本类型的空间展示优化
                <div className="w-full h-full bg-gradient-to-br from-muted/10 to-muted/40 flex flex-col items-center justify-center relative p-8">
                  {/* 装饰性引号 */}
                  <div className="absolute top-12 left-12 text-8xl text-muted-foreground/20 font-serif">"</div>
                  <div className="absolute bottom-12 right-12 text-8xl text-muted-foreground/20 font-serif rotate-180">"</div>
                  
                  {/* 内容预览 */}
                  <div className="max-w-2xl text-center z-10">
                    <p className="text-xl font-medium text-foreground/80 italic leading-relaxed line-clamp-6 mb-6">
                      {spaceData.content || t("space.content.placeholder")}
                    </p>
                    
                    <div className="flex justify-center">
                      <Badge variant="secondary" className="flex items-center gap-1 text-base">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span>{spaceData.heat}</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Link href="/user">
                    <Avatar>
                      <AvatarImage src={spaceData.avatar || "/placeholder.svg"} alt={spaceData.creator} />
                      <AvatarFallback>{spaceData.creator[0]}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link href="/user">
                      <p className="font-medium hover:text-primary">{spaceData.creator}</p>
                    </Link>
                    <p className="text-sm text-muted-foreground">创建于 {spaceData.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span>{t("space.heat")}: {spaceData.heat}</span>
                  </Button>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <h1 className="text-3xl font-bold mb-4">{spaceData.title}</h1>

              <p className="text-muted-foreground mb-6">
                {spaceData.description || "这个空间收集了相关的meme、视频和创意内容。欢迎分享你的作品！"}
              </p>

              <div className="flex justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2"
                    onClick={handleLike}
                    disabled={likeLoading}
                  >
                    {likeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                    <span>{spaceData.likes}</span>
                  </Button>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>0</span>
                  </Button>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    <span>{t("space.share")}</span>
                  </Button>
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4" />
                  <span>{t("space.bookmark")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-4">{t("space.content")}</h2>
            <SpaceContent spaceData={spaceData} />
          </div>

          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="comments">{t("space.comments")} (0)</TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="mt-4">
              <SpaceComments spaceId={Number(spaceData.id)} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">{t("space.info")}</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("space.id")}</p>
                  <p className="font-medium">#{spaceData.id}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">{t("space.created.at")}</p>
                  <p className="font-medium">{spaceData.date}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">{t("space.type")}</p>
                  <p className="font-medium">{spaceData.type}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">{t("space.likes")}</p>
                  <p className="font-medium">{spaceData.likes}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">{t("space.tags")}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="px-2 py-1 bg-muted rounded-md text-xs">{spaceData.type}</span>
                    <span className="px-2 py-1 bg-muted rounded-md text-xs">{t("space.creative")}</span>
                    <span className="px-2 py-1 bg-muted rounded-md text-xs">{t("space.content")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <SpaceRelated currentId={Number(spaceData.id)} type={spaceData.typeNumber} />
        </div>
      </div>
    </div>
  )
}
