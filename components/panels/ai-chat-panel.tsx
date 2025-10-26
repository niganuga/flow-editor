"use client"

import { useEffect, useRef, useState } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { useImageStore } from "@/lib/image-store"
import { executeToolClientSide } from "@/lib/client-tool-executor"
import { ImagePreviewModal } from "@/components/image-preview-modal"
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Send,
  Info,
  Image as ImageIcon,
  Zap,
  ChevronDown,
  ChevronUp,
  Eye,
  Paperclip,
  X
} from "lucide-react"

// ============================================================
// INTERFACES
// ============================================================

interface ToolExecution {
  toolName: string
  parameters: any
  success: boolean
  resultImageUrl?: string
  confidence: number
  error?: string
}

interface ImageResult {
  url: string
  type: 'edit' | 'mockup'
  predictionId?: string
  status: 'pending' | 'completed' | 'failed'
  metadata?: {
    product?: string
    color?: string
    placement?: string
    size?: string
  }
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolExecutions?: ToolExecution[]
  confidence?: number
  imageResult?: ImageResult
}

interface OrchestratorResponse {
  success: boolean
  message: string
  toolExecutions: ToolExecution[]
  confidence: number
  conversationId: string
  timestamp: number
  error?: string
}

interface AIChatPanelProps {
  onClose: () => void
  zIndex?: number
  isActive?: boolean
  onFocus?: () => void
}

// ============================================================
// TOOL NAME MAPPING
// ============================================================

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  color_knockout: 'Color Knockout',
  recolor_image: 'Recolor',
  texture_cut: 'Texture Cut',
  background_remover: 'AI Background Removal',
  upscaler: 'AI Upscaler',
  extract_color_palette: 'Extract Palette',
  pick_color_at_position: 'Pick Color',
  analyze_image: 'Image Analysis',
  auto_crop: 'Auto Crop',
  crop_with_spacing: 'Crop with Spacing',
  rotate_flip: 'Rotate/Flip',
  smart_resize: 'Smart Resize',
  edit_image: 'AI Image Edit',
  generate_mockup: 'Product Mockup',
}

// ============================================================
// CONFIDENCE BADGE COMPONENT
// ============================================================

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const getColor = (score: number) => {
    if (score >= 95) return 'bg-green-500'
    if (score >= 80) return 'bg-blue-500'
    if (score >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getTextColor = (score: number) => {
    if (score >= 95) return 'text-white'
    if (score >= 80) return 'text-white'
    if (score >= 70) return 'text-black'
    return 'text-white'
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getColor(confidence)} ${getTextColor(confidence)}`}
      title={`Confidence: ${confidence}%`}
    >
      <Zap className="w-3 h-3" />
      {confidence}%
    </span>
  )
}

// ============================================================
// IMAGE RESULT COMPONENT
// ============================================================

function ImageResultDisplay({
  imageResult,
  onView,
  onApply
}: {
  imageResult: ImageResult
  onView: () => void
  onApply?: () => void
}) {
  const canApply = imageResult.type === 'edit' && imageResult.status === 'completed'

  return (
    <div className="mt-3 rounded-lg border-2 border-foreground/20 overflow-hidden">
      {/* Image Preview */}
      <div className="relative group cursor-pointer" onClick={onView}>
        {imageResult.status === 'completed' ? (
          <>
            <img
              src={imageResult.url}
              alt={imageResult.type === 'edit' ? 'AI Edit Result' : 'Product Mockup'}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye className="w-8 h-8 text-white" />
            </div>
          </>
        ) : imageResult.status === 'pending' ? (
          <div className="h-48 bg-foreground/5 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          </div>
        ) : (
          <div className="h-48 bg-red-500/10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <XCircle className="w-6 h-6 text-red-500" />
              <span className="text-sm text-red-500">Failed to generate</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {imageResult.status === 'completed' && (
        <div className="p-2 bg-foreground/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {imageResult.type === 'edit' ? (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-600 rounded">Edit</span>
            ) : (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-600 rounded">Mockup</span>
            )}
            {imageResult.metadata?.product && (
              <span className="text-foreground/60">{imageResult.metadata.product}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onView()
              }}
              className="px-3 py-1 text-xs bg-foreground/10 hover:bg-foreground/20 rounded transition-colors"
            >
              View
            </button>
            {canApply && onApply && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onApply()
                }}
                className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                Apply
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// TOOL EXECUTION CARD COMPONENT
// ============================================================

function ToolExecutionCard({ execution }: { execution: ToolExecution }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const toolDisplayName = TOOL_DISPLAY_NAMES[execution.toolName] || execution.toolName

  return (
    <div
      className="mt-2 rounded-lg border-2 border-foreground/20 bg-background/50 overflow-hidden"
      style={{
        boxShadow: "2px 2px 0px 0px hsl(var(--foreground) / 0.1)",
      }}
    >
      {/* Tool Header */}
      <div className="p-2 bg-foreground/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-foreground/70" />
          <span className="font-semibold text-sm">{toolDisplayName}</span>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={execution.confidence} />
          {execution.success ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Tool Body */}
      <div className="p-2 space-y-2">
        {/* Success State */}
        {execution.success && (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Executed successfully</span>
          </div>
        )}

        {/* Error State */}
        {!execution.success && execution.error && (
          <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
            <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{execution.error}</span>
          </div>
        )}

        {/* Result Image Preview */}
        {execution.resultImageUrl && (
          <div className="space-y-1">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground transition-colors"
            >
              <Eye className="w-3 h-3" />
              <span>{showPreview ? 'Hide' : 'Show'} result preview</span>
            </button>

            {showPreview && (
              <div className="rounded border-2 border-foreground/10 overflow-hidden bg-white/5">
                <img
                  src={execution.resultImageUrl}
                  alt="Tool execution result"
                  className="w-full h-auto max-h-40 object-contain"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Parameters Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground/70 transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          <span>Parameters</span>
        </button>

        {/* Parameters Content */}
        {isExpanded && (
          <pre className="text-xs bg-foreground/5 p-2 rounded overflow-x-auto">
            {JSON.stringify(execution.parameters, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function AIChatPanel({ onClose, zIndex, isActive, onFocus }: AIChatPanelProps) {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversationId] = useState(() => crypto.randomUUID())
  const [previewImage, setPreviewImage] = useState<{
    url: string
    title: string
    metadata?: any
    canApply: boolean
  } | null>(null)
  const [attachedImage, setAttachedImage] = useState<{
    url: string
    file: File
    name: string
  } | null>(null)
  const [latestPreviewResult, setLatestPreviewResult] = useState<{
    url: string
    toolName: string
    timestamp: number
    description: string
  } | null>(null)

  // Note: useOptimistic removed - messages are added directly to base state
  // User messages don't need optimistic updates (already confirmed)
  // Assistant messages are added after API response (also confirmed)

  // Store hooks
  const { imageUrl, setImage, history, historyIndex } = useImageStore()

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isProcessing])

  // Initialize with welcome message
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true

      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Hey! I'm your AI Design Partner. I can help you edit images with natural language. Just tell me what you want to do!",
        timestamp: Date.now(),
      }

      setMessages([welcomeMessage])
    }
  }, [])

  // ============================================================
  // CORRECTION DETECTION
  // ============================================================

  /**
   * Detect if user message indicates they want to correct the previous edit.
   * If detected, we should undo to the previous state before applying new edit.
   */
  const detectCorrectionIntent = (message: string): boolean => {
    const correctionPhrases = [
      'too much',
      'too little',
      'not enough',
      'incorrect',
      'wrong',
      'undo that',
      'revert',
      'go back',
      'try again',
      'more precise',
      'more selective',
      'be more',
      'instead',
      'just the',
      'only the',
      'just inside',
      'only inside',
      'not quite',
      'didn\'t work',
      'knocked out too',
      'removed too',
    ]

    const lowerMessage = message.toLowerCase()
    return correctionPhrases.some(phrase => lowerMessage.includes(phrase))
  }

  // ============================================================
  // ATTACHMENT HANDLER
  // ============================================================

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('[AI Chat] Invalid file type:', file.type)
      return
    }

    // Create blob URL for preview
    const url = URL.createObjectURL(file)

    setAttachedImage({
      url,
      file,
      name: file.name
    })

    console.log('[AI Chat] Image attached:', file.name)
  }

  const handleRemoveAttachment = () => {
    if (attachedImage) {
      URL.revokeObjectURL(attachedImage.url)
      setAttachedImage(null)
    }
  }

  // ============================================================
  // SEND MESSAGE HANDLER
  // ============================================================

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage = inputValue.trim()
    setInputValue("")

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    }

    // Add user message directly to base state (no optimistic needed - it's already confirmed)
    setMessages(prev => [...prev, userMsg])
    setIsProcessing(true)

    // Check if we have an image
    if (!imageUrl) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Please upload an image first. I need to see what you're working with!",
        timestamp: Date.now(),
        confidence: 0,
      }

      // Add error message to base state (user message already added)
      setMessages(prev => [...prev, errorMsg])
      setIsProcessing(false)
      return
    }

    // ===== AUTO-UNDO FOR CORRECTIONS =====
    // If user is correcting the previous edit, undo first
    const isCorrectionRequest = detectCorrectionIntent(userMessage)
    const { canUndo, undo } = useImageStore.getState()

    if (isCorrectionRequest && canUndo()) {
      console.log('[AI Chat] 🔄 Correction detected - auto-undoing to previous state')
      undo()

      // Add informational message to chat
      const undoInfoMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "↩️ Reverted to previous state before applying correction...",
        timestamp: Date.now(),
        confidence: 100,
      }
      // Add undo info to base state (user message already added)
      setMessages(prev => [...prev, undoInfoMsg])
    }

    try {
      console.log('[AI Chat] Sending message to orchestrator:', {
        message: userMessage,
        imageUrl: imageUrl.substring(0, 50) + '...',
        conversationId,
      })

      // Convert blob URL to data URL for server processing
      let processableImageUrl = imageUrl
      if (imageUrl.startsWith('blob:')) {
        console.log('[AI Chat] Converting blob URL to data URL...')
        try {
          const response = await fetch(imageUrl)
          const blob = await response.blob()
          const reader = new FileReader()
          processableImageUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          console.log('[AI Chat] Converted to data URL:', processableImageUrl.substring(0, 50))
        } catch (conversionError) {
          console.error('[AI Chat] Failed to convert blob URL:', conversionError)
          throw new Error('Failed to prepare image for processing')
        }
      }

      // Convert attached image to data URL if present
      let attachedImageDataUrl: string | undefined
      if (attachedImage) {
        console.log('[AI Chat] Converting attached image to data URL...')
        try {
          const reader = new FileReader()
          attachedImageDataUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(attachedImage.file)
          })
          console.log('[AI Chat] Attached image converted:', attachedImage.name)
        } catch (error) {
          console.error('[AI Chat] Failed to convert attached image:', error)
        }
      }

      // Convert preview result to data URL if present (blob URLs don't work server-side)
      let previewResultDataUrl: string | undefined
      if (latestPreviewResult) {
        console.log('[AI Chat] Converting preview result to data URL...')
        try {
          const response = await fetch(latestPreviewResult.url)
          const blob = await response.blob()
          const reader = new FileReader()
          previewResultDataUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          console.log('[AI Chat] Preview result converted:', previewResultDataUrl.substring(0, 50))
        } catch (error) {
          console.error('[AI Chat] Failed to convert preview result:', error)
        }
      }

      // Build editing history summary for Claude
      const editingHistory = history.length > 0 ? {
        totalOperations: history.length,
        currentStateIndex: historyIndex,
        operations: history.map((entry, idx) => ({
          step: idx + 1,
          operation: entry.operation || 'manual',
          description: entry.description,
          isCurrent: idx === historyIndex,
          timestamp: entry.timestamp,
        })),
      } : null

      console.log('[AI Chat] Sending editing history to Claude:', editingHistory)

      // Call orchestrator API
      const response = await fetch('/api/ai/chat-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          imageUrl: processableImageUrl,
          attachedImageUrl: attachedImageDataUrl, // Optional second image
          previewResultUrl: previewResultDataUrl, // Optional preview result from chat (as data URL)
          conversationId,
          conversationHistory: messages
            .slice(-5) // Reduced to last 5 messages to avoid confusion
            .map(m => {
              // Include tool execution summary for better context
              let content = m.content
              if (m.toolExecutions && m.toolExecutions.length > 0) {
                const toolSummary = m.toolExecutions
                  .map(t => `[Executed: ${TOOL_DISPLAY_NAMES[t.toolName] || t.toolName}${t.success ? ' ✓' : ' ✗'}]`)
                  .join(' ')
                content = `${m.content}\n${toolSummary}`
              }
              return {
                role: m.role,
                content: content,
                timestamp: m.timestamp,
              }
            }),
          editingHistory, // Add full editing history for complete context
          userContext: {
            industry: 'custom apparel printing',
            expertise: 'novice',
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const result = await response.json()

      console.log('[AI Chat] Orchestrator response:', result)

      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }

      // ===== CLIENT-SIDE TOOL EXECUTION =====
      const toolExecutions: ToolExecution[] = []
      let finalResultUrl: string | null = null
      let imageResultForMessage: ImageResult | undefined
      let shouldAutoApplyToCanvas = true // Track if we should auto-apply the result

      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`[AI Chat] Executing ${result.toolCalls.length} tool(s) client-side...`)
        console.log('[AI Chat] Tools to execute:', result.toolCalls.map(t => t.toolName).join(', '))

        // Use the original blob URL for client-side execution
        let currentImageUrl = imageUrl

        for (const toolCall of result.toolCalls) {
          console.log(`[AI Chat] Executing ${toolCall.toolName} client-side...`)

          // Check if this is an AI edit, mockup, bg removal, or upscale tool
          const isAIEdit = toolCall.toolName === 'edit_image'
          const isMockup = toolCall.toolName === 'generate_mockup'
          const isBgRemoval = toolCall.toolName === 'background_remover'
          const isUpscale = toolCall.toolName === 'upscaler'

          // Tools that should show preview in chat (not auto-apply)
          const isPreviewTool = isAIEdit || isMockup || isBgRemoval || isUpscale

          try {
            const toolResult = await executeToolClientSide(
              toolCall.toolName,
              toolCall.parameters,
              currentImageUrl
            )

            if (toolResult.success && toolResult.resultUrl) {
              console.log(`[AI Chat] ${toolCall.toolName} succeeded with result URL`)

              toolExecutions.push({
                toolName: toolCall.toolName,
                parameters: toolCall.parameters,
                success: true,
                resultImageUrl: toolResult.resultUrl,
                confidence: 95, // High confidence for successful client execution
              })

              // Create image result for preview tools (edit, mockup, bg removal, upscale)
              if (isPreviewTool) {
                // Don't auto-apply preview tools - user must click Apply/View
                shouldAutoApplyToCanvas = false

                // Determine the type based on tool
                let resultType: 'edit' | 'mockup' = 'edit'
                if (isMockup) resultType = 'mockup'

                imageResultForMessage = {
                  url: toolResult.resultUrl,
                  type: resultType,
                  status: 'completed',
                  metadata: isMockup && toolResult.data ? {
                    product: toolCall.parameters.product,
                    color: toolCall.parameters.color,
                    placement: toolCall.parameters.placement,
                    size: toolCall.parameters.size,
                  } : undefined,
                }

                // Track this as the latest preview result for sequential operations
                setLatestPreviewResult({
                  url: toolResult.resultUrl,
                  toolName: toolCall.toolName,
                  timestamp: Date.now(),
                  description: isMockup
                    ? `mockup on ${toolCall.parameters.color || 'white'} ${toolCall.parameters.product || 'tshirt'}`
                    : 'AI edited image',
                })

                console.log('[AI Chat] Updated latest preview result:', {
                  toolName: toolCall.toolName,
                  url: toolResult.resultUrl.substring(0, 50) + '...',
                })
              }

              // Use this result as input for next tool if chaining
              currentImageUrl = toolResult.resultUrl
              finalResultUrl = toolResult.resultUrl
            } else if (toolResult.success && toolResult.data) {
              console.log(`[AI Chat] ${toolCall.toolName} returned data:`, toolResult.data)

              toolExecutions.push({
                toolName: toolCall.toolName,
                parameters: toolCall.parameters,
                success: true,
                confidence: 95,
              })
            } else {
              console.error(`[AI Chat] ${toolCall.toolName} failed:`, toolResult.error)

              toolExecutions.push({
                toolName: toolCall.toolName,
                parameters: toolCall.parameters,
                success: false,
                error: toolResult.error || 'Tool execution failed',
                confidence: 0,
              })

              // Create failed image result for preview tools
              if (isPreviewTool) {
                let resultType: 'edit' | 'mockup' = 'edit'
                if (isMockup) resultType = 'mockup'

                imageResultForMessage = {
                  url: '',
                  type: resultType,
                  status: 'failed',
                }
              }
            }
          } catch (error) {
            console.error(`[AI Chat] Error executing ${toolCall.toolName}:`, error)

            toolExecutions.push({
              toolName: toolCall.toolName,
              parameters: toolCall.parameters,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              confidence: 0,
            })

            // Create failed image result for AI edit or mockup
            if (isAIEdit || isMockup) {
              imageResultForMessage = {
                url: '',
                type: isAIEdit ? 'edit' : 'mockup',
                status: 'failed',
              }
            }
          }
        }
      } else {
        console.log('[AI Chat] No tools to execute - Claude returned text-only response')
      }

      // Add assistant response to chat with client-executed tools
      // Ensure content is never empty - Claude API requires non-empty content
      const messageContent = result.message?.trim() ||
        (imageResultForMessage ? '✨ Processing complete!' : 'Done!')

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: messageContent,
        timestamp: result.timestamp || Date.now(),
        ...(toolExecutions.length > 0 && { toolExecutions }), // Only add if non-empty
        confidence: result.confidence,
        ...(imageResultForMessage && { imageResult: imageResultForMessage }), // Add image result if present
      }

      // Add assistant message to base state (user message already added at start)
      setMessages(prev => [...prev, assistantMsg])

      // Update main canvas if we have a final result AND should auto-apply
      // (skip auto-apply for edit_image and generate_mockup - user must click Apply button)
      if (finalResultUrl && shouldAutoApplyToCanvas) {
        console.log('[AI Chat] Auto-applying result to canvas:', finalResultUrl.substring(0, 50))

        try {
          // Convert result URL to blob and update image store
          const imageResponse = await fetch(finalResultUrl)
          const imageBlob = await imageResponse.blob()
          const imageFile = new File([imageBlob], 'ai-edited-image.png', { type: imageBlob.type })
          const imageObjectUrl = URL.createObjectURL(imageBlob)

          setImage(imageObjectUrl, imageFile, 'ai-edited-image.png')

          // Add to history with description
          const { addToHistory } = useImageStore.getState()
          const toolNames = toolExecutions
            .filter(t => t.success)
            .map(t => TOOL_DISPLAY_NAMES[t.toolName] || t.toolName)
            .join(', ')

          if (toolNames) {
            addToHistory(`AI Edit: ${toolNames}`)
          }

          console.log('[AI Chat] Canvas updated successfully')
        } catch (imageError) {
          console.error('[AI Chat] Failed to update canvas:', imageError)
        }
      } else if (finalResultUrl && !shouldAutoApplyToCanvas) {
        console.log('[AI Chat] Result available but not auto-applying (edit/mockup - user must click Apply)')
      }
    } catch (error) {
      console.error('[AI Chat] Error:', error)

      // Add error message to chat
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: Date.now(),
        confidence: 0,
      }

      // Add error message to base state (user message already added at start)
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsProcessing(false)
      // Clear attachment after processing
      if (attachedImage) {
        handleRemoveAttachment()
      }
    }
  }

  // ============================================================
  // SUGGESTED PROMPTS
  // ============================================================

  const suggestedPrompts = [
    'Remove the background',
    'Auto-detect and trim',
    'Trim orange spaces',
    'Rotate 90 degrees',
    'Resize to 800px',
    'Show color palette',
  ]

  const handleSuggestedPrompt = (prompt: string) => {
    if (isProcessing) return
    setInputValue(prompt)
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
    <DraggablePanel
      title="AI Design Partner"
      icon={<Sparkles className="w-5 h-5" />}
      onClose={onClose}
      defaultPosition={{ x: 400, y: 70 }}
      defaultSize={{ width: 420, height: 600 }}
      zIndex={zIndex}
      isActive={isActive}
      onFocus={onFocus}
    >
      <div className="flex flex-col h-full">
        {/* Info Banner */}
        <div className="px-4 pt-4 pb-2">
          <div
            className="flex items-start gap-2 p-2 rounded-lg border-2 border-blue-500/30 bg-blue-500/10"
            style={{
              boxShadow: "2px 2px 0px 0px hsl(var(--foreground) / 0.1)",
            }}
          >
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-foreground/70">
              <p className="font-semibold mb-0.5">Phase 8: AI Design Assistant</p>
              <p>Natural language image editing powered by Claude Vision API</p>
            </div>
          </div>
        </div>

        {/* Image Status */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-xs text-foreground/60">
            <ImageIcon className="w-3 h-3" />
            <span>
              {imageUrl ? 'Image loaded - Ready to edit!' : 'No image - Please upload one first'}
            </span>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-300`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-3 border-2 ${
                  message.role === 'user'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-foreground border-foreground/20'
                }`}
                style={{
                  boxShadow: "2px 2px 0px 0px hsl(var(--foreground) / 0.2)",
                }}
              >
                {/* Message Header (Assistant only) */}
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-foreground/70" />
                    <span className="text-xs font-semibold text-foreground/70">AI Design Partner</span>
                    {message.confidence !== undefined && message.confidence > 0 && (
                      <ConfidenceBadge confidence={message.confidence} />
                    )}
                  </div>
                )}

                {/* Message Content */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>

                {/* Image Result Display */}
                {message.imageResult && (
                  <ImageResultDisplay
                    imageResult={message.imageResult}
                    onView={() => {
                      setPreviewImage({
                        url: message.imageResult!.url,
                        title: message.imageResult!.type === 'edit' ? 'AI Edit Result' : 'Product Mockup',
                        metadata: {
                          type: message.imageResult!.type,
                          ...message.imageResult!.metadata,
                        },
                        canApply: message.imageResult!.type === 'edit',
                      })
                    }}
                    onApply={message.imageResult.type === 'edit' ? async () => {
                      // Apply edit to canvas
                      try {
                        const response = await fetch(message.imageResult!.url)
                        const blob = await response.blob()
                        const file = new File([blob], 'bg-removed.png', { type: blob.type })
                        const url = URL.createObjectURL(blob)

                        // setImage already adds to history, no need to call addToHistory
                        setImage(url, file, 'bg-removed.png', 'bg-remover')
                      } catch (error) {
                        console.error('Failed to apply edit:', error)
                      }
                    } : undefined}
                  />
                )}

                {/* Tool Executions */}
                {message.toolExecutions && message.toolExecutions.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <div className="text-xs font-semibold text-foreground/70 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Tool Executions ({message.toolExecutions.length})</span>
                    </div>
                    {message.toolExecutions.map((execution, idx) => (
                      <ToolExecutionCard key={idx} execution={execution} />
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-2 text-xs opacity-50">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex justify-start animate-in slide-in-from-bottom duration-300">
              <div
                className="max-w-[85%] rounded-xl p-3 border-2 bg-card text-foreground border-foreground/20"
                style={{
                  boxShadow: "2px 2px 0px 0px hsl(var(--foreground) / 0.2)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-foreground/70" />
                  <span className="text-sm text-foreground/70">
                    Analyzing and processing...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t-2 border-foreground/10 p-3 space-y-2">
          {/* Suggested Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSuggestedPrompt(prompt)}
                disabled={isProcessing}
                className="text-xs px-2.5 py-1 border border-foreground/20 rounded-full hover:bg-foreground/5 hover:border-foreground/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Attachment Preview */}
          {attachedImage && (
            <div className="flex items-center gap-2 px-3 py-2 bg-foreground/5 border-2 border-foreground/10 rounded-xl">
              <ImageIcon className="w-4 h-4 text-foreground/60" />
              <span className="text-xs text-foreground/60 flex-1 truncate">
                {attachedImage.name}
              </span>
              <button
                onClick={handleRemoveAttachment}
                className="text-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Preview Result Available Indicator */}
          {latestPreviewResult && (
            <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 border-2 border-accent/30 rounded-xl">
              <Sparkles className="w-4 h-4 text-accent" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-accent">
                  Preview result available
                </div>
                <div className="text-xs text-foreground/60">
                  {latestPreviewResult.description}
                </div>
              </div>
              <button
                onClick={() => setLatestPreviewResult(null)}
                className="text-accent/60 hover:text-accent transition-colors"
                title="Clear preview reference"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input Field */}
          <div className="flex gap-2">
            {/* Attachment Button */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleAttachImage}
                className="hidden"
                disabled={isProcessing}
              />
              <div className="px-3 py-2 border-2 border-foreground/20 rounded-xl hover:border-foreground/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Paperclip className="w-4 h-4 text-foreground/60" />
              </div>
            </label>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder={imageUrl ? "What would you like to do?" : "Upload an image first..."}
              disabled={isProcessing || !imageUrl}
              className="flex-1 px-3 py-2 text-sm border-2 border-foreground/20 rounded-xl bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing || !imageUrl}
              className="px-3 py-2 bg-foreground text-background rounded-xl border-2 border-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{
                boxShadow: "2px 2px 0px 0px hsl(var(--foreground))",
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </DraggablePanel>

    {/* Image Preview Modal */}
    {previewImage && (
      <ImagePreviewModal
        isOpen={!!previewImage}
        imageUrl={previewImage.url}
        title={previewImage.title}
        metadata={previewImage.metadata}
        showApply={previewImage.canApply}
        onClose={() => setPreviewImage(null)}
        onApply={previewImage.canApply ? async () => {
          // Apply edit to canvas
          try {
            const response = await fetch(previewImage.url)
            const blob = await response.blob()
            const file = new File([blob], 'bg-removed.png', { type: blob.type })
            const url = URL.createObjectURL(blob)

            // setImage already adds to history, no need to call addToHistory
            setImage(url, file, 'bg-removed.png', 'bg-remover')

            setPreviewImage(null)
          } catch (error) {
            console.error('Failed to apply edit:', error)
          }
        } : undefined}
      />
    )}
    </>
  )
}
