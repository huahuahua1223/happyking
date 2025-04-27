"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

export function UserNFTs() {
  const nfts = [
    {
      id: 1,
      name: "马保国 #42",
      image: "/placeholder.svg?height=300&width=300&query=ma baoguo nft",
      collection: "马保国系列",
      rarity: "稀有",
      chain: "Ethereum",
    },
    {
      id: 2,
      name: "蔡徐坤 #87",
      image: "/placeholder.svg?height=300&width=300&query=cai xukun nft",
      collection: "蔡徐坤系列",
      rarity: "普通",
      chain: "Ethereum",
    },
    {
      id: 3,
      name: "葛优躺 #13",
      image: "/placeholder.svg?height=300&width=300&query=ge you lie down nft",
      collection: "经典表情包",
      rarity: "传奇",
      chain: "Solana",
    },
    {
      id: 4,
      name: "金坷垃 #56",
      image: "/placeholder.svg?height=300&width=300&query=jin kela nft",
      collection: "互联网经典",
      rarity: "稀有",
      chain: "Sui",
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
                <span className="text-muted-foreground">系列:</span>
                <span>{nft.collection}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">稀有度:</span>
                <Badge variant={nft.rarity === "传奇" ? "default" : nft.rarity === "稀有" ? "secondary" : "outline"}>
                  {nft.rarity}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">区块链:</span>
                <span>{nft.chain}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
