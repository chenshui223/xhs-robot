import { NextResponse } from 'next/server'
import { checkCompliance } from '@/lib/actions'

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const result = await checkCompliance(text)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in compliance check API:', error)
    return NextResponse.json({ error: 'Failed to check compliance' }, { status: 500 })
  }
}