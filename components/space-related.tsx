"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Flame } from "lucide-react"
import Link from "next/link"

interface SpaceRelatedProps {
  currentId?: number
  type?: number
}

export function SpaceRelated({ currentId, type }: SpaceRelatedProps) {
  // 这里只是模拟数据，实际应用中应该根据 currentId 和 type 从 API 获取相关空间
  const relatedSpaces = [
    {
      id: 1,
      title: "蔡徐坤打篮球",
      creator: "鬼畜制作人",
      avatar: "/avatar-1.png",
      heat: 92.3,
    },
    {
      id: 2,
      title: "葛优躺",
      creator: "经典收藏家",
      avatar: "/abstract-user-icon.png",
      heat: 82.1,
    },
    {
      id: 3,
      title: "王境泽：我就是饿死",
      creator: "鬼畜制作人",
      avatar: "/abstract-user-profile.png",
      heat: 79.6,
    },
    {
      id: 4,
      title: "窃格瓦拉",
      creator: "表情包收藏家",
      avatar: "/placeholder.svg?height=40&width=40&query=user avatar 8",
      heat: 77.8,
    },
  ]

  // 过滤掉当前正在查看的空间
  const filteredSpaces = relatedSpaces.filter(space => space.id !== currentId);

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold mb-4">相关空间</h3>
        <div className="space-y-4">
          {filteredSpaces.map((space) => (
            <Link href={`/space/${space.id}`} key={space.id}>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={space.avatar || "/placeholder.svg"} alt={space.creator} />
                  <AvatarFallback>{space.creator[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{space.title}</p>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      window.location.href = "/user"
                    }}
                    className="cursor-pointer"
                  >
                    <p className="text-sm text-muted-foreground hover:text-foreground">{space.creator}</p>
                  </div>
                </div>
                <Badge className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span>{space.heat}</span>
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
