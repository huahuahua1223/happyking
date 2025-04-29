"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLanguage } from "@/lib/i18n/context"

export function CreatorTable() {
  const { t } = useLanguage()

  const creators = [
    {
      rank: 1,
      name: "鬼畜制作人",
      avatar: "/avatar-1.png",
      bets: 128,
      volume: "$45,678",
      change: "+12.5%",
    },
    {
      rank: 2,
      name: "表情包收藏家",
      avatar: "/avatar-2.png",
      bets: 96,
      volume: "$34,567",
      change: "+8.3%",
    },
    {
      rank: 3,
      name: "meme大师",
      avatar: "/avatar-3.png",
      bets: 87,
      volume: "$28,765",
      change: "+5.7%",
    },
    {
      rank: 4,
      name: "娱乐观察员",
      avatar: "/abstract-geometric-avatar.png",
      bets: 76,
      volume: "$23,456",
      change: "-2.1%",
    },
    {
      rank: 5,
      name: "经典收藏家",
      avatar: "/abstract-user-icon.png",
      bets: 65,
      volume: "$19,876",
      change: "+3.4%",
    },
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">{t("dashboard.rank")}</TableHead>
          <TableHead>{t("dashboard.creator")}</TableHead>
          <TableHead className="text-right">{t("dashboard.content.count")}</TableHead>
          <TableHead className="text-right">{t("dashboard.total.amount")}</TableHead>
          <TableHead className="text-right">{t("dashboard.change")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {creators.map((creator) => (
          <TableRow key={creator.rank}>
            <TableCell className="font-medium">{creator.rank}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div
                  onClick={() => {
                    window.location.href = "/user"
                  }}
                  className="cursor-pointer"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={creator.avatar || "/placeholder.svg"} alt={creator.name} />
                    <AvatarFallback>{creator.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div
                  onClick={() => {
                    window.location.href = "/user"
                  }}
                  className="hover:text-primary cursor-pointer"
                >
                  {creator.name}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right">{creator.bets}</TableCell>
            <TableCell className="text-right">{creator.volume}</TableCell>
            <TableCell className="text-right">
              <Badge variant={creator.change.startsWith("+") ? "default" : "destructive"}>{creator.change}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
