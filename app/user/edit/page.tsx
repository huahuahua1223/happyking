"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2, AlertCircle, User, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@/hooks/use-wallet"
import { useContracts } from "@/hooks/use-contracts"
import { useUserProfile } from "@/hooks/use-user-profile"
import { createUserProfile } from "@/services/user-service"
import { toast } from "@/components/ui/use-toast"
import { uploadToWalrus, type UploadStatus } from "@/services/upload-service"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"
import { AGGREGATOR_URL } from "@/lib/constants"
import { useLanguage } from "@/lib/i18n/context"

export default function EditUserPage() {
  const router = useRouter()
  const { isConnected } = useWallet()
  const { userProfile } = useContracts()
  const { profile, loading: profileLoading } = useUserProfile()
  const { t } = useLanguage()

  const [formData, setFormData] = useState({
    nickname: "",
    username: "",
    bio: "",
    xName: "",
    tgName: "",
    avatarBlobId: "default-avatar.png", // Default avatar
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    state: "idle",
    progress: 0,
  })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setFormData({
        nickname: profile.nickname || "",
        username: profile.username || "",
        bio: profile.bio || "",
        xName: profile.xName || "",
        tgName: profile.tgName || "",
        avatarBlobId: profile.avatarBlobId || "default-avatar.png",
      })
    }
  }, [profile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // 处理头像点击
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // 处理头像选择
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      setUploadError("error.invalid_file_type")
      return
    }

    // 验证文件大小 (最大2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("error.file_too_large")
      return
    }

    setSelectedAvatar(file)
    setUploadError(null)
  }

  // 处理上传头像
  const handleUploadAvatar = async () => {
    if (!selectedAvatar) return

    try {
      setIsUploading(true)
      setUploadProgress(0)
      setUploadError(null)

      // 上传文件到Walrus，使用新的状态回调
      const blobId = await uploadToWalrus(
        selectedAvatar,
        (progress) => {
          setUploadProgress(progress)
        },
        (status) => {
          setUploadStatus(status)
          // 同步进度
          if (status.progress !== undefined) {
            setUploadProgress(status.progress)
          }
        },
        t,
      )

      // 更新表单数据
      setFormData((prev) => ({ ...prev, avatarBlobId: blobId }))

      toast.add({
        title: t("user.avatar.upload.success"),
        description: t("user.avatar.upload.success.description"),
      })
    } catch (error) {
      console.error("上传头像失败:", error)
      setUploadError(error instanceof Error ? error.message : t("error.upload_failed"))

      toast.add({
        title: t("user.avatar.upload.failed"),
        description: error instanceof Error ? error.message : t("error.upload_failed"),
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // 当选择新头像时自动上传
  useEffect(() => {
    if (selectedAvatar && !isUploading) {
      handleUploadAvatar()
    }
  }, [selectedAvatar])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      toast.add({
        title: t("wallet.please.connect"),
        description: t("wallet.need.connect"),
        variant: "destructive",
      })
      return
    }

    if (!userProfile) {
      toast.add({
        title: t("contract.not.loaded"),
        description: t("contract.try.again"),
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const avatarBlobId = formData.avatarBlobId

      // 如果选择了新头像但还没上传完成，等待上传完成
      if (selectedAvatar && isUploading) {
        toast.add({
          title: t("user.avatar.uploading"),
          description: t("user.avatar.wait"),
        })
        return
      }

      await createUserProfile(
        userProfile,
        formData.nickname,
        formData.username,
        formData.bio,
        formData.xName || "", // 如果为空，传空字符串
        formData.tgName || "", // 如果为空，传空字符串
        avatarBlobId,
      )

      toast.add({
        title: t("user.profile.updated"),
        description: t("user.profile.updated.success"),
      })

      router.push("/user")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.add({
        title: t("user.profile.update.failed"),
        description: t("user.profile.update.error"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 重试上传
  const handleRetryUpload = () => {
    if (selectedAvatar) {
      handleUploadAvatar()
    }
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/user" className="inline-flex items-center mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("user.back.to.profile")}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t("user.edit.profile")}</CardTitle>
          <CardDescription>{t("user.edit.profile.description")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nickname">{t("user.nickname")}</Label>
              <Input
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder={t("user.nickname.placeholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">{t("user.username")}</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder={t("user.username.placeholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t("user.bio")}</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder={t("user.bio.placeholder")}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="xName">
                {t("user.twitter")} ({t("optional")})
              </Label>
              <Input
                id="xName"
                name="xName"
                value={formData.xName}
                onChange={handleChange}
                placeholder={t("user.twitter.placeholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tgName">
                {t("user.telegram")} ({t("optional")})
              </Label>
              <Input
                id="tgName"
                name="tgName"
                value={formData.tgName}
                onChange={handleChange}
                placeholder={t("user.telegram.placeholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">{t("user.avatar")}</Label>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
              <div
                className={`border border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors ${
                  uploadError ? "border-destructive" : ""
                }`}
                onClick={!isUploading ? handleAvatarClick : undefined}
              >
                {isUploading ? (
                  <div className="space-y-4">
                    <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-2">{t("user.avatar.uploading")}</p>
                    <Progress value={uploadProgress} className="w-full h-2" />
                    <p className="text-xs text-muted-foreground">
                      {uploadStatus.message || `${uploadProgress.toFixed(0)}%`}
                    </p>
                    {uploadStatus.state === "retrying" && (
                      <div className="flex justify-center mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRetryUpload()
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {t("retry")}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : selectedAvatar ? (
                  <div className="space-y-2">
                    <div className="mx-auto w-24 h-24 rounded-full relative overflow-hidden">
                      <Image
                        src={URL.createObjectURL(selectedAvatar) || "/placeholder.svg"}
                        alt="Avatar preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{t("user.avatar.click.change")}</p>
                  </div>
                ) : profile?.avatarBlobId && profile.avatarBlobId !== "default-avatar.png" ? (
                  <div className="space-y-2">
                    <div className="mx-auto w-24 h-24 rounded-full relative overflow-hidden">
                      <Image
                        src={`${AGGREGATOR_URL}${profile.avatarBlobId}`}
                        alt="Current avatar"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{t("user.avatar.click.change")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">{t("user.avatar.upload")}</p>
                    <p className="text-xs text-muted-foreground">{t("user.avatar.description")}</p>
                  </div>
                )}
              </div>
              {uploadError && (
                <div className="flex items-center text-destructive text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {uploadError}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push("/user")}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("user.save.changes")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
