"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Flame } from "lucide-react"
import Link from "next/link"

export function SpaceRelated() {
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

  return (
    <div className="space-y-4">
      {relatedSpaces.map((space) => (
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
  )
}
