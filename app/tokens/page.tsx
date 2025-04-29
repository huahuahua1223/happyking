"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TokenTable } from "@/components/token-table"
import { NFTGrid } from "@/components/nft-grid"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useLanguage } from "@/lib/i18n/context"

export default function TokensPage() {
  const { t } = useLanguage()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("tokens.and.nft")}</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle>Happy King (HKT)</CardTitle>
            <CardDescription>平台治理代币</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">$0.0456</div>
            <div className="text-sm text-green-500 mb-4">+5.67% (24h)</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">市值:</span> $4,560,000
              </div>
              <div>
                <span className="text-muted-foreground">24h交易量:</span> $789,123
              </div>
              <div>
                <span className="text-muted-foreground">流通量:</span> 100,000,000
              </div>
              <div>
                <span className="text-muted-foreground">总供应量:</span> 1,000,000,000
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle>马保国 (MBG)</CardTitle>
            <CardDescription>热门空间代币</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">$0.0789</div>
            <div className="text-sm text-red-500 mb-4">-2.34% (24h)</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">市值:</span> $789,000
              </div>
              <div>
                <span className="text-muted-foreground">24h交易量:</span> $123,456
              </div>
              <div>
                <span className="text-muted-foreground">流通量:</span> 10,000,000
              </div>
              <div>
                <span className="text-muted-foreground">总供应量:</span> 100,000,000
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle>蔡徐坤 (CXK)</CardTitle>
            <CardDescription>热门空间代币</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">$0.1234</div>
            <div className="text-sm text-green-500 mb-4">+12.34% (24h)</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">市值:</span> $1,234,000
              </div>
              <div>
                <span className="text-muted-foreground">24h交易量:</span> $456,789
              </div>
              <div>
                <span className="text-muted-foreground">流通量:</span> 10,000,000
              </div>
              <div>
                <span className="text-muted-foreground">总供应量:</span> 100,000,000
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder={t("tokens.search")} className="pl-8" />
        </div>
        <Button variant="outline">{t("tokens.add.custom")}</Button>
      </div>

      <Tabs defaultValue="tokens" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tokens">{t("tokens.list")}</TabsTrigger>
          <TabsTrigger value="nfts">{t("tokens.nft.market")}</TabsTrigger>
        </TabsList>
        <TabsContent value="tokens" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("tokens.market")}</CardTitle>
              <CardDescription>{t("tokens.market.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <TokenTable />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="nfts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("tokens.nft.market")}</CardTitle>
              <CardDescription>{t("tokens.nft.market.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <NFTGrid />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
