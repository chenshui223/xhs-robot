"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface TrendResult {
  title: string
  likes: number
  url: string
  pageTitle?: string
  comments?: string[]
}

interface WordCount {
  [key: string]: number
}

export default function TrendsPage() {
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [generatingPost, setGeneratingPost] = useState(false)
  const [publishingPost, setPublishingPost] = useState(false)
  const [results, setResults] = useState<TrendResult[]>([])
  const [topWords, setTopWords] = useState<{ word: string; count: number }[]>([])
  const [generatedPost, setGeneratedPost] = useState<{ id: number; content: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/trends/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword }),
      })

      if (!response.ok) {
        throw new Error("Failed to scrape trends")
      }

      const data = await response.json()
      setResults(data.results)
      setTopWords(data.topWords.map(([word, count]: [string, number]) => ({ word, count })))
      setGeneratedPost(null)
      toast.success("热点抓取成功！")
    } catch (error) {
      console.error("Error scraping trends:", error)
      toast.error("热点抓取失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePost = async () => {
    if (!keyword.trim() || results.length === 0) {
      toast.error("请先抓取热点数据")
      return
    }

    setGeneratingPost(true)
    try {
      const response = await fetch("/api/trends/generate-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to generate post")
      }

      const data = await response.json()
      setGeneratedPost({ id: data.id, content: data.content })
      toast.success("帖子生成成功！")
    } catch (error) {
      console.error("Error generating post:", error)
      toast.error(String(error) || "帖子生成失败，请重试")
    } finally {
      setGeneratingPost(false)
    }
  }

  const handlePublishPost = async () => {
    if (!generatedPost) {
      toast.error("请先生成帖子")
      return
    }

    setPublishingPost(true)
    try {
      const response = await fetch("/api/trends/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          postId: generatedPost.id,
          content: generatedPost.content 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to publish post")
      }

      const data = await response.json()
      if (data.success) {
        toast.success("帖子已发布到小红书！")
        setGeneratedPost(null)
      } else {
        toast.error(data.message || "发布失败，请检查小红书")
      }
    } catch (error) {
      console.error("Error publishing post:", error)
      toast.error(String(error) || "发布失败，请重试")
    } finally {
      setPublishingPost(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">热点监控</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>搜索热点关键词</CardTitle>
          <CardDescription>输入关键词，抓取小红书热门笔记和评论</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
            💡 提示：请先在「概览」页面点击「启动浏览器」并完成小红书账号登录，然后才能使用热点监控功能。浏览器保持登录状态会自动重复使用。
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="输入关键词，例如：美妆、旅行、美食"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={loading || generatingPost}
            />
            <Button type="submit" disabled={loading || generatingPost}>
              {loading ? "抓取中..." : "抓取热点"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {topWords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>热词分析</CardTitle>
            <CardDescription>Top 10 热门词汇统计</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topWords}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="word" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePost} 
              disabled={generatingPost || !keyword.trim()}
              variant="default"
            >
              {generatingPost ? "生成中..." : "生成讨论帖"}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>热门笔记列表</CardTitle>
              <CardDescription>抓取到的热门笔记详情（包含评论统计）</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{result.title}</h3>
                      <span className="text-sm text-muted-foreground">{result.likes} 赞</span>
                    </div>
                    {result.pageTitle && (
                      <p className="text-xs text-gray-500 my-1">页面标题: {result.pageTitle}</p>
                    )}
                    {result.comments && result.comments.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p className="font-semibold mb-1">热点评论摘要 ({result.comments.length} 条):</p>
                        <div className="bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                          {result.comments.slice(0, 3).map((comment, i) => (
                            <p key={i} className="mb-1 line-clamp-2">{comment}</p>
                          ))}
                          {result.comments.length > 3 && (
                            <p className="text-gray-500 italic">... 及其他 {result.comments.length - 3} 条评论</p>
                          )}
                        </div>
                      </div>
                    )}
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline inline-block mt-2"
                    >
                      查看原文
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {generatedPost && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">生成的讨论帖</CardTitle>
            <CardDescription>基于热点评论和热词生成的帖子内容</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded border border-green-200 whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
              {generatedPost.content}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedPost.content)
                  toast.success("已复制到剪贴板")
                }}
                variant="outline"
              >
                复制内容
              </Button>
              <Button 
                onClick={handlePublishPost}
                disabled={publishingPost}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishingPost ? "发布中..." : "发布到小红书"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}