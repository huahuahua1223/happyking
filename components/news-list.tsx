"use client"

import type React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { useContracts } from "@/hooks/use-contracts"
import { useUserProfile } from "@/hooks/use-user-profile"
import { getAllNews } from "@/services/news-service"
import { fetchJsonDataById } from "@/services/upload-service-improved"
import { Loader2, Wallet } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useLanguage } from "@/lib/i18n/context"

// 定义新闻内容的类型
interface NewsContent {
  title: string
  content: string
  newsType: string
  timestamp: number
}

// 定义扩展的新闻项类型，包含从Walrus获取的内容
interface ExtendedNewsItem {
  id: number
  title: string
  creator: string
  creatorAddress: string
  avatar?: string
  duration: string
  type: string
  date: string
  content?: string
  walrusBlobId: string
}

export function NewsList() {
  const router = useRouter()
  const { news } = useContracts()
  const { toast } = useToast()
  const [newsItems, setNewsItems] = useState<ExtendedNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useUserProfile()
  const { t } = useLanguage()

  useEffect(() => {
    // 更可靠地检测是否在创建页面
    const isCreatePage =
      typeof window !== "undefined" &&
      (window.location.pathname.includes("/news/create") || window.location.pathname === "/news/create")

    // 如果是创建页面，立即返回，不加载任何数据
    if (isCreatePage) {
      console.log("在创建页面，跳过数据加载")
      setLoading(false)
      return
    }

    async function fetchNews() {
      if (!news) {
        setLoading(false)
        setError("请连接钱包以查看新闻列表")
        return
      }

      try {
        setLoading(true)
        setError(null)

        // 从区块链获取所有新闻
        const allNews = await getAllNews(news)

        // 处理每条新闻，获取其内容
        const processedNews = await Promise.all(
          allNews.map(async (item, index) => {
            try {
              // 从Walrus获取新闻内容
              let content: NewsContent | null = null
              
              try {
                // 使用改进的fetchJsonDataById函数获取内容
                content = await fetchJsonDataById(item.walrusBlobId, 3);
                
                // 检查响应中是否包含错误信息
                if (content && content.error) {
                  console.warn(`新闻内容包含错误 (ID: ${index + 1}):`, content.error, content.message);
                  content = {
                    title: item.title || "无标题",
                    content: `内容加载失败: ${content.message || '未知错误'}`,
                    newsType: item.newsType || "未分类",
                    timestamp: Date.now(),
                  };
                }
                
                // 如果内容为空对象或关键字段缺失，设置默认值
                if (!content || Object.keys(content).length === 0 || !content.title) {
                  content = {
                    title: item.title || "无标题",
                    content: "内容加载失败或格式不正确",
                    newsType: item.newsType || "未分类",
                    timestamp: Date.now(),
                  };
                }
              } catch (contentError) {
                console.error(`获取新闻内容失败 (ID: ${index + 1}):`, contentError);
                
                // 提供更具体的错误消息
                let errorMessage = "内容加载失败";
                if (contentError instanceof Error) {
                  if (contentError.message.includes("超时")) {
                    errorMessage = "内容加载超时，服务器响应过慢";
                  } else if (contentError.message.includes("404")) {
                    errorMessage = "内容不存在或已被删除";
                  } else {
                    errorMessage = `加载失败: ${contentError.message}`;
                  }
                }
                
                content = {
                  title: item.title || "无标题",
                  content: errorMessage,
                  newsType: item.newsType || "未分类",
                  timestamp: Date.now(),
                };
              }

              // 计算持续时间的显示格式
              const durationText = `${item.durationHours}小时`;

              // 格式化日期
              const date = new Date(content?.timestamp || Date.now());
              const dateText = date.toISOString().split("T")[0];

              return {
                id: index + 1, // 使用索引作为ID
                title: content?.title || item.title || "无标题",
                creator: "匿名用户", // 默认创建者名称
                creatorAddress: item.publisher,
                avatar: undefined, // 默认头像
                duration: durationText,
                type: content?.newsType || item.newsType || "未分类",
                date: dateText,
                content: content?.content || "内容加载失败",
                walrusBlobId: item.walrusBlobId,
                loadError: content?.error ? true : false,
              };
            } catch (itemError) {
              console.error(`处理新闻项失败 (ID: ${index + 1}):`, itemError);
              return {
                id: index + 1,
                title: item.title || "无标题",
                creator: "匿名用户",
                creatorAddress: item.publisher,
                avatar: undefined,
                duration: `${item.durationHours}小时`,
                type: item.newsType || "未分类",
                date: new Date().toISOString().split("T")[0],
                content: itemError instanceof Error ? `内容处理错误: ${itemError.message}` : "内容加载失败",
                walrusBlobId: item.walrusBlobId,
                loadError: true,
              };
            }
          })
        );

        setNewsItems(processedNews)
      } catch (fetchError) {
        console.error("获取新闻列表失败:", fetchError)
        setError("获取新闻列表失败，请确保钱包已连接")
        toast({
          title: "获取新闻失败",
          description: "无法加载新闻列表，请确保钱包已连接并刷新页面",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    // 只有在非创建页面时才获取新闻
    fetchNews()
  }, [news, toast])

  // 处理新闻项点击
  const handleNewsClick = (id: number) => {
    try {
      console.log(`跳转到新闻详情: /news/${id}`)
      router.push(`/news/${id}`)
    } catch (error) {
      console.error("导航错误:", error)
      // 使用备用方法
      window.location.href = `/news/${id}`
    }
  }

  // 处理用户点击
  const handleUserClick = (e: React.MouseEvent) => {
    try {
      e.stopPropagation() // 阻止事件冒泡
      console.log("跳转到用户页面: /user")
      router.push("/user")
    } catch (error) {
      console.error("导航错误:", error)
      // 使用备用方法
      e.stopPropagation()
      window.location.href = "/user"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">加载新闻列表中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-xl font-medium mb-2">需要连接钱包</p>
        <p className="text-muted-foreground mb-4">{error}</p>
      </div>
    )
  }

  if (newsItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl mb-4">暂无新闻</p>
        <p className="text-muted-foreground">成为第一个发布新闻的用户吧！</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">{t("news.number")}</TableHead>
          <TableHead>{t("news.title")}</TableHead>
          <TableHead>{t("news.creator")}</TableHead>
          <TableHead>{t("news.duration")}</TableHead>
          <TableHead>{t("news.type")}</TableHead>
          <TableHead className="text-right">{t("news.date")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {newsItems.map((item) => (
          <TableRow
            key={item.id}
            className={`cursor-pointer hover:bg-muted/50 transition-colors ${item.loadError ? 'opacity-70' : ''}`}
            onClick={() => handleNewsClick(item.id)}
          >
            <TableCell className="font-medium">{item.id}</TableCell>
            <TableCell>
              <span className={`line-clamp-1 ${item.loadError ? 'text-muted-foreground italic' : ''}`}>
                {item.title}
                {item.loadError && <span className="ml-2 text-xs text-red-500">(加载异常)</span>}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div onClick={handleUserClick} className="cursor-pointer">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={item.avatar || "/abstract-user-icon.png"} alt={item.creator} />
                    <AvatarFallback>{item.creator[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div onClick={handleUserClick} className="hover:text-primary cursor-pointer">
                  {item.creator}
                </div>
              </div>
            </TableCell>
            <TableCell>{item.duration}</TableCell>
            <TableCell>
              <Badge variant={item.type === "娱乐" ? "default" : item.type === "加密货币" ? "secondary" : "outline"}>
                {item.type}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{item.date}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
