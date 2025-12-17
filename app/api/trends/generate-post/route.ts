import { NextResponse } from 'next/server'
import { generatePost } from '@/lib/actions'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json()
    
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
    }

    const trendData = await prisma.trendData.findMany({
      where: { keyword },
      orderBy: { scrapedAt: 'desc' },
      take: 100
    })

    if (trendData.length === 0) {
      return NextResponse.json({ 
        error: 'No trend data found for this keyword. Please scrape trends first.' 
      }, { status: 404 })
    }

    const allComments: string[] = []
    const wordCount: Record<string, number> = {}

    trendData.forEach(trend => {
      if (trend.comments) {
        try {
          const comments = JSON.parse(trend.comments)
          allComments.push(...comments)
        } catch (e) {
          console.warn('Failed to parse comments:', e)
        }
      }
    })

    const uniqueComments = Array.from(new Set(allComments)).slice(0, 100)

    trendData.forEach(trend => {
      const words = trend.title.split('')
      words.forEach(word => {
        if (word.length > 1) {
          wordCount[word] = (wordCount[word] || 0) + 1
        }
      })
    })

    const topWords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    const result = await generatePost(keyword, uniqueComments, topWords)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in post generation API:', error)
    return NextResponse.json({ 
      error: 'Failed to generate post',
      details: String(error)
    }, { status: 500 })
  }
}
