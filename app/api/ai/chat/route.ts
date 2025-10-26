import { NextRequest, NextResponse } from 'next/server'
import { aiService, type AIRequest } from '@/lib/ai-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body: AIRequest = await request.json()

    // Validate request
    if (!body.model || !body.messages || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: model and messages are required' },
        { status: 400 }
      )
    }

    // Call AI service
    const response = await aiService.chat(body)

    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: 500 }
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('API Route Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
