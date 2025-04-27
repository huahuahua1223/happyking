"use client"

import { ErrorBoundary } from "@/components/error-boundary"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useContracts } from "@/hooks/use-contracts"
import { getNewsItem } from "@/services/news-service"
import { fetchJsonDataById } from "@/services/upload-service-improved"
import { ArrowLeft, Heart, Loader2, ThumbsUp, Wallet } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { useEffect, useState } from "react"

// 定义新闻内容的类型
interface NewsContent {
  title: string
  content: string
  newsType: string
  timestamp: number
}

export default function NewsDetailPage({ params }: { params: { id: string } }) {
  // 使用 React.use() 解包 params
  const unwrappedParams = React.use(params)
  const newsId = unwrappedParams.id

  const router = useRouter()
  const { news } = useContracts()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [newsData, setNewsData] = useState<{
    title: string
    content: string
    creator: string
    creatorAddress: string
    avatar: string
    duration: string
    type: string
    date: string
    timestamp: number
  } | null>(null)

  // 处理点赞
  const handleLike = () => {
    if (liked) {
      setLikeCount((prev) => Math.max(0, prev - 1))
    } else {
      setLikeCount((prev) => prev + 1)
    }
    setLiked(!liked)
  }

  // 如果 ID 是 "create"，重定向到创建页面
  useEffect(() => {
    if (newsId === "create") {
      router.push("/news/create")
      return
    }

    async function fetchNewsDetail() {
      if (!news) {
        setLoading(false)
        setError("请连接钱包以查看新闻详情")
        return
      }

      try {
        setLoading(true)
        setError(null)

        const parsedNewsId = Number.parseInt(newsId)
        if (isNaN(parsedNewsId)) {
          throw new Error("无效的新闻ID")
        }

        // 从区块链获取新闻项
        const newsItem = await getNewsItem(news, parsedNewsId)
        if (!newsItem) {
          throw new Error("未找到新闻")
        }

        // 从Walrus获取新闻内容
        let content: NewsContent | null = null
        try {
          const jsonData = await fetchJsonDataById(newsItem.walrusBlobId)
          content = jsonData as NewsContent

          // 确保内容不为空
          if (!content || Object.keys(content).length === 0) {
            content = {
              title: newsItem.title || "无标题",
              content: "内容加载失败",
              newsType: newsItem.newsType || "未分类",
              timestamp: Date.now(),
            }
          }
        } catch (contentError) {
          console.error("获取新闻内容失败:", contentError)
          // 使用默认值而不是抛出错误
          content = {
            title: newsItem.title || "无标题",
            content: "内容加载失败",
            newsType: newsItem.newsType || "未分类",
            timestamp: Date.now(),
          }
        }

        // 计算持续时间的显示格式
        const durationText = `${newsItem.durationHours}小时`

        // 格式化日期
        const date = new Date(content.timestamp || Date.now())
        const dateText = date.toISOString().split("T")[0]

        setNewsData({
          title: content.title || newsItem.title || "无标题",
          content: content.content || "内容加载失败",
          creator: "匿名用户", // 默认创建者名称
          creatorAddress: newsItem.publisher,
          avatar: "/abstract-user-icon.png", // 默认头像
          duration: durationText,
          type: content.newsType || newsItem.newsType || "未分类",
          date: dateText,
          timestamp: content.timestamp || Date.now(),
        })
      } catch (fetchError) {
        console.error("获取新闻详情失败:", fetchError)
        setError("获取新闻详情失败，请确保钱包已连接")
        toast({
          title: "获取新闻失败",
          description: "无法加载新闻详情，请确保钱包已连接并刷新页面",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchNewsDetail()
  }, [newsId, router, toast, news])

  // 如果 ID 是 "create"，返回 null
  if (newsId === "create") {
    return null
  }

  const content = (
    <>
      {loading ? (
        <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p>加载新闻详情中...</p>
          </div>
        </div>
      ) : error || !newsData ? (
        <div className="container mx-auto px-4 py-8">
          <Link href="/news" className="inline-flex items-center mb-6 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回新闻列表
          </Link>

          <Card className="p-6 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">需要连接钱包</h2>
            <p className="text-muted-foreground mb-4">{error || "请连接钱包以查看新闻详情"}</p>
          </Card>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <Link href="/news" className="inline-flex items-center mb-6 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回新闻列表
          </Link>

          <Card className="overflow-hidden">
            <div className="p-6">
              {/* 减小标题字体大小 */}
              <h1 className="text-2xl font-bold mb-6">{newsData.title}</h1>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Link href="/user">
                    <Avatar>
                      <AvatarImage src={newsData.avatar || "/placeholder.svg"} alt={newsData.creator} />
                      <AvatarFallback>{newsData.creator[0]}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link href="/user">
                      <p className="font-medium hover:text-primary">{newsData.creator}</p>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      发布于 {new Date(newsData.timestamp).toLocaleDateString("zh-CN")}{" "}
                      {new Date(newsData.timestamp).toLocaleTimeString("zh-CN")} · 投放时长: {newsData.duration}
                    </p>
                  </div>
                </div>

                {/* 分享按钮已注释掉
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
                */}
              </div>

              <div className="prose prose-invert max-w-none">
                {newsData.content.split("\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="flex items-center">
                <Button variant="ghost" className="flex items-center gap-2" onClick={handleLike}>
                  {liked ? <Heart className="h-4 w-4 fill-red-500 text-red-500" /> : <ThumbsUp className="h-4 w-4" />}
                  <span>{likeCount}</span>
                </Button>

                {/* 评论按钮已注释掉
                <Button variant="ghost" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>0</span>
                </Button>
                */}
              </div>

              {/* 查看相关空间按钮已注释掉
              <Button>查看相关空间</Button>
              */}
            </div>
          </Card>
        </div>
      )}
    </>
  )

  return <ErrorBoundary>{content}</ErrorBoundary>
}
