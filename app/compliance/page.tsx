"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"

interface ComplianceResult {
  localCheck: {
    isCompliant: boolean
    bannedWords: string[]
  }
  aiReview: {
    isCompliant: boolean
    suggestions: string[]
  }
}

export default function CompliancePage() {
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComplianceResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/compliance/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      })

      if (!response.ok) {
        throw new Error("Failed to check compliance")
      }

      const data = await response.json()
      setResult(data)
      toast.success("合规检测完成！")
    } catch (error) {
      console.error("Error checking compliance:", error)
      toast.error("合规检测失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  // 高亮违禁词的函数
  const highlightBannedWords = (text: string, bannedWords: string[]) => {
    if (bannedWords.length === 0) return text

    let highlightedText = text
    bannedWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'g')
      highlightedText = highlightedText.replace(regex, '<span class="bg-red-200 text-red-800 px-1 rounded">$1</span>')
    })

    return highlightedText
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">发布合规检测</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>输入文案</CardTitle>
            <CardDescription>粘贴您的小红书文案进行合规检测</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="请输入您的小红书文案..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                className="min-h-[300px]"
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "检测中..." : "开始检测"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>检测报告</CardTitle>
              <CardDescription>合规性分析结果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 本地规则检测 */}
              <div>
                <h3 className="font-semibold mb-2">本地规则检测</h3>
                {result.localCheck.isCompliant ? (
                  <p className="text-green-600">✅ 文案符合本地规则</p>
                ) : (
                  <div>
                    <p className="text-red-600">❌ 发现违禁词</p>
                    <div className="mt-2 p-3 bg-red-50 rounded">
                      <p className="text-sm font-medium">违禁词列表:</p>
                      <ul className="list-disc list-inside mt-1">
                        {result.localCheck.bannedWords.map((word, index) => (
                          <li key={index} className="text-sm">{word}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 p-3 bg-white border rounded">
                      <p className="text-sm font-medium">高亮显示违禁词:</p>
                      <div 
                        className="mt-2 text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightBannedWords(inputText, result.localCheck.bannedWords) 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* AI语义审核 */}
              <div>
                <h3 className="font-semibold mb-2">AI语义审核</h3>
                {result.aiReview.isCompliant ? (
                  <p className="text-green-600">✅ AI审核通过</p>
                ) : (
                  <p className="text-yellow-600">⚠️ AI建议修改</p>
                )}
                <div className="mt-2 p-3 bg-yellow-50 rounded">
                  <p className="text-sm font-medium">AI建议:</p>
                  <ul className="list-disc list-inside mt-1">
                    {result.aiReview.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm">{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 总体结论 */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">总体结论</h3>
                {result.localCheck.isCompliant && result.aiReview.isCompliant ? (
                  <p className="text-green-600 font-medium">🎉 文案完全合规，可以安全发布！</p>
                ) : (
                  <p className="text-red-600 font-medium">⚠️ 文案存在合规风险，建议修改后再发布</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}