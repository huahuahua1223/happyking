"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useLanguage } from "@/lib/i18n/context"

// 静态的404页面，不使用客户端组件
export default function NotFound() {
  const { t } = useLanguage()

  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">{t("not.found.title")}</h1>
      <p className="text-xl text-muted-foreground mb-8">{t("not.found.description")}</p>
      <Link href="/">
        <Button>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("not.found.back.home")}
        </Button>
      </Link>
    </div>
  )
}