import { NextResponse } from 'next/server'
import { generateComment } from '@/lib/actions'

export async function POST(request: Request) {
  try {
    const { noteText } = await request.json()
    
    if (!noteText) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 })
    }

    const comment = await generateComment(noteText)
    return NextResponse.json({ comment })
  } catch (error) {
    console.error('Error in comment generation API:', error)
    return NextResponse.json({ error: 'Failed to generate comment' }, { status: 500 })
  }
}