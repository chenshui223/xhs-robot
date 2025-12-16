import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 测试数据库连接
    await prisma.$connect()
    await prisma.$disconnect()
    return NextResponse.json({ status: 'connected' })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
  }
}