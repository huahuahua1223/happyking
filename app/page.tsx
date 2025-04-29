"use client"

import { Button } from "@/components/ui/button"
import SpaceGrid from "@/components/space-grid"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/context"

export default function HomePage() {
  const { t } = useLanguage()
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t("space.explore")}</h1>
        <Link href="/create-space">
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("space.create")}
          </Button>
        </Link>
      </div>

      <SpaceGrid />
    </div>
  )
}
