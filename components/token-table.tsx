"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useLanguage } from "@/lib/i18n/context"

export function TokenTable() {
  const { t } = useLanguage()

  const tokens = [
    {
      id: 1,
      name: "Happy King",
      symbol: "HKT",
      logo: "/placeholder.svg?height=32&width=32&query=happy king logo",
      price: "$0.0456",
      change: "+5.67%",
      marketCap: "$4,560,000",
      volume: "$789,123",
    },
    {
      id: 2,
      name: "马保国",
      symbol: "MBG",
      logo: "/placeholder.svg?height=32&width=32&query=ma baoguo logo",
      price: "$0.0789",
      change: "-2.34%",
      marketCap: "$789,000",
      volume: "$123,456",
    },
    {
      id: 3,
      name: "蔡徐坤",
      symbol: "CXK",
      logo: "/placeholder.svg?height=32&width=32&query=cai xukun logo",
      price: "$0.1234",
      change: "+12.34%",
      marketCap: "$1,234,000",
      volume: "$456,789",
    },
    {
      id: 4,
      name: "葛优躺",
      symbol: "GYT",
      logo: "/placeholder.svg?height=32&width=32&query=ge you lie down logo",
      price: "$0.0345",
      change: "+3.45%",
      marketCap: "$345,000",
      volume: "$67,890",
    },
    {
      id: 5,
      name: "王境泽",
      symbol: "WJZ",
      logo: "/placeholder.svg?height=32&width=32&query=wang jingze logo",
      price: "$0.0567",
      change: "-1.23%",
      marketCap: "$567,000",
      volume: "$98,765",
    },
    {
      id: 6,
      name: "金坷垃",
      symbol: "JKL",
      logo: "/placeholder.svg?height=32&width=32&query=jin kela logo",
      price: "$0.0234",
      change: "+2.34%",
      marketCap: "$234,000",
      volume: "$45,678",
    },
    {
      id: 7,
      name: "窃格瓦拉",
      symbol: "QGW",
      logo: "/placeholder.svg?height=32&width=32&query=che guevara chinese logo",
      price: "$0.0123",
      change: "+1.23%",
      marketCap: "$123,000",
      volume: "$23,456",
    },
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">{t("tokens.number")}</TableHead>
          <TableHead>{t("tokens.token")}</TableHead>
          <TableHead className="text-right">{t("tokens.price")}</TableHead>
          <TableHead className="text-right">{t("tokens.change")}</TableHead>
          <TableHead className="text-right">{t("tokens.market.cap")}</TableHead>
          <TableHead className="text-right">{t("tokens.volume")}</TableHead>
          <TableHead className="text-right">{t("tokens.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tokens.map((token, index) => (
          <TableRow key={token.id}>
            <TableCell className="font-medium">{index + 1}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="relative h-8 w-8">
                  <Image src={token.logo || "/placeholder.svg"} alt={token.name} fill className="rounded-full" />
                </div>
                <div>
                  <div className="font-medium">{token.name}</div>
                  <div className="text-xs text-muted-foreground">{token.symbol}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right">{token.price}</TableCell>
            <TableCell className="text-right">
              <Badge variant={token.change.startsWith("+") ? "default" : "destructive"}>{token.change}</Badge>
            </TableCell>
            <TableCell className="text-right">{token.marketCap}</TableCell>
            <TableCell className="text-right">{token.volume}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm">
                {t("tokens.trade")}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
