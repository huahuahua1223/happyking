"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Flame } from "lucide-react"
import { useLanguage } from "@/lib/i18n/context"

export function HeatTable() {
  const { t } = useLanguage()

  const spaces = [
    {
      rank: 1,
      creator: "鬼畜制作人",
      avatar: "/avatar-1.png",
      space: "#42069",
      title: "蔡徐坤打篮球",
      heat: 92.3,
    },
    {
      rank: 2,
      creator: "meme大师",
      avatar: "/avatar-3.png",
      space: "#42070",
      title: "马保国：我的太极拳不讲武德",
      heat: 87.5,
    },
    {
      rank: 3,
      creator: "经典收藏家",
      avatar: "/abstract-user-icon.png",
      space: "#42071",
      title: "葛优躺",
      heat: 82.1,
    },
    {
      rank: 4,
      creator: "鬼畜制作人",
      avatar: "/abstract-user-profile.png",
      space: "#42072",
      title: "王境泽：我就是饿死",
      heat: 79.6,
    },
    {
      rank: 5,
      creator: "表情包收藏家",
      avatar: "/placeholder.svg?height=40&width=40&query=user avatar 8",
      space: "#42073",
      title: "窃格瓦拉",
      heat: 77.8,
    },
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">{t("dashboard.rank")}</TableHead>
          <TableHead>{t("dashboard.creator")}</TableHead>
          <TableHead>{t("dashboard.space.number")}</TableHead>
          <TableHead>{t("dashboard.space.title")}</TableHead>
          <TableHead className="text-right">{t("dashboard.heat")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {spaces.map((space) => (
          <TableRow key={space.rank}>
            <TableCell className="font-medium">{space.rank}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div
                  onClick={() => {
                    window.location.href = "/user"
                  }}
                  className="cursor-pointer"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={space.avatar || "/placeholder.svg"} alt={space.creator} />
                    <AvatarFallback>{space.creator[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div
                  onClick={() => {
                    window.location.href = "/user"
                  }}
                  className="hover:text-primary cursor-pointer"
                >
                  {space.creator}
                </div>
              </div>
            </TableCell>
            <TableCell>{space.space}</TableCell>
            <TableCell className="max-w-[200px] truncate">{space.title}</TableCell>
            <TableCell className="text-right">
              <Badge className="flex items-center gap-1 ml-auto">
                <Flame className="h-3 w-3 text-orange-500" />
                <span>{space.heat}</span>
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
