"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useContracts } from "@/hooks/use-contracts"
import { useWallet } from "@/hooks/use-wallet"
import { commentOnSpace, getSpaceComments } from "@/services/space-service"
import { uploadJsonData } from "@/services/upload-service"
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react"
import { useEffect, useState } from "react"

interface Reply {
  id: number
  user: string
  avatar: string
  content: string
  likes: number
  dislikes: number
  time: string
}

interface Comment {
  id: number
  user: string
  avatar: string
  content: string
  likes: number
  dislikes: number
  time: string
  replies: Reply[]
  timestamp?: number
}

// 假评论数据
const MOCK_COMMENTS: Comment[] = [
  {
    id: 1,
    user: "网友A",
    avatar: "/avatar-1.png",
    content: "哈哈哈，马保国真是太有意思了，这个空间太搞笑了！",
    likes: 42,
    dislikes: 3,
    time: "2小时前",
    replies: [
      {
        id: 101,
        user: "网友B",
        avatar: "/avatar-2.png",
        content: '确实，我最喜欢"耗子尾汁"那段了，经典啊！',
        likes: 15,
        dislikes: 1,
        time: "1小时前",
      },
    ],
  },
  {
    id: 2,
    user: "网友C",
    avatar: "/avatar-3.png",
    content: "马老师的太极拳确实有点东西，就是不讲武德了点。",
    likes: 28,
    dislikes: 5,
    time: "3小时前",
    replies: [],
  },
  {
    id: 3,
    user: "网友D",
    avatar: "/abstract-geometric-avatar.png",
    content: "闪电五连鞭，接化发，一气呵成！",
    likes: 36,
    dislikes: 2,
    time: "5小时前",
    replies: [
      {
        id: 301,
        user: "网友E",
        avatar: "/abstract-user-icon.png",
        content: "很快啊，但是被王庆民一拳KO了，哈哈哈！",
        likes: 20,
        dislikes: 0,
        time: "4小时前",
      },
      {
        id: 302,
        user: "网友F",
        avatar: "/abstract-user-profile.png",
        content: "我有点闪，他很快，我有点懵",
        likes: 18,
        dislikes: 1,
        time: "3小时前",
      },
    ],
  },
  {
    id: 4,
    user: "网友G",
    avatar: "/abstract-geometric-avatar.png",
    content: "这个空间的内容太丰富了，希望能看到更多马保国的meme！",
    likes: 15,
    dislikes: 2,
    time: "6小时前",
    replies: [],
  },
  {
    id: 5,
    user: "网友H",
    avatar: "/abstract-user-icon-8.png",
    content: "我已经收藏了这个空间，太有意思了！",
    likes: 10,
    dislikes: 0,
    time: "8小时前",
    replies: [],
  },
]

export function SpaceComments({ spaceId }: { spaceId: number }) {
  const { space } = useContracts()
  const { isConnected, address } = useWallet()
  const { toast } = useToast()
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [useRealData, setUseRealData] = useState(false)

  // 加载评论数据
  useEffect(() => {
    async function loadComments() {
      if (!space) {
        setIsLoading(false)
        setComments(MOCK_COMMENTS)
        return
      }

      try {
        setIsLoading(true)
        setLoadError(null)

        // 从区块链获取评论数据
        console.log(`尝试从链上获取评论，spaceId: ${spaceId}`)
        const chainComments = await getSpaceComments(space, spaceId)
        console.log("从链上获取的评论:", chainComments)

        // 如果链上有评论数据，则使用链上数据
        if (chainComments && chainComments.length > 0) {
          setComments(chainComments)
          setUseRealData(true)
          console.log("使用链上评论数据")
        } else {
          // 否则使用假数据
          setComments(MOCK_COMMENTS)
          setUseRealData(false)
          console.log("使用假评论数据")
        }
      } catch (error) {
        console.error("加载评论失败:", error)
        setLoadError(`加载评论失败: ${error instanceof Error ? error.message : '未知错误'}`)
        // 出错时使用假数据
        setComments(MOCK_COMMENTS)
        setUseRealData(false)
        
        // 显示错误通知
        toast({
          title: "评论加载失败",
          description: "无法从区块链获取评论数据，使用默认数据",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadComments()
  }, [space, spaceId, toast])

  // 处理评论提交
  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast({
        title: "评论不能为空",
        description: "请输入评论内容",
        variant: "destructive",
      })
      return
    }

    if (!space || !isConnected) {
      toast({
        title: "无法评论",
        description: "请确保钱包已连接",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // 准备评论数据
      const commentData = {
        content: commentText,
        timestamp: Date.now(),
        author: address || "未知用户",
      }

      // 上传评论数据到Walrus
      const blobId = await uploadJsonData(commentData)
      console.log("评论已上传到Walrus，blobId:", blobId)

      // 调用合约发表评论
      await commentOnSpace(space, spaceId, blobId)

      // 添加评论到本地状态
      const newComment: Comment = {
        id: Date.now(),
        user: address || "未知用户",
        avatar: "/abstract-user-icon.png",
        content: commentText,
        likes: 0,
        dislikes: 0,
        time: "刚刚",
        replies: [],
        timestamp: Date.now(),
      }

      // 如果之前使用的是真实数据，则添加到真实数据中
      // 如果之前使用的是假数据，则切换到只有这一条评论的真实数据
      if (useRealData) {
        setComments([newComment, ...comments])
      } else {
        setComments([newComment])
        setUseRealData(true)
      }

      setCommentText("")

      toast({
        title: "评论成功",
        description: "您的评论已发布",
        variant: "default",
      })
    } catch (error) {
      console.error("评论失败:", error)
      toast({
        title: "评论失败",
        description: error instanceof Error ? error.message : "请确保钱包已连接并有足够的ETH",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 格式化钱包地址显示
  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return address
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-bold">发表评论</h3>
        <div className="flex gap-4">
          <Avatar>
            <AvatarImage src="/abstract-user-icon.png" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="写下你的评论..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmitComment} disabled={isSubmitting || !commentText.trim() || !isConnected}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    发布中...
                  </>
                ) : (
                  "发布评论"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">加载评论中...</span>
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-4">
              <div className="flex gap-4">
                <Avatar>
                  <AvatarImage src={comment.avatar || "/placeholder.svg"} alt={comment.user} />
                  <AvatarFallback>{comment.user[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => {
                        window.location.href = "/user"
                      }}
                      className="font-medium hover:text-primary cursor-pointer"
                    >
                      {comment.user.startsWith("0x") ? formatAddress(comment.user) : comment.user}
                    </div>
                    <div className="text-sm text-muted-foreground">{comment.time}</div>
                  </div>
                  <p className={`mt-1 ${comment.content?.includes('可能已被删除') ? 'text-muted-foreground italic' : ''}`}>
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8 px-2">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{comment.likes}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8 px-2">
                      <ThumbsDown className="h-4 w-4" />
                      <span>{comment.dislikes}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      回复
                    </Button>
                  </div>
                </div>
              </div>

              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-12 space-y-4 pl-4 border-l">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={reply.avatar || "/placeholder.svg"} alt={reply.user} />
                        <AvatarFallback>{reply.user[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div
                            onClick={() => {
                              window.location.href = "/user"
                            }}
                            className="font-medium hover:text-primary cursor-pointer"
                          >
                            {reply.user}
                          </div>
                          <div className="text-sm text-muted-foreground">{reply.time}</div>
                        </div>
                        <p className="mt-1">{reply.content}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8 px-2">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{reply.likes}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8 px-2">
                            <ThumbsDown className="h-4 w-4" />
                            <span>{reply.dislikes}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            回复
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">暂无评论，快来发表第一条评论吧！</div>
        )}

        {loadError && (
          <div className="text-center text-sm text-red-500 mb-4">{loadError}</div>
        )}

        {/* 数据来源提示 */}
        <div className="text-center text-xs text-muted-foreground mt-4">
          {useRealData ? "显示链上真实评论数据" : "显示示例评论数据"}
        </div>
      </div>
    </div>
  )
}
