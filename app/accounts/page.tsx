"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface Account {
  id: number
  username: string
  status: string
  createdAt: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [newUsername, setNewUsername] = useState("")
  const [loading, setLoading] = useState(true)
  const [addingAccount, setAddingAccount] = useState(false)
  const [verifyingId, setVerifyingId] = useState<number | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      if (!response.ok) throw new Error("Failed to fetch accounts")
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error("Error fetching accounts:", error)
      toast.error("加载账号失败")
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async () => {
    if (!newUsername.trim()) return
    
    setAddingAccount(true)
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add account")
      }

      const data = await response.json()
      setAccounts([...accounts, data.account])
      setNewUsername("")
      toast.success("账号添加成功！请在浏览器中完成登录")
    } catch (error) {
      console.error("Error adding account:", error)
      toast.error(String(error))
    } finally {
      setAddingAccount(false)
    }
  }

  const handleRemoveAccount = async (id: number) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE"
      })

      if (!response.ok) throw new Error("Failed to remove account")

      setAccounts(accounts.filter(account => account.id !== id))
      toast.success("账号已移除")
    } catch (error) {
      console.error("Error removing account:", error)
      toast.error("移除账号失败")
    }
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error("Failed to update account")

      const updated = await response.json()
      setAccounts(accounts.map(a => a.id === id ? updated.account : a))
      toast.success("账号状态已更新")
    } catch (error) {
      console.error("Error updating account:", error)
      toast.error("更新账号失败")
    }
  }

  const handleVerifyAccount = async (id: number) => {
    setVerifyingId(id)
    try {
      const response = await fetch(`/api/accounts/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie: true })
      })

      if (!response.ok) throw new Error("Failed to verify account")

      const data = await response.json()
      setAccounts(accounts.map(a => a.id === id ? data.account : a))
      toast.success("账号已验证！")
    } catch (error) {
      console.error("Error verifying account:", error)
      toast.error("验证账号失败，请确保已完成浏览器登录")
    } finally {
      setVerifyingId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">账号管理</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>添加新账号</CardTitle>
          <CardDescription>输入小红书用户名，系统将自动配置账号</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="输入小红书用户名"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            disabled={addingAccount}
          />
          <Button onClick={handleAddAccount} disabled={addingAccount}>
            {addingAccount ? "添加中..." : "添加账号"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>已配置账号</CardTitle>
          <CardDescription>管理您的小红书账号列表</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无账号</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.username}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        account.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : account.status === 'verified'
                          ? 'bg-blue-100 text-blue-800'
                          : account.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {account.status === 'active' ? '活跃' : 
                         account.status === 'verified' ? '已验证' :
                         account.status === 'pending' ? '待验证' : '失效'}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(account.createdAt).toLocaleDateString('zh-CN')}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {account.status === 'pending' && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleVerifyAccount(account.id)}
                          disabled={verifyingId === account.id}
                        >
                          {verifyingId === account.id ? "验证中..." : "验证账号"}
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRemoveAccount(account.id)}
                      >
                        移除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}