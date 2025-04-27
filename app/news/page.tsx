import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { NewsList } from "@/components/news-list"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { ErrorBoundary } from "@/components/error-boundary"

export default function NewsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">新闻中心</h1>
        <Link href="/news/create">
          <Button className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            投放新闻
          </Button>
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>新闻投放说明</CardTitle>
          <CardDescription>投放新闻按照小时收费，按USD计价，且至少满足最低时长</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-1">
            <div className="rounded-lg border p-4 text-center">
              <h3 className="font-semibold mb-2">基础投放</h3>
              <p className="text-3xl font-bold mb-2">
                $1<span className="text-sm font-normal ml-1">/小时</span>
              </p>
              <p className="text-muted-foreground text-sm">适合一般性新闻投放</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">最低投放时长为1小时，投放费用将通过智能合约自动计算并收取</p>
        </CardFooter>
      </Card>

      <ErrorBoundary>
        <NewsList />
      </ErrorBoundary>
    </div>
  )
}
