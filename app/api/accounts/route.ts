import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        username: true,
        status: true,
        createdAt: true
      }
    })

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Valid username is required' }, { status: 400 })
    }

    const existingAccount = await prisma.account.findUnique({
      where: { username }
    })

    if (existingAccount) {
      return NextResponse.json({ error: 'Account already exists' }, { status: 400 })
    }

    const account = await prisma.account.create({
      data: {
        username,
        status: 'pending'
      }
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
