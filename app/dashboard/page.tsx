"use client"

import { CreatorTable } from "@/components/creator-table"
import { HeatTable } from "@/components/heat-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Coins, DollarSign, Flame, Hash, Newspaper, PiggyBank, Users, Wallet, Loader2 } from "lucide-react"
import type React from "react"
import { useLanguage } from "@/lib/i18n/context"
import { useContracts } from "@/hooks/use-contracts"
import { getAllSpaces } from "@/services/space-service"
import { useEffect, useState } from "react"
import { SpaceType } from "@/lib/constants"

export default function DashboardPage() {
  const { t } = useLanguage()
  const { space } = useContracts()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    totalContent: 0,
    totalUsers: 0,
    totalHeat: 0,
    topHeatSpaceId: "0",
    typeDistribution: {
      [SpaceType.TEXT]: 0,
      [SpaceType.MEME]: 0,
      [SpaceType.VIDEO]: 0,
    },
    totalLikes: 0,
  })

  useEffect(() => {
    async function fetchSpaceData() {
      if (!space) return
      
      try {
        setLoading(true)
        const spaces = await getAllSpaces(space)
        
        // 计算总热度
        const totalHeat = spaces.reduce((acc, s) => acc + Number(s.heat || 0), 0)
        
        // 找出热度最高的空间
        let topHeatSpace = spaces[0]
        spaces.forEach(s => {
          if (Number(s.heat || 0) > Number(topHeatSpace?.heat || 0)) {
            topHeatSpace = s
          }
        })
        
        // 计算内容类型分布
        const typeDistribution = {
          [SpaceType.TEXT]: 0,
          [SpaceType.MEME]: 0,
          [SpaceType.VIDEO]: 0,
        }
        spaces.forEach(s => {
          const type = Number(s.spaceType) as SpaceType
          typeDistribution[type] = (typeDistribution[type] || 0) + 1
        })
        
        // 计算总点赞数
        const totalLikes = spaces.reduce((acc, s) => acc + Number(s.likes || 0), 0)
        
        // 获取唯一创建者数量
        const uniqueCreators = new Set(spaces.map(s => s.creator?.toLowerCase())).size
        
        setDashboardData({
          totalContent: spaces.length,
          totalUsers: uniqueCreators,
          totalHeat,
          topHeatSpaceId: spaces.indexOf(topHeatSpace) + 1 + "", // 空间ID为索引+1
          typeDistribution,
          totalLikes,
        })
      } catch (err) {
        console.error("获取空间数据失败:", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSpaceData()
  }, [space])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载数据中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("nav.dashboard")}</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <MetricCard 
          title={t("dashboard.total.space")} 
          value={dashboardData.totalContent.toString()} 
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} 
        />
        <MetricCard 
          title={t("dashboard.total.users")} 
          value={dashboardData.totalUsers.toString()} 
          icon={<Users className="h-4 w-4 text-muted-foreground" />} 
        />
        <MetricCard 
          title={t("dashboard.total.likes")} 
          value={dashboardData.totalLikes.toString()} 
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />} 
        />
        <MetricCard 
          title={t("dashboard.current.heat")} 
          value={dashboardData.totalHeat.toString()} 
          icon={<Flame className="h-4 w-4 text-muted-foreground" />} 
        />
        <MetricCard 
          title={t("dashboard.top.heat")} 
          value={`#${dashboardData.topHeatSpaceId}`} 
          icon={<Hash className="h-4 w-4 text-muted-foreground" />} 
        />
        <MetricCard 
          title={t("dashboard.text.content")} 
          value={dashboardData.typeDistribution[SpaceType.TEXT].toString()} 
          icon={<Coins className="h-4 w-4 text-muted-foreground" />} 
        />
        <MetricCard 
          title={t("dashboard.meme.content")} 
          value={dashboardData.typeDistribution[SpaceType.MEME].toString()} 
          icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />} 
        />
        <MetricCard 
          title={t("dashboard.video.content")} 
          value={dashboardData.typeDistribution[SpaceType.VIDEO].toString()} 
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard 
          title={t("dashboard.avg.heat")} 
          value={(dashboardData.totalContent > 0 ? (dashboardData.totalHeat / dashboardData.totalContent).toFixed(2) : "0")} 
          icon={<Newspaper className="h-4 w-4 text-muted-foreground" />} 
        />
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
