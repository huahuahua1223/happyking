"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@/hooks/use-wallet"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/lib/i18n/context"

/**
 * 检查用户是否已创建资料的钩子
 * 如果未创建，自动重定向到编辑页面
 */
export function useCheckProfile(redirectToEdit = true) {
  const router = useRouter()
  const { isConnected } = useWallet()
  const { profile, loading } = useUserProfile()
  const { addToast } = useToast()
  const { t } = useLanguage()
  const [isChecked, setIsChecked] = useState(false)

  useEffect(() => {
    // 如果钱包未连接或正在加载，不做任何操作
    if (!isConnected || loading) {
      return
    }

    // 如果用户资料不存在且需要重定向
    if (!profile && redirectToEdit) {
      addToast({
        title: t("user.profile.not.found"),
        description: t("user.profile.create.prompt"),
      })
      router.push("/user/edit")
    }

    setIsChecked(true)
  }, [isConnected, profile, loading, router, addToast, t, redirectToEdit])

  return {
    hasProfile: !!profile,
    isLoading: loading || !isChecked,
    profile,
  }
}
