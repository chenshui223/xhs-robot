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
}

interface WordCount {
  [key: string]: number
}

export default function TrendsPage() {
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TrendResult[]>([])
  const [topWords, setTopWords] = useState<{ word: string; count: number }[]>([])

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
      toast.success("热点抓取成功！")
    } catch (error) {
      console.error("Error scraping trends:", error)
      toast.error("热点抓取失败，请重试")
    } finally {
      setLoading(false)
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
          <CardDescription>输入关键词，抓取小红书热门笔记</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="输入关键词，例如：美妆、旅行、美食"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" disabled={loading}>
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
        <Card>
          <CardHeader>
            <CardTitle>热门笔记列表</CardTitle>
            <CardDescription>抓取到的热门笔记详情</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{result.title}</h3>
                    <span className="text-sm text-muted-foreground">{result.likes} 赞</span>
                  </div>
                  <a 
                    href={result.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    查看原文
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}