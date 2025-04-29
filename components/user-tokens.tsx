"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight } from "lucide-react"
import Image from "next/image"
import { useLanguage } from "@/lib/i18n/context"

export function UserTokens() {
  const { t } = useLanguage()

  const tokens = [
    {
      id: 1,
      name: "Happy King",
      symbol: "HKT",
      logo: "/joyful-monarch.png",
      balance: "1,000",
      value: "$45.60",
      price: "$0.0456",
      change: "+5.67%",
    },
    {
      id: 2,
      name: "马保国",
      symbol: "MBG",
      logo: "/martial-arts-master-humor.png",
      balance: "500",
      value: "$39.45",
      price: "$0.0789",
      change: "-2.34%",
    },
    {
      id: 3,
      name: "蔡徐坤",
      symbol: "CXK",
      logo: "/stylized-basketball-player.png",
      balance: "200",
      value: "$24.68",
      price: "$0.1234",
      change: "+12.34%",
    },
    {
      id: 4,
      name: "葛优躺",
      symbol: "GYT",
      logo: "/reluctant-dog-bedtime.png",
      balance: "300",
      value: "$10.35",
      price: "$0.0345",
      change: "+3.45%",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">{t("user.total.value")}</div>
            <div className="text-3xl font-bold">$120.08</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">{t("user.token.types")}</div>
            <div className="text-3xl font-bold">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">{t("user.token.count")}</div>
            <div className="text-3xl font-bold">2,000</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tokens.map((token) => (
          <Card key={token.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-10 w-10">
                  <Image
                    src={token.logo || "/placeholder.svg"}
                    alt={token.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold">{token.name}</h3>
                  <p className="text-sm text-muted-foreground">{token.symbol}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("user.balance")}:</span>
                  <span className="font-medium">{token.balance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("user.value")}:</span>
                  <span className="font-medium">{token.value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("user.price")}:</span>
                  <span className="font-medium">{token.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("user.change")}:</span>
                  <Badge variant={token.change.startsWith("+") ? "default" : "destructive"}>{token.change}</Badge>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  {t("user.buy")}
                </Button>
                <Button size="sm">{t("user.sell")}</Button>
              </div>

              <Button variant="ghost" size="sm" className="w-full mt-2 flex items-center justify-center gap-1">
                <span>{t("user.details")}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
