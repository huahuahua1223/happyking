"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useContracts } from "@/hooks/use-contracts"
import { useWallet } from "@/hooks/use-wallet"
import { publishNews } from "@/services/news-service"
import { uploadJsonData } from "@/services/upload-service-improved"
import axios from "axios"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

// 这个页面是纯提交页面，不需要加载任何数据
export default function CreateNewsPage() {
  const router = useRouter()
  const { isConnected } = useWallet()
  const { toast } = useToast()
  const { news } = useContracts()

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    newsType: "Exchanges",
    hourlyRate: 1, // 1 USD/小时
    durationHours: 1, // 默认时长
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSliderChange = (value: number[]) => {
    setFormData((prev) => ({ ...prev, durationHours: value[0] }))
  }

  const totalCost = formData.hourlyRate * formData.durationHours

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      toast({
        title: "未连接钱包",
        description: "请先连接您的钱包",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      setUploadError(null)
      setUploadStatus("正在准备上传新闻内容...")

      // 创建要上传的新闻内容对象
      const newsContent = {
        title: formData.title,
        content: formData.content,
        newsType: formData.newsType,
        timestamp: Date.now(),
      }

      let walrusBlobId
      try {
        // 使用改进的上传服务，增加重试次数
        setUploadStatus("正在上传新闻内容...")
        setRetryCount(0)

        // 最多尝试5次上传
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            setRetryCount(attempt - 1)
            if (attempt > 1) {
              setIsRetrying(true)
              setUploadStatus(`上传重试中 (${attempt}/5)...`)
            }

            // 上传到 Walrus 并获取 blobId
            walrusBlobId = await uploadJsonData(newsContent, 5)

            setUploadStatus("上传成功，准备发布到区块链...")
            setIsRetrying(false)
            break
          } catch (uploadError: any) {
            // 如果是最后一次尝试仍然失败，则抛出错误
            if (attempt === 5) {
              throw uploadError
            }

            // 否则等待后重试
            const waitTime = Math.min(3000 * Math.pow(1.5, attempt - 1), 15000)
            setUploadStatus(`上传失败，${Math.round(waitTime / 1000)}秒后重试 (${attempt}/5)...`)
            await new Promise((resolve) => setTimeout(resolve, waitTime))
          }
        }

        toast({
          title: "上传成功",
          description: "新闻内容已上传，正在发布到区块链...",
        })
      } catch (uploadError: any) {
        // 处理429错误（请求过多）
        if (axios.isAxiosError(uploadError) && uploadError.response?.status === 429) {
          setUploadError("测试网节点正在限流，请稍后再试（建议等待几分钟后重试）")
          toast({
            title: "服务器限流",
            description: "测试网节点正在限流，请稍后再试（建议等待几分钟后重试）",
            variant: "destructive",
          })
          throw new Error("测试网节点正在限流，请稍后再试")
        }

        // 处理其他上传错误
        setUploadError("上传新闻内容失败，请稍后重试")
        toast({
          title: "上传失败",
          description: "上传新闻内容失败，请稍后重试",
          variant: "destructive",
        })
        throw uploadError
      }

      try {
        setUploadStatus("正在发布到区块链...")

        if (!news) {
          throw new Error("合约未加载，请稍后再试")
        }

        // 然后，使用获取的 walrusBlobId 调用智能合约
        const result = await publishNews(
          news,
          formData.title,
          formData.newsType,
          formData.hourlyRate,
          formData.durationHours,
          walrusBlobId,
        )

        toast({
          title: "新闻发布成功",
          description: "您的新闻已成功发布",
        })

        if (result.newsId) {
          router.push(`/news/${result.newsId}`)
        } else {
          router.push("/news")
        }
      } catch (contractError: any) {
        console.error("智能合约调用失败:", contractError)
        setUploadError("区块链交易失败，请检查您的钱包并重试")
        toast({
          title: "发布失败",
          description: "区块链交易失败，请检查您的钱包并重试",
          variant: "destructive",
        })
        throw contractError
      }
    } catch (error: any) {
      console.error("Error publishing news:", error)
      // 如果没有更具体的错误消息已经显示，则显示一个通用错误
      if (!uploadError) {
        setUploadError(error instanceof Error ? error.message : "发布新闻时出现错误，请重试")
        toast({
          title: "发布失败",
          description: error instanceof Error ? error.message : "发布新闻时出现错误，请重试",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
      setIsRetrying(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-bold mb-4">请先连接钱包</h2>
              <p className="text-muted-foreground mb-4">您需要连接钱包才能发布新闻</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/news" className="inline-flex items-center mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回新闻列表
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>创建新闻投放</CardTitle>
          <CardDescription>填写新闻信息并设置投放时长，系统将自动计算费用</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">新闻标题</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="输入新闻标题"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">新闻内容</Label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="输入新闻内容"
                className="min-h-[200px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newsType">新闻类型</Label>
              <Select value={formData.newsType} onValueChange={(value) => handleSelectChange("newsType", value)}>
                <SelectTrigger id="newsType">
                  <SelectValue placeholder="选择新闻类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meme">Meme文化</SelectItem>
                  <SelectItem value="Exchanges">交易所新闻</SelectItem>
                  <SelectItem value="Token">加密货币</SelectItem>
                  <SelectItem value="NFT">NFT相关</SelectItem>
                  <SelectItem value="Other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>投放时长 (小时)</Label>
                <span className="text-xl font-bold">{formData.durationHours}</span>
              </div>
              <Slider value={[formData.durationHours]} min={1} max={168} step={1} onValueChange={handleSliderChange} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>最少1小时</span>
                <span>最多7天 (168小时)</span>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-between">
                <span>基础费率</span>
                <span>${formData.hourlyRate}/小时</span>
              </div>
              <div className="flex items-center justify-between">
                <span>投放时长</span>
                <span>{formData.durationHours}小时</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span>预计总费用</span>
                <span>${(formData.hourlyRate * formData.durationHours).toFixed(2)} USD</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                注意：费用将按照智能合约中的汇率转换为ETH进行支付
              </div>
            </div>

            {uploadStatus && isSubmitting && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <p>{uploadStatus}</p>
                </div>
                {isRetrying && retryCount > 0 && (
                  <p className="text-xs mt-1 ml-6">已重试 {retryCount} 次，请耐心等待...</p>
                )}
              </div>
            )}

            {uploadError && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <p>{uploadError}</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push("/news")}>
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              投放广告
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
