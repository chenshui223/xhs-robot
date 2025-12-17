"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"

export function LaunchBrowserButton() {
  const [loading, setLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const handleLaunch = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/browser/launch", {
        method: "POST"
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to launch browser")
      }

      setIsRunning(true)
      toast.success("浏览器已启动")
    } catch (error) {
      console.error("Error launching browser:", error)
      toast.error(String(error))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/browser/launch", {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to close browser")
      }

      setIsRunning(false)
      toast.success("浏览器已关闭")
    } catch (error) {
      console.error("Error closing browser:", error)
      toast.error(String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button 
        className="w-full" 
        onClick={handleLaunch}
        disabled={loading || isRunning}
        variant={isRunning ? "secondary" : "default"}
      >
        {loading ? "处理中..." : isRunning ? "浏览器运行中" : "启动浏览器"}
      </Button>
      {isRunning && (
        <>
          <div className="text-xs text-muted-foreground p-2 bg-blue-50 rounded">
            浏览器已启动，请在浏览器中登录小红书账号，完成登录后点击「账号管理」页面的「验证账号」按钮。
          </div>
          <Button 
            className="w-full" 
            variant="destructive"
            onClick={handleClose}
            disabled={loading}
          >
            关闭浏览器
          </Button>
        </>
      )}
      <Button className="w-full" variant="outline" disabled>热点监控</Button>
      <Button className="w-full" variant="outline" disabled>合规检测</Button>
    </>
  )
}
