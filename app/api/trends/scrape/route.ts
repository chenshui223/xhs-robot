import { NextResponse } from 'next/server'
import { scrapeTrends } from '@/lib/actions'

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json()
    
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
    }

    const result = await scrapeTrends(keyword)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in trend scraping API:', error)
    return NextResponse.json({ error: 'Failed to scrape trends' }, { status: 500 })
  }
}