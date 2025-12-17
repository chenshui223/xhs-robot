import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import BrowserManager from '@/lib/browser-service'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { cookie } = await request.json()

    const account = await prisma.account.findUnique({
      where: { id: parseInt(params.id) }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const browserManager = BrowserManager.getInstance()

    if (cookie) {
      await browserManager.saveCookies(account.id.toString())
    }

    const updatedAccount = await prisma.account.update({
      where: { id: parseInt(params.id) },
      data: {
        status: 'verified',
        ...(cookie && { cookie })
      }
    })

    return NextResponse.json({ 
      account: updatedAccount,
      message: 'Account verified successfully'
    })
  } catch (error) {
    console.error('Error verifying account:', error)
    return NextResponse.json({ error: 'Failed to verify account' }, { status: 500 })
  }
}
