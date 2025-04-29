"use client"

import { CreatorTable } from "@/components/creator-table"
import { HeatTable } from "@/components/heat-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Coins, DollarSign, Flame, Hash, Newspaper, PiggyBank, Users, Wallet } from "lucide-react"
import type React from "react"
import { useLanguage } from "@/lib/i18n/context"

export default function DashboardPage() {
  const { t } = useLanguage()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("nav.dashboard")}</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <MetricCard title={t("dashboard.total.content")} value="12,345" icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title={t("dashboard.total.users")} value="5,678" icon={<Users className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title={t("dashboard.total.revenue")} value="$98,765" icon={<Wallet className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title={t("dashboard.current.heat")} value="87.5" icon={<Flame className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title={t("dashboard.top.heat")} value="#42069" icon={<Hash className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title={t("dashboard.total.tokens")} value="1,000,000" icon={<Coins className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title={t("dashboard.dapp.profit")} value="$45,678" icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard
          title={t("dashboard.content.revenue")}
          value="$76,543"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard title={t("dashboard.news.revenue")} value="$23,456" icon={<Newspaper className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <Tabs defaultValue="volume" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="volume">{t("dashboard.by.revenue")}</TabsTrigger>
          <TabsTrigger value="heat">{t("dashboard.by.heat")}</TabsTrigger>
        </TabsList>
        <TabsContent value="volume" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.creator.ranking")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CreatorTable />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="heat" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.space.ranking")}</CardTitle>
            </CardHeader>
            <CardContent>
              <HeatTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
