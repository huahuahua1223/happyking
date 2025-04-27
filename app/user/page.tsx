"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserNFTs } from "@/components/user-nfts"
import { UserContent } from "@/components/user-content"
import { UserTokens } from "@/components/user-tokens"
import { Twitter, MessageCircle, Edit } from "lucide-react"
import Link from "next/link"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useWallet } from "@/hooks/use-wallet"
import { Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/i18n/context"
import { AGGREGATOR_URL } from "@/lib/constants"

export default function UserPage() {
  const { isConnected } = useWallet()
  const { profile, loading: profileLoading } = useUserProfile()
  const { t } = useLanguage()

  // 如果钱包未连接
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-bold mb-4">{t("wallet.please.connect")}</h2>
              <p className="text-muted-foreground mb-4">{t("wallet.need.connect")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 如果正在加载用户资料
  if (profileLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>{t("user.profile.loading")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 如果用户资料不存在，提示创建
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-bold mb-4">{t("user.profile.not.found")}</h2>
              <p className="text-muted-foreground mb-4">{t("user.profile.create.prompt")}</p>
              <Link href="/user/edit">
                <Button>{t("user.create.profile")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 用户资料存在，显示正常页面
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardContent className="p-0">
          <div className="h-48 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-t-lg" />
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12">
              <Avatar className="h-24 w-24 border-4 border-background">
                {profile.avatarBlobId && profile.avatarBlobId !== "default-avatar.png" ? (
                  <AvatarImage src={`${AGGREGATOR_URL}${profile.avatarBlobId}`} alt={profile.nickname} />
                ) : (
                  <AvatarImage src="/joyful-monarch.png" alt={profile.nickname} />
                )}
                <AvatarFallback>{profile.nickname ? profile.nickname[0] : "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-bold">{profile.nickname || t("user.anonymous")}</h1>
                  </div>
                  <div className="flex gap-2">
                    {profile.xName && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(`https://x.com/${profile.xName}`, "_blank")}
                      >
                        <Twitter className="h-4 w-4" />
                        <span className="sr-only">Twitter</span>
                      </Button>
                    )}
                    {profile.tgName && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(`https://t.me/${profile.tgName}`, "_blank")}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="sr-only">Telegram</span>
                      </Button>
                    )}
                    <Link href="/user/edit">
                      <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <p className="pt-2">{profile.bio || t("user.no.bio")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="spaces" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="spaces">{t("user.spaces")}</TabsTrigger>
          <TabsTrigger value="tokens">{t("user.tokens")}</TabsTrigger>
          <TabsTrigger value="nfts">{t("user.nfts")}</TabsTrigger>
        </TabsList>
        <TabsContent value="spaces" className="mt-4">
          <UserContent />
        </TabsContent>
        <TabsContent value="tokens" className="mt-4">
          <UserTokens />
        </TabsContent>
        <TabsContent value="nfts" className="mt-4">
          <UserNFTs />
        </TabsContent>
      </Tabs>
    </div>
  )
}
