import { NextResponse } from 'next/server'
import { publishPostToXHS } from '@/lib/actions'

export async function POST(request: Request) {
  try {
    const { postId, content } = await request.json()
    
    if (!postId || !content) {
      return NextResponse.json({ 
        error: 'postId and content are required' 
      }, { status: 400 })
    }

    const result = await publishPostToXHS(postId, content)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in publish API:', error)
    return NextResponse.json({ 
      error: '发布失败',
      details: String(error)
    }, { status: 500 })
  }
}
