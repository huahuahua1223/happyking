"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, MessageSquare, Calendar, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useContracts } from "@/hooks/use-contracts"
import { useWallet } from "@/hooks/use-wallet"
import { getAllSpaces } from "@/services/space-service"
import { useEffect, useState } from "react"
import { AGGREGATOR_URL, SPACE_TYPE_LABELS, SpaceType } from "@/lib/constants"

// 定义空间数据类型
interface UserSpace {
  id: number
  title: string
  image: string
  type: string
  typeNumber: number
  spaceId: string
  date: string
  likes: number
  comments: number
  walrusBlobId: string
  originalIndex?: number
}

export function UserContent() {
  const [userSpaces, setUserSpaces] = useState<UserSpace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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
            image: type !== "text" ? `${AGGREGATOR_URL}${space.walrusBlobId}` : "/cosmic-text.png",
            type: SPACE_TYPE_LABELS[spaceType as SpaceType] || "未知",
            typeNumber: spaceType,
            spaceId: String(space.originalIndex), // 使用添加的原始索引作为spaceId
            date: dateText,
            likes: Number(space.likes) || 0,
            comments: 0, // 评论数暂无
            walrusBlobId: space.walrusBlobId
          }
        })
        
        setUserSpaces(formattedSpaces)
      } catch (err) {
        console.error("获取用户空间失败:", err)
        setError("无法加载您的空间数据")
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserSpaces()
  }, [spaceContract, address])

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
          <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-video">
              {space.typeNumber !== 0 ? (
                <Image 
                  src={space.image || "/placeholder.svg"} 
                  alt={space.title} 
                  fill 
                  className="object-cover" 
                  unoptimized
                />
              ) : (
                // 文本类型显示特殊样式
                <div className="w-full h-full bg-gradient-to-br from-muted/10 to-muted/40 flex flex-col items-center justify-center relative p-4">
                  <div className="absolute top-3 left-3 text-4xl text-muted-foreground/30 font-serif">"</div>
                  <div className="absolute bottom-3 right-3 text-4xl text-muted-foreground/30 font-serif rotate-180">"</div>
                  <div className="text-center text-sm italic text-foreground/80 line-clamp-3">
                    内容预览...
                  </div>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant="secondary">{space.type}</Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold mb-2 line-clamp-2">{space.title}</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">#{space.spaceId}</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {space.date}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {space.likes}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {space.comments}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
