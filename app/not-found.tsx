import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

// 静态的404页面，不使用客户端组件
export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">页面未找到</h1>
      <p className="text-xl text-muted-foreground mb-8">无法找到请求的资源</p>
      <Link href="/">
        <Button>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Button>
      </Link>
    </div>
  )
}