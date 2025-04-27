"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, MessageSquare, Flame, Calendar } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function UserSpaces() {
  const spaces = [
    {
      id: 1,
      title: "马保国：我的太极拳不讲武德",
      image: "/martial-arts-master-humor.png",
      type: "video",
      heat: 87.5,
      date: "2023-04-10",
      likes: 2543,
      comments: 486,
    },
    {
      id: 2,
      title: "人类高质量男性",
      image: "/thoughtful-man-pondering.png",
      type: "meme",
      heat: 76.8,
      date: "2023-03-25",
      likes: 1234,
      comments: 321,
    },
    {
      id: 3,
      title: "向佐：我不是在带货",
      image: "/thinking-face-question-marks.png",
      type: "text",
      heat: 65.4,
      date: "2023-02-18",
      likes: 987,
      comments: 246,
    },
    {
      id: 4,
      title: "蔡徐坤打篮球",
      image: "/stylized-basketball-player.png",
      type: "video",
      heat: 92.3,
      date: "2023-01-05",
      likes: 5678,
      comments: 932,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {spaces.map((space) => (
        <Link href={`/space/${space.id}`} key={space.id}>
          <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-video">
              <Image src={space.image || "/placeholder.svg"} alt={space.title} fill className="object-cover" />
              <div className="absolute top-2 right-2">
                <Badge variant="secondary">{space.type}</Badge>
              </div>
              <div className="absolute bottom-2 right-2">
                <Badge className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span>{space.heat}</span>
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold mb-2 line-clamp-2">{space.title}</h3>
              <div className="flex items-center justify-between mb-2">
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
