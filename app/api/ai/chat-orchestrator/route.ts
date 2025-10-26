/**
 * AI Chat Orchestrator API Route - Client-Side Execution Version
 *
 * This Next.js API route exposes the AI Chat Orchestrator functionality via HTTP.
 * It calls Claude Vision API to get tool recommendations but DOES NOT execute them.
 * Tool execution happens client-side in the browser where Canvas API is native.
 *
 * Endpoint: POST /api/ai/chat-orchestrator
 *
 * Request body:
 * - message: string - User's message
 * - imageUrl: string - URL to the uploaded image
 * - attachedImageUrl?: string - Optional second image (for reference or dual-image workflows)
 * - conversationId: string - Session ID for conversation tracking
 * - conversationHistory?: Array<{role, content, timestamp}> - Previous messages
 * - userContext?: {industry, expertise, preferences} - User context
 *
 * Response:
 * - success: boolean - Whether request succeeded
 * - message: string - Claude's response
 * - toolCalls: Array - Tool calls to execute (NOT executed)
 * - imageAnalysis: object - Ground truth analysis
 * - confidence: number - Overall confidence score
 * - conversationId: string - Conversation ID
 * - timestamp: number - Response timestamp
 *
 * @module api/ai/chat-orchestrator
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getClaudeToolCalls,
  type OrchestratorRequest,
  type ConversationMessage,
  isOrchestratorReady,
} from '@/lib/ai-chat-orchestrator'

// Use Node.js runtime for server processing
export const runtime = 'nodejs'

// Allow 60 seconds for processing
export const maxDuration = 60

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic'

/**
 * Health check endpoint
 * GET /api/ai/chat-orchestrator
 *
 * Returns service status and feature information
 */
export async function GET() {
  try {
    const isReady = isOrchestratorReady()

    return NextResponse.json({
      status: isReady ? 'healthy' : 'not_configured',
      version: '2.0.0', // Version 2: Client-side execution
      features: [
        'vision-analysis',
        'function-calling',
        'parameter-validation',
        'client-side-execution', // NEW: Tools execute client-side
        'confidence-scoring',
        'learning-system',
      ],
      executionModel: 'client-side', // NEW: Indicates client-side execution
      ready: isReady,
      message: isReady
        ? 'AI Chat Orchestrator is ready (client-side execution mode)'
        : 'ANTHROPIC_API_KEY not configured',
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('[API] Health check error:', error)

    return NextResponse.json(
      {
        status: 'error',
        version: '2.0.0',
        ready: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: Date.now(),
      },
      { status: 500 }
    )
  }
}

/**
 * Main orchestrator endpoint (client-side execution version)
 * POST /api/ai/chat-orchestrator
 *
 * Gets tool recommendations from Claude but DOES NOT execute them
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ===== STEP 1: Parse and validate request =====
    let body: any

    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[API] Failed to parse request body:', parseError)

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          message: 'Please provide valid JSON data.',
          timestamp: Date.now(),
        },
        { status: 400 }
      )
    }

    // Validate required fields
    const missingFields: string[] = []

    if (!body.message) missingFields.push('message')
    if (!body.imageUrl) missingFields.push('imageUrl')
    if (!body.conversationId) missingFields.push('conversationId')

    if (missingFields.length > 0) {
      console.warn('[API] Missing required fields:', missingFields)

      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          message: 'Please provide all required fields.',
          timestamp: Date.now(),
        },
        { status: 400 }
      )
    }

    // ===== STEP 2: Validate image URL =====
    const imageUrl = body.imageUrl

    // Check if image URL is from allowed origins
    const allowedOrigins = [
      'blob:', // Local blob URLs
      'data:', // Data URLs
      'http://localhost', // Local development
      'https://localhost', // Local development with HTTPS
    ]

    const isAllowedOrigin = allowedOrigins.some(origin =>
      imageUrl.startsWith(origin)
    )

    // Also allow production domains from environment
    const productionDomain = process.env["NEXT_PUBLIC_APP_URL"]
    const isProductionOrigin = productionDomain && imageUrl.startsWith(productionDomain)

    if (!isAllowedOrigin && !isProductionOrigin) {
      console.warn('[API] Invalid image URL origin:', imageUrl.substring(0, 50))

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid image URL origin',
          message: 'Please upload an image using the editor.',
          timestamp: Date.now(),
        },
        { status: 400 }
      )
    }

    // ===== STEP 3: Validate conversation history format =====
    if (body.conversationHistory && Array.isArray(body.conversationHistory)) {
      // Ensure conversation history has proper format
      const validHistory = body.conversationHistory.every((msg: any) =>
        msg.role &&
        (msg.role === 'user' || msg.role === 'assistant') &&
        typeof msg.content === 'string'
      )

      if (!validHistory) {
        console.warn('[API] Invalid conversation history format')

        return NextResponse.json(
          {
            success: false,
            error: 'Invalid conversation history format',
            message: 'Conversation history must contain messages with role and content.',
            timestamp: Date.now(),
          },
          { status: 400 }
        )
      }
    }

    // ===== STEP 4: Check API key configuration =====
    if (!isOrchestratorReady()) {
      console.error('[API] ANTHROPIC_API_KEY not configured')

      return NextResponse.json(
        {
          success: false,
          error: 'AI service not configured',
          message: 'The AI service is not properly configured. Please contact support.',
          timestamp: Date.now(),
        },
        { status: 503 }
      )
    }

    // ===== STEP 5: Build orchestrator request =====
    const orchestratorRequest: OrchestratorRequest = {
      message: body.message,
      imageUrl: body.imageUrl,
      attachedImageUrl: body.attachedImageUrl, // Optional second image
      previewResultUrl: body.previewResultUrl, // Optional preview result from chat
      conversationId: body.conversationId,
      conversationHistory: body.conversationHistory as ConversationMessage[],
      editingHistory: body.editingHistory, // Full editing history from History Panel
      userContext: body.userContext,
    }

    console.log('[API] Processing orchestrator request (client-side mode):', {
      conversationId: orchestratorRequest.conversationId,
      messageLength: orchestratorRequest.message.length,
      hasHistory: !!orchestratorRequest.conversationHistory?.length,
      hasContext: !!orchestratorRequest.userContext,
    })

    // ===== STEP 6: Get tool calls from Claude (WITHOUT executing) =====
    console.log('[API] Getting tool recommendations from Claude...')

    const result = await getClaudeToolCalls(orchestratorRequest)

    const processingTime = Date.now() - startTime

    console.log('[API] Claude response received:', {
      success: true,
      toolCalls: result.functionCalls.length,
      hasAnalysis: !!result.imageAnalysis,
      processingTimeMs: processingTime,
    })

    // ===== STEP 7: Return tool calls for client-side execution =====
    // Include clarification data if needed
    const response: any = {
      success: true,
      message: result.textResponse,
      toolCalls: result.functionCalls, // Return raw tool calls WITHOUT execution
      imageAnalysis: result.imageAnalysis, // Ground truth for client validation
      confidence: result.imageAnalysis?.confidence || 85, // Base confidence from analysis
      conversationId: orchestratorRequest.conversationId,
      timestamp: Date.now(),
      processingTimeMs: processingTime,
      executionModel: 'client-side', // Indicate client-side execution
    };

    // Add clarification data if present
    if (result.clarification) {
      response.clarification = result.clarification;
      console.log('[API] Including clarification in response:', {
        needsClarification: result.clarification.needsClarification,
        steps: result.clarification.parsedSteps.length,
        warnings: result.clarification.printWarnings.length,
        hasSuggestion: !!result.clarification.suggestedWorkflow,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    // Unexpected error occurred
    const processingTime = Date.now() - startTime

    console.error('[API] Unexpected error in chat orchestrator:', error)

    // Check for specific error types
    let statusCode = 500
    let errorMessage = 'Internal server error'
    let userMessage = 'I encountered an unexpected error. Please try again.'

    if (error instanceof Error) {
      // Parse error message for specific cases
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        statusCode = 503
        errorMessage = 'AI service not configured'
        userMessage = 'The AI service is not properly configured.'
      } else if (error.message.includes('rate limit')) {
        statusCode = 429
        errorMessage = 'Rate limit exceeded'
        userMessage = 'Too many requests. Please wait a moment and try again.'
      } else if (error.message.includes('timeout')) {
        statusCode = 504
        errorMessage = 'Request timeout'
        userMessage = 'The request took too long. Please try a simpler operation.'
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: userMessage,
        conversationId: (request as any).body?.conversationId || 'unknown',
        timestamp: Date.now(),
        processingTimeMs: processingTime,
      },
      { status: statusCode }
    )
  }
}

/**
 * OPTIONS endpoint for CORS preflight
 * OPTIONS /api/ai/chat-orchestrator
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}