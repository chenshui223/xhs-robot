import { NextResponse } from 'next/server'
import BrowserManager from '@/lib/browser-service'

export async function GET() {
  const browserManager = BrowserManager.getInstance()
  const isRunning = browserManager.isRunning()
  
  return NextResponse.json({ 
    status: isRunning ? 'running' : 'stopped',
    isRunning 
  })
}