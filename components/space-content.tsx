"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AGGREGATOR_URL, SpaceType } from "@/lib/constants"
import { MessageSquare, Share2, ThumbsUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

interface SpaceContentProps {
  spaceData: {
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
  }
}

export function SpaceContent({ spaceData }: SpaceContentProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  // Render content based on space type
  const renderContent = () => {
    switch (spaceData.typeNumber) {
      case SpaceType.TEXT:
        return (
          <div className="prose prose-invert max-w-none">
            {spaceData.content ? (
              spaceData.content.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : (
              <p>没有可显示的内容</p>
            )}
          </div>
        )

      case SpaceType.MEME:
        return (
          <div className="relative aspect-video">
            <Image
              src={`${AGGREGATOR_URL}${spaceData.walrusBlobId}`}
              alt={spaceData.title}
              fill
              className="object-contain"
              onError={(e) => {
                // Fallback image if the blob fails to load
                e.currentTarget.src = "/distracted-boyfriend-generic.png"
              }}
            />
          </div>
        )

      case SpaceType.VIDEO:
        return (
          <div className="relative aspect-video">
            <Image
              src={`${AGGREGATOR_URL}${spaceData.walrusBlobId}`}
              alt={spaceData.title}
              fill
              className="object-cover"
              onError={(e) => {
                // Fallback image if the blob fails to load
                e.currentTarget.src = "/abstract-thumbnail.png"
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-4 h-10 bg-white rounded-sm"></div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-0 h-0 border-y-10 border-y-transparent border-l-16 border-l-white ml-1"></div>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return <p>未知的内容类型</p>
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/user">
              <Avatar className="h-8 w-8">
                <AvatarImage src={spaceData.avatar || "/placeholder.svg"} alt={spaceData.creator} />
                <AvatarFallback>{spaceData.creator[0]}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link href="/user">
                <p className="font-medium hover:text-primary">{spaceData.creator}</p>
              </Link>
              <p className="text-xs text-muted-foreground">{spaceData.date}</p>
            </div>
          </div>

          {renderContent()}

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8 px-2">
                <ThumbsUp className="h-4 w-4" />
                <span>{spaceData.likes}</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8 px-2">
                <MessageSquare className="h-4 w-4" />
                <span>0</span>
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
