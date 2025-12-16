import { NextResponse } from 'next/server'
import BrowserManager from '@/lib/browser-service'

export async function POST() {
  try {
    const browserManager = BrowserManager.getInstance()
    await browserManager.launchBrowser()
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Browser launched successfully'
    })
  } catch (error) {
    console.error('Failed to launch browser:', error)
    return NextResponse.json({ 
      status: 'error',
      message: 'Failed to launch browser'
    }, { status: 500 })
  }
}