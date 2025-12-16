"use client"

import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import Link from "next/link"

export function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      <Button
        size="icon"
        variant="outline"
        className="shrink-0 md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation menu</span>
      </Button>
      <div className="w-full flex-1">
        <h1 className="text-xl font-bold">小飞薯 Dashboard</h1>
      </div>
      <Link href="/settings">
        <Button variant="ghost">设置</Button>
      </Link>
    </header>
  )
}