"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useState } from "react"
import { toast } from "sonner"

interface Account {
  id: number
  username: string
  status: string
  createdAt: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([
    { id: 1, username: "user123", status: "active", createdAt: "2024-01-15" },
    { id: 2, username: "beauty_lover", status: "active", createdAt: "2024-02-20" },
    { id: 3, username: "travel_diary", status: "inactive", createdAt: "2024-03-10" },
  ])
  
  const [newUsername, setNewUsername] = useState("")
  const [addingAccount, setAddingAccount] = useState(false)

  const handleAddAccount = async () => {
    if (!newUsername.trim()) return
    
    setAddingAccount(true)
    try {
      // 这里应该调用API添加账号
      const newAccount: Account = {
        id: accounts.length + 1,
        username: newUsername,
        status: "pending",
        createdAt: new Date().toISOString().split('T')[0]
      }
      
      setAccounts([...accounts, newAccount])
      setNewUsername("")
      toast.success("账号添加成功！请在浏览器中完成登录")
    } catch (error) {
      console.error("Error adding account:", error)
      toast.error("添加账号失败")
    } finally {
      setAddingAccount(false)
    }
  }

  const handleRemoveAccount = (id: number) => {
    setAccounts(accounts.filter(account => account.id !== id))
    toast.success("账号已移除")
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
                        : account.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {account.status === 'active' ? '活跃' : 
                       account.status === 'pending' ? '待验证' : '失效'}
                    </span>
                  </TableCell>
                  <TableCell>{account.createdAt}</TableCell>
                  <TableCell className="text-right">
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
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}