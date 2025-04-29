"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useContracts } from "@/hooks/use-contracts"
import { useWallet } from "@/hooks/use-wallet"
import { SPACE_TYPE_LABELS, SpaceType } from "@/lib/constants"
import { getUserFriendlyError as getErrorMessage, getTechnicalErrorDetails } from "@/lib/error-handler"
import { useLanguage } from "@/lib/i18n/context"
import { createSpace } from "@/services/space-service"
import { uploadToWalrus } from "@/services/upload-service"
import { AlertCircle, ArrowLeft, ImageIcon, Loader2, Video } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useRef, useState } from "react"

export default function CreateSpacePage() {
  const router = useRouter()
  const { isConnected } = useWallet()
  const { space } = useContracts()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  const getUserFriendlyError = (error: any, errorType = "unknown") =>
    getErrorMessage(error, errorType, t)

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    spaceType: SpaceType.MEME.toString(),
    walrusBlobId: "",
    name: "",
    symbol: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isFffmpegLoading, setIsFffmpegLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const ffmpegRef = useRef<any>(null)
  const [skipCompression, setSkipCompression] = useState(false) // 新增：跳过压缩选项

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadFFmpeg = async () => {
      try {
        setIsFffmpegLoading(true)
        const { FFmpeg } = await import("@ffmpeg/ffmpeg")
        const { fetchFile } = await import("@ffmpeg/util")
        ffmpegRef.current = { FFmpeg: new FFmpeg(), fetchFile }
        await ffmpegRef.current.FFmpeg.load()
      } catch (error) {
        console.error("FFmpeg 加载失败:", getTechnicalErrorDetails(error))
        setUploadError(`FFmpeg 加载失败: ${getUserFriendlyError(error, "ffmpeg_load_failed")}`)
      } finally {
        setIsFffmpegLoading(false)
      }
    }
    loadFFmpeg()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    setSelectedFile(null)
    setUploadProgress(0)
    setUploadError(null)
  }

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const compressVideo = async (file: File): Promise<File> => {
    if (!ffmpegRef.current?.FFmpeg?.loaded) {
      throw new Error("FFmpeg 未加载，请稍后重试")
    }

    const { FFmpeg, fetchFile } = ffmpegRef.current
    const inputPath = `input.${file.name.split(".").pop()}`
    const outputPath = `output_compressed.mp4`

    try {
      await FFmpeg.writeFile(inputPath, await fetchFile(file))
      await FFmpeg.exec([
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-crf",
        "26",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-vf",
        "scale=-2:720",
        outputPath,
      ])

      const compressedData = await FFmpeg.readFile(outputPath)
      const compressedFile = new File([compressedData], `compressed_${file.name}`, { type: "video/mp4" })
      return compressedFile
    } finally {
      await FFmpeg.deleteFile(inputPath).catch(() => {})
      await FFmpeg.deleteFile(outputPath).catch(() => {})
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!formData.title.trim()) {
      console.error(`请先填写标题`)
      setUploadError("请先填写空间标题")
      return
    }

    setSelectedFile(file)
    setUploadError(null)

    const spaceTypeNum = Number(formData.spaceType)
    if (spaceTypeNum === SpaceType.MEME && !file.type.startsWith("image/")) {
      setUploadError(getUserFriendlyError(null, "invalid_file_type"))
      return
    }
    if (spaceTypeNum === SpaceType.VIDEO && !file.type.startsWith("video/")) {
      setUploadError(getUserFriendlyError(null, "invalid_file_type"))
      return
    }

    if (spaceTypeNum === SpaceType.VIDEO && file.size > 50 * 1024 * 1024) {
      setUploadError(getUserFriendlyError(null, "file_too_large_video"))
      return
    }
    if (spaceTypeNum === SpaceType.MEME && file.size > 5 * 1024 * 1024) {
      setUploadError(getUserFriendlyError(null, "file_too_large"))
      return
    }

    let fileToUpload = file
    if (spaceTypeNum === SpaceType.VIDEO && !skipCompression) {
      if (isFffmpegLoading || !ffmpegRef.current) {
        setUploadError("FFmpeg 正在加载，请稍后重试")
        return
      }
      try {
        setIsCompressing(true)
        fileToUpload = await compressVideo(file)
        setSelectedFile(fileToUpload)
      } catch (error) {
        console.error("视频压缩失败:", getTechnicalErrorDetails(error))
        setUploadError(`视频压缩失败: ${getUserFriendlyError(error, "compression_failed")}`)
        setIsCompressing(false)
        return
      } finally {
        setIsCompressing(false)
      }
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      const blobId = await uploadToWalrus(
        fileToUpload,
        (progress) => {
          if (progress > 0 || uploadProgress === 0) {
            setUploadProgress(progress)
          }
        },
        (status) => console.log(status),
        t
      )

      setFormData((prev) => ({ ...prev, walrusBlobId: blobId }))
      console.log(`文件上传成功: ${t("space.upload.success")}`)

      if (space && isConnected) {
        try {
          setIsSubmitting(true)
          console.log("文件上传成功，立即开始创建空间...")

          const tokenName = formData.name || formData.title.substring(0, 3)
          const tokenSymbol = formData.symbol || tokenName

          const result = await createSpace(
            space,
            spaceTypeNum,
            formData.title,
            blobId,
            tokenName,
            tokenSymbol
          )

          console.log("空间创建成功:", result)
          if (result.spaceId) {
            console.log("重定向到新创建的空间页面:", `/space/${result.spaceId}`)
            router.push(`/space/${result.spaceId}`)
          } else {
            console.log("重定向到首页")
            router.push("/")
          }
        } catch (error) {
          console.error("创建空间失败:", getTechnicalErrorDetails(error))
          setUploadError(`创建空间失败: ${getUserFriendlyError(error, "contract_error")}`)
        } finally {
          setIsSubmitting(false)
        }
      }
    } catch (error) {
      console.error("上传文件失败详情:", getTechnicalErrorDetails(error))
      let errorType = "upload_failed"
      if (error instanceof Error) {
        if (error.message.includes("rate limit") || error.message.includes("too many requests")) {
          errorType = "rate_limit"
        } else if (error.message.includes("timeout") || error.message.includes("exceeded")) {
          errorType = "upload_timeout"
        } else if (error.message.includes("Network Error") || !navigator.onLine) {
          errorType = "network_error"
        }
      }
      setUploadError(`文件上传失败: ${getUserFriendlyError(error, errorType)}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRetry = () => {
    if (selectedFile) {
      handleFileChange({ target: { files: [selectedFile] } } as React.ChangeEvent<HTMLInputElement>)
    }
  }

  const getUploadInfo = () => {
    const spaceTypeNum = Number(formData.spaceType)
    switch (spaceTypeNum) {
      case SpaceType.TEXT:
        return null
      case SpaceType.MEME:
        return {
          title: t("space.upload.meme"),
          description: t("space.upload.meme.description"),
          icon: <ImageIcon className="h-8 w-8 mb-2 text-muted-foreground" />,
        }
      case SpaceType.VIDEO:
        return {
          title: t("space.upload.video"),
          description: t("space.upload.video.description"),
          icon: <Video className="h-8 w-8 mb-2 text-muted-foreground" />,
        }
      default:
        return {
          title: t("space.upload.content"),
          description: t("space.upload.content.description"),
          icon: <ImageIcon className="h-8 w-8 mb-2 text-muted-foreground" />,
        }
    }
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      console.error(`表单不完整: ${t("form.please.enter")} ${t("space.title")}`)
      return false
    }
    const spaceTypeNum = Number(formData.spaceType)
    if (spaceTypeNum === SpaceType.TEXT && !formData.content.trim()) {
      console.error(`表单不完整: ${t("form.please.enter")} ${t("space.content")}`)
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected) {
      console.error(`钱包未连接: ${t("wallet.not_connected")}`)
      return
    }
    if (!space) {
      console.error(`合约未加载: ${t("contract.not_loaded")}`)
      return
    }
    if (!validateForm()) {
      return
    }
    if (Number(formData.spaceType) !== SpaceType.TEXT) {
      console.log("非文本类型空间，应在文件上传后处理")
      return
    }

    try {
      setIsSubmitting(true)
      console.log("开始创建文本类型空间...")

      const tokenName = formData.name || formData.title.substring(0, 3)
      const tokenSymbol = formData.symbol || tokenName

      console.log("文本类型空间，准备上传内容...")
      const textContent = {
        content: formData.content,
        timestamp: Date.now(),
      }

      try {
        const textBlob = new Blob([JSON.stringify(textContent)], { type: "application/json" })
        const textFile = new File([textBlob], "content.json", { type: "application/json" })
        console.log("上传文本内容到Walrus...")
        const blobId = await uploadToWalrus(textFile)
        console.log("文本内容上传成功，blobId:", blobId)

        console.log("调用createSpace服务方法...")
        const result = await createSpace(
          space,
          SpaceType.TEXT,
          formData.title,
          blobId,
          tokenName,
          tokenSymbol
        )

        console.log("空间创建成功:", result)
        if (result.spaceId) {
          console.log("重定向到新创建的空间页面:", `/space/${result.spaceId}`)
          router.push(`/space/${result.spaceId}`)
        } else {
          console.log("重定向到首页")
          router.push("/")
        }
      } catch (error) {
        console.error("上传文本内容失败详情:", getTechnicalErrorDetails(error))
        throw new Error(getUserFriendlyError(error, "upload_failed"))
      }
    } catch (error) {
      console.error("创建空间过程中出错:", getTechnicalErrorDetails(error))
      const errorMessage = error instanceof Error ? error.message : getUserFriendlyError(error, "unknown")
      console.error(`空间创建失败: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const uploadInfo = getUploadInfo()

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

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("nav.back.home")}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t("space.create.title")}</CardTitle>
          <CardDescription>{t("space.create.description")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">{t("space.title")}</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={t("space.title.placeholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spaceType">{t("space.type")}</Label>
              <Select value={formData.spaceType} onValueChange={(value) => handleSelectChange("spaceType", value)}>
                <SelectTrigger id="spaceType">
                  <SelectValue placeholder={t("space.type.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SpaceType.TEXT.toString()}>{t(SPACE_TYPE_LABELS[SpaceType.TEXT])}</SelectItem>
                  <SelectItem value={SpaceType.MEME.toString()}>{t(SPACE_TYPE_LABELS[SpaceType.MEME])}</SelectItem>
                  <SelectItem value={SpaceType.VIDEO.toString()}>{t(SPACE_TYPE_LABELS[SpaceType.VIDEO])}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {Number(formData.spaceType) === SpaceType.TEXT && (
              <div className="space-y-2">
                <Label htmlFor="content">{t("space.content")}</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder={t("space.content.placeholder")}
                  className="min-h-[100px]"
                  required={Number(formData.spaceType) === SpaceType.TEXT}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t("space.token.name")}</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("space.token.name.placeholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">{t("space.token.symbol")}</Label>
              <Input
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder={t("space.token.symbol.placeholder")}
                maxLength={5}
              />
            </div>

            {/* 新增：跳过压缩选项 */}
            {Number(formData.spaceType) === SpaceType.VIDEO && (
              <div className="space-y-2">
                <Label>
                  <input
                    type="checkbox"
                    checked={skipCompression}
                    onChange={(e) => setSkipCompression(e.target.checked)}
                  />
                  <span className="ml-2">{t("space.skip_compression")}</span>
                </Label>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept={Number(formData.spaceType) === SpaceType.MEME ? "image/*" : "video/*"}
              disabled={isFffmpegLoading}
            />

            {uploadInfo && (
              <div className="space-y-2">
                <Label>{uploadInfo.title}</Label>
                <div
                  className={`border border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors ${
                    uploadError ? "border-destructive" : ""
                  }`}
                  onClick={!isUploading && !isSubmitting && !isCompressing && !isFffmpegLoading ? handleFileClick : undefined}
                >
                  {isFffmpegLoading ? (
                    <div className="space-y-4">
                      <Loader2 className="h-8 w-8 mb-2 text-muted-foreground animate-spin" />
                      <p className="text-sm font-medium mb-2">{t("space.ffmpeg_loading")}</p>
                    </div>
                  ) : isCompressing ? (
                    <div className="space-y-4">
                      <Loader2 className="h-8 w-8 mb-2 text-muted-foreground animate-spin" />
                      <p className="text-sm font-medium mb-2">{t("space.compressing")}</p>
                    </div>
                  ) : isUploading || isSubmitting ? (
                    <div className="space-y-4">
                      {uploadInfo.icon}
                      <p className="text-sm font-medium mb-2">
                        {isUploading ? t("space.uploading") : t("space.creating")}
                      </p>
                      <Progress value={isUploading ? uploadProgress : 100} className="w-full h-2" />
                      <p className="text-xs text-muted-foreground">
                        {isUploading ? `${uploadProgress.toFixed(0)}%` : t("space.confirm_transaction")}
                      </p>
                    </div>
                  ) : selectedFile && !uploadError ? (
                    <>
                      {uploadInfo.icon}
                      <p className="text-sm font-medium mb-2">
                        {t("space.selected")}: {selectedFile.name}
                      </p>
                      {formData.walrusBlobId ? (
                        <p className="text-xs text-green-500">{t("space.upload.success")} ✓</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t("space.click.change")}</p>
                      )}
                    </>
                  ) : (
                    <>
                      {uploadInfo.icon}
                      <p className="text-sm font-medium mb-2">
                        {t("space.upload")} {uploadInfo.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{uploadInfo.description}</p>
                    </>
                  )}
                </div>

                {uploadError && (
                  <div className="flex items-center text-destructive text-sm mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {uploadError}
                    <Button variant="link" onClick={handleRetry} className="ml-2">
                      {t("app.retry")}
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">{t("space.fee.note")}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push("/")}>
              {t("app.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading || isCompressing || isFffmpegLoading || Number(formData.spaceType) !== SpaceType.TEXT}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("space.create")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}