import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "小红书robot - XiaoHongShu Robot",
  description: "小红书自动化管理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={"font-sans antialiased"}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
