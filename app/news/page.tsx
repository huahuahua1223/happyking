"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { NewsList } from "@/components/news-list"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { ErrorBoundary } from "@/components/error-boundary"
import { useLanguage } from "@/lib/i18n/context"

export default function NewsPage() {
  const { t } = useLanguage()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t("news.center")}</h1>
        <Link href="/news/create">
          <Button className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("news.publish")}
          </Button>
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t("news.explanation")}</CardTitle>
          <CardDescription>{t("news.pricing")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-1">
            <div className="rounded-lg border p-4 text-center">
              <h3 className="font-semibold mb-2">{t("news.basic")}</h3>
              <p className="text-3xl font-bold mb-2">
                $1<span className="text-sm font-normal ml-1">{t("news.per.hour")}</span>
              </p>
              <p className="text-muted-foreground text-sm">{t("news.basic.description")}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">{t("news.min.note")}</p>
        </CardFooter>
      </Card>

      <ErrorBoundary>
        <NewsList />
      </ErrorBoundary>
    </div>
  )
}
