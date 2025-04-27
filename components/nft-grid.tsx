"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

export function NFTGrid() {
  const nfts = [
    {
      id: 1,
      name: "马保国系列",
      image: "/placeholder.svg?height=300&width=300&query=ma baoguo nft collection",
      floor: "0.05 ETH",
      items: 1000,
      volume: "12.5 ETH",
    },
    {
      id: 2,
      name: "蔡徐坤系列",
      image: "/placeholder.svg?height=300&width=300&query=cai xukun nft collection",
      floor: "0.08 ETH",
      items: 888,
      volume: "18.7 ETH",
    },
    {
      id: 3,
      name: "经典表情包",
      image: "/placeholder.svg?height=300&width=300&query=classic meme nft collection",
      floor: "0.12 ETH",
      items: 500,
      volume: "25.3 ETH",
    },
    {
      id: 4,
      name: "互联网经典",
      image: "/placeholder.svg?height=300&width=300&query=internet classic nft collection",
      floor: "0.03 ETH",
      items: 2000,
      volume: "8.9 ETH",
    },
    {
      id: 5,
      name: "人类高质量男性",
      image: "/placeholder.svg?height=300&width=300&query=high quality man nft collection",
      floor: "0.07 ETH",
      items: 777,
      volume: "15.2 ETH",
    },
    {
      id: 6,
      name: "向佐带货",
      image: "/placeholder.svg?height=300&width=300&query=xiang zuo nft collection",
      floor: "0.02 ETH",
      items: 1500,
      volume: "5.6 ETH",
    },
    {
      id: 7,
      name: "金坷垃三位一体",
      image: "/placeholder.svg?height=300&width=300&query=jin kela nft collection",
      floor: "0.04 ETH",
      items: 1200,
      volume: "9.8 ETH",
    },
    {
      id: 8,
      name: "窃格瓦拉",
      image: "/placeholder.svg?height=300&width=300&query=che guevara chinese nft collection",
      floor: "0.06 ETH",
      items: 900,
      volume: "13.4 ETH",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {nfts.map((nft) => (
        <Card key={nft.id} className="overflow-hidden">
          <div className="relative aspect-square">
            <Image src={nft.image || "/placeholder.svg"} alt={nft.name} fill className="object-cover" />
          </div>
          <CardContent className="p-4">
            <h3 className="font-bold mb-2">{nft.name}</h3>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">地板价:</span>
                <span>{nft.floor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">总数量:</span>
                <span>{nft.items}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">总交易量:</span>
                <Badge variant="secondary">{nft.volume}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
