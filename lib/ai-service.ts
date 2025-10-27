import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'

export type AIModel = 'claude-sonnet-4.5' | 'gemini-2.5-pro'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIRequest {
  model: AIModel
  messages: ChatMessage[]
  imageData?: string // base64 encoded image
  maxTokens?: number
}

export interface AIResponse {
  content: string
  model: AIModel
  error?: string
}

class AIService {
  private anthropic: Anthropic | null = null
  private googleAI: GoogleGenAI | null = null

  constructor() {
    // Initialize Anthropic if API key exists
    if (process.env["ANTHROPIC_API_KEY"]) {
      this.anthropic = new Anthropic({
        apiKey: process.env["ANTHROPIC_API_KEY"],
      })
    }

    // Initialize Google AI if API key exists
    if (process.env["GEMINI_API_KEY"] || process.env["GOOGLE_GENERATIVE_AI_API_KEY"]) {
      this.googleAI = new GoogleGenAI({
        apiKey: process.env["GEMINI_API_KEY"] || process.env["GOOGLE_GENERATIVE_AI_API_KEY"]!,
      })
    }
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    try {
      if (request.model === 'claude-sonnet-4.5') {
        return await this.chatWithClaude(request)
      } else if (request.model === 'gemini-2.5-pro') {
        return await this.chatWithGemini(request)
      }

      throw new Error(`Unsupported model: ${request.model}`)
    } catch (error) {
      console.error('AI Service Error:', error)
      return {
        content: '',
        model: request.model,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async chatWithClaude(request: AIRequest): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured')
    }

    // Build message content
    const messageContent: any[] = []

    // Add image if provided
    if (request.imageData) {
      // Remove data URL prefix if present
      const base64Data = request.imageData.includes('base64,')
        ? request.imageData.split('base64,')[1]
        : request.imageData

      messageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: base64Data,
        },
      })
    }

    // Add text from the last user message
    const lastUserMessage = request.messages[request.messages.length - 1]
    if (lastUserMessage?.role === 'user') {
      messageContent.push({
        type: 'text',
        text: lastUserMessage.content,
      })
    }

    // Build conversation history (exclude last message as we're handling it separately)
    const conversationHistory = request.messages.slice(0, -1).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: request.maxTokens || 4096,
      messages: [
        ...conversationHistory,
        {
          role: 'user',
          content: messageContent,
        },
      ],
      system: `You are an expert AI Design Assistant for a photo editor specialized in print production.

Your expertise includes:
- Image analysis and validation
- Print production requirements (DPI, bleed, crop marks)
- Color theory and apparel printing
- Design recommendations
- File format conversions

Be conversational, helpful, and concise. Provide actionable advice.`,
    })

    const textContent = response.content.find((block) => block.type === 'text')

    return {
      content: textContent && 'text' in textContent ? textContent.text : '',
      model: 'claude-sonnet-4.5',
    }
  }

  private async chatWithGemini(request: AIRequest): Promise<AIResponse> {
    if (!this.googleAI) {
      throw new Error('Google AI API key not configured')
    }

    // Build content parts
    const parts: any[] = []

    // Add image if provided
    if (request.imageData) {
      // Remove data URL prefix if present
      const base64Data = request.imageData.includes('base64,')
        ? request.imageData.split('base64,')[1]
        : request.imageData

      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data,
        },
      })
    }

    // Add text from the last user message
    const lastUserMessage = request.messages[request.messages.length - 1]
    if (lastUserMessage?.role === 'user') {
      parts.push({
        text: lastUserMessage.content,
      })
    }

    // Build conversation history for context
    const conversationContext = request.messages
      .slice(0, -1)
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')

    const systemInstruction = `You are an expert AI Design Assistant for a photo editor specialized in print production.

Your expertise includes:
- Image analysis and validation
- Print production requirements (DPI, bleed, crop marks)
- Color theory and apparel printing
- Design recommendations
- File format conversions

Be conversational, helpful, and concise. Provide actionable advice.

${conversationContext ? `\n\nConversation history:\n${conversationContext}\n\n` : ''}`

    // Add system instruction as first text part
    parts.unshift({
      text: systemInstruction,
    })

    const result = await this.googleAI.models.generateContent({
      model: 'gemini-2.5-pro-latest',
      contents: [{ role: 'user', parts }],
    })

    return {
      content: result.text || '',
      model: 'gemini-2.5-pro',
    }
  }
}

// Export singleton instance
export const aiService = new AIService()
