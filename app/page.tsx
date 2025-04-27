import { Button } from "@/components/ui/button"
import SpaceGrid from "@/components/space-grid"
import { PlusCircle } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">探索空间</h1>
        <Link href="/create-space">
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            创建空间
          </Button>
        </Link>
      </div>

      <SpaceGrid />
    </div>
  )
}
