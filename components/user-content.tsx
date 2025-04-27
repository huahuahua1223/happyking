"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, MessageSquare, Calendar } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function UserContent() {
  const contents = [
    {
      id: 1,
      title: "马保国：我的太极拳不讲武德",
      image: "/martial-arts-master-humor.png",
      type: "video",
      space: "#42070",
      date: "2023-04-10",
      likes: 2543,
      comments: 486,
    },
    {
      id: 2,
      title: "人类高质量男性表情包合集",
      image: "/placeholder.svg?height=400&width=600&query=high quality man meme collection",
      type: "meme",
      space: "#42074",
      date: "2023-03-25",
      likes: 1876,
      comments: 342,
    },
    {
      id: 3,
      title: "向佐带货事件分析",
      image: "/placeholder.svg?height=400&width=600&query=xiang zuo selling products",
      type: "text",
      space: "#42075",
      date: "2023-02-18",
      likes: 987,
      comments: 246,
    },
    {
      id: 4,
      title: "蔡徐坤打篮球鬼畜视频",
      image: "/placeholder.svg?height=400&width=600&query=cai xukun basketball video",
      type: "video",
      space: "#42069",
      date: "2023-01-05",
      likes: 3456,
      comments: 678,
    },
    {
      id: 5,
      title: "经典网络梗图合集",
      image: "/placeholder.svg?height=400&width=600&query=classic chinese internet memes",
      type: "meme",
      space: "#42076",
      date: "2022-12-20",
      likes: 2134,
      comments: 421,
    },
    {
      id: 6,
      title: "2023年最火网络流行语",
      image: "/placeholder.svg?height=400&width=600&query=popular internet phrases 2023",
      type: "text",
      space: "#42077",
      date: "2022-11-15",
      likes: 1543,
      comments: 312,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contents.map((content) => (
        <Link href={`/space/${content.space.substring(1)}`} key={content.id}>
          <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-video">
              <Image src={content.image || "/placeholder.svg"} alt={content.title} fill className="object-cover" />
              <div className="absolute top-2 right-2">
                <Badge variant="secondary">{content.type}</Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold mb-2 line-clamp-2">{content.title}</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{content.space}</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {content.date}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {content.likes}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {content.comments}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
