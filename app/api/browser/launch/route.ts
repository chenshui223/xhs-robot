import { NextResponse } from 'next/server'
import BrowserManager from '@/lib/browser-service'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const browserManager = BrowserManager.getInstance()
    
    if (browserManager.isRunning()) {
      await browserManager.close()
    }

    await browserManager.launchBrowserWithUserDataDir()
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const isLoggedIn = await browserManager.checkLoginStatus()
    
    if (isLoggedIn) {
      const pendingAccounts = await prisma.account.findMany({
        where: { status: 'pending' }
      })
      
      for (const account of pendingAccounts) {
        await prisma.account.update({
          where: { id: account.id },
          data: { status: 'verified' }
        })
      }
    }
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Browser launched successfully',
      isRunning: browserManager.isRunning(),
      isLoggedIn
    })
  } catch (error) {
    console.error('Error launching browser:', error)
    return NextResponse.json({ 
      status: 'error',
      error: String(error)
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const browserManager = BrowserManager.getInstance()
    await browserManager.close()
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Browser closed successfully'
    })
  } catch (error) {
    console.error('Error closing browser:', error)
    return NextResponse.json({ 
      status: 'error',
      error: String(error)
    }, { status: 500 })
  }
}