/**
 * AI Clarification Workflow - Quick Implementation Example
 *
 * Shows exactly how to integrate clarification into existing ai-chat-panel.tsx
 *
 * IMPLEMENTATION STEPS:
 * 1. Add types and component imports
 * 2. Add state for clarification
 * 3. Modify API response handling
 * 4. Add clarification to message stream
 * 5. Handle text responses to clarification
 */

// ============================================================
// STEP 1: ADD IMPORTS (top of ai-chat-panel.tsx)
// ============================================================

import type {
  ClarificationMessage,
  ClarificationAction,
} from "@/lib/types/ai-clarification"
import {
  AIClarificationMessage,
  ClarificationLoadingIndicator,
} from "@/components/ai-clarification-message"

// ============================================================
// STEP 2: ADD STATE (inside AIChatPanel component)
// ============================================================

export function AIChatPanel({ onClose, zIndex, isActive, onFocus }: AIChatPanelProps) {
  // ... existing state ...

  // NEW: Clarification state
  const [pendingClarification, setPendingClarification] = useState<ClarificationMessage | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // ... rest of existing code ...

  // ============================================================
  // STEP 3: MODIFY API RESPONSE HANDLING (in handleSendMessage)
  // ============================================================

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage = inputValue.trim()
    setInputValue("")

    // Check if user is responding to pending clarification
    if (pendingClarification) {
      handleClarificationResponse(userMessage)
      return // Exit early - don't send to API
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])

    // NEW: Set analyzing state
    setIsAnalyzing(true)
    setIsProcessing(true)

    // Image check...
    if (!imageUrl) {
      // ... existing error handling ...
      setIsAnalyzing(false)
      setIsProcessing(false)
      return
    }

    // Auto-undo for corrections...
    const isCorrectionRequest = detectCorrectionIntent(userMessage)
    // ... existing correction logic ...

    try {
      // ... existing blob conversion code ...

      // Call orchestrator API
      const response = await fetch('/api/ai/chat-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          imageUrl: processableImageUrl,
          conversationId,
          conversationHistory: messages.slice(-5).map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

      // NEW: Check if clarification is needed
      if (result.needsClarification && result.clarification) {
        console.log('[AI Chat] Clarification needed:', result.clarification)
        setPendingClarification(result.clarification)
        setIsAnalyzing(false)
        setIsProcessing(false)
        return // Don't execute yet - wait for user confirmation
      }

      // Clear analyzing state
      setIsAnalyzing(false)

      // ... existing tool execution code ...

    } catch (error) {
      console.error('[AI Chat] Error:', error)
      setIsAnalyzing(false)
      setIsProcessing(false)
      // ... existing error handling ...
    }
  }

  // ============================================================
  // STEP 4: ADD CLARIFICATION RESPONSE HANDLER (new function)
  // ============================================================

  const handleClarificationResponse = (userMessage: string) => {
    if (!pendingClarification) return

    const lowerMessage = userMessage.toLowerCase().trim()

    // Handle cancellation
    if (['cancel', 'no', 'nevermind', 'stop'].includes(lowerMessage)) {
      setPendingClarification(null)

      const cancelMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Operation cancelled. What else can I help with?',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, cancelMsg])
      return
    }

    // Handle "use suggested"
    if (['use suggested', 'suggested', 'better', 'better way'].some(p => lowerMessage.includes(p))) {
      if (pendingClarification.suggestion) {
        executeClarificationWorkflow('accept-suggested')
        return
      }
    }

    // Handle "use original"
    if (['use original', 'original', 'my way'].some(p => lowerMessage.includes(p))) {
      executeClarificationWorkflow('use-original')
      return
    }

    // Handle generic confirmation
    if (['yes', 'confirm', 'ok', 'go ahead', 'do it', 'proceed'].includes(lowerMessage)) {
      // Use suggested if available, otherwise original
      const action = pendingClarification.suggestion ? 'accept-suggested' : 'use-original'
      executeClarificationWorkflow(action)
      return
    }

    // If we don't recognize the response, ask for clarification
    const helpMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Please choose: "use suggested", "use original", or "cancel"',
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, helpMsg])
  }

  // ============================================================
  // STEP 5: EXECUTE CLARIFICATION WORKFLOW (new function)
  // ============================================================

  const executeClarificationWorkflow = async (action: ClarificationAction) => {
    if (!pendingClarification) return

    // Determine which steps to execute
    const stepsToExecute = action === 'accept-suggested'
      ? pendingClarification.suggestion!.suggestedSteps
      : pendingClarification.parsedSteps

    // Add confirmation message
    const confirmMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: action === 'accept-suggested'
        ? '✓ Great choice! Executing suggested workflow...'
        : '✓ Confirmed! Executing your request...',
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, confirmMsg])

    // Clear clarification
    setPendingClarification(null)
    setIsProcessing(true)

    // Execute the workflow
    try {
      const toolExecutions: ToolExecution[] = []
      let currentImageUrl = imageUrl

      for (const step of stepsToExecute) {
        console.log(`[AI Chat] Executing step ${step.number}: ${step.description}`)

        try {
          const toolResult = await executeToolClientSide(
            step.toolName,
            step.parameters || {},
            currentImageUrl
          )

          if (toolResult.success && toolResult.resultUrl) {
            toolExecutions.push({
              toolName: step.toolName,
              parameters: step.parameters,
              success: true,
              resultImageUrl: toolResult.resultUrl,
              confidence: 95,
            })

            currentImageUrl = toolResult.resultUrl
          } else {
            toolExecutions.push({
              toolName: step.toolName,
              parameters: step.parameters,
              success: false,
              error: toolResult.error || 'Tool execution failed',
              confidence: 0,
            })

            // Stop on first failure
            break
          }
        } catch (error) {
          console.error(`[AI Chat] Step ${step.number} failed:`, error)
          toolExecutions.push({
            toolName: step.toolName,
            parameters: step.parameters,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            confidence: 0,
          })
          break
        }
      }

      // Add result message
      const successCount = toolExecutions.filter(t => t.success).length
      const resultMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Completed ${successCount} of ${stepsToExecute.length} steps`,
        timestamp: Date.now(),
        toolExecutions,
        confidence: 95,
      }
      setMessages(prev => [...prev, resultMsg])

      // Update canvas if we have final result
      if (currentImageUrl !== imageUrl) {
        const response = await fetch(currentImageUrl)
        const blob = await response.blob()
        const file = new File([blob], 'ai-edited.png', { type: blob.type })
        const url = URL.createObjectURL(blob)

        setImage(url, file, 'ai-edited.png')

        const { addToHistory } = useImageStore.getState()
        addToHistory(`AI Edit: ${stepsToExecute.length} steps`)
      }

    } catch (error) {
      console.error('[AI Chat] Workflow execution failed:', error)

      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        confidence: 0,
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsProcessing(false)
    }
  }

  // ============================================================
  // STEP 6: UPDATE MESSAGE RENDERING (in JSX)
  // ============================================================

  return (
    <DraggablePanel /* ... existing props ... */>
      <div className="flex flex-col h-full">
        {/* ... existing header/info/status sections ... */}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
          {/* Existing messages */}
          {messages.map((message) => (
            <div key={message.id} /* ... existing message rendering ... */>
              {/* ... */}
            </div>
          ))}

          {/* NEW: Analyzing Indicator */}
          {isAnalyzing && !pendingClarification && (
            <div className="flex justify-start animate-in slide-in-from-bottom duration-300">
              <div className="max-w-[90%]">
                <ClarificationLoadingIndicator />
              </div>
            </div>
          )}

          {/* NEW: Pending Clarification */}
          {pendingClarification && (
            <div className="flex justify-start animate-in slide-in-from-bottom duration-300">
              <div className="max-w-[90%]">
                <AIClarificationMessage
                  clarification={pendingClarification}
                  onResponse={(action) => {
                    if (action === 'cancel') {
                      setPendingClarification(null)
                      const cancelMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: 'Operation cancelled. What would you like to do instead?',
                        timestamp: Date.now(),
                      }
                      setMessages(prev => [...prev, cancelMsg])
                    } else {
                      executeClarificationWorkflow(action)
                    }
                  }}
                  onCancel={() => {
                    setPendingClarification(null)
                    const cancelMsg: ChatMessage = {
                      id: crypto.randomUUID(),
                      role: 'assistant',
                      content: 'No problem! What would you like to do?',
                      timestamp: Date.now(),
                    }
                    setMessages(prev => [...prev, cancelMsg])
                  }}
                />
              </div>
            </div>
          )}

          {/* Existing processing indicator */}
          {isProcessing && !pendingClarification && (
            <div /* ... existing processing indicator ... */>
              {/* ... */}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ... existing input area ... */}
      </div>
    </DraggablePanel>
  )
}

// ============================================================
// BACKEND CHANGES (app/api/ai/chat-orchestrator/route.ts)
// ============================================================

/**
 * Example backend response with clarification
 */
const exampleBackendResponse = {
  success: true,
  message: "Let me confirm what you want to do",
  needsClarification: true,
  clarification: {
    id: "clarification-123",
    userRequest: "remove hot key buttons, trim orange spaces, resize to 800px, rotate 90 degrees, then add mockup on white tshirt",
    parsedSteps: [
      {
        number: 1,
        description: "Remove orange hotkey buttons (color knockout)",
        toolName: "color_knockout",
        parameters: { targetColor: "#FF6600" }
      },
      {
        number: 2,
        description: "Trim extra orange spaces (auto crop)",
        toolName: "auto_crop",
        parameters: {}
      },
      {
        number: 3,
        description: "Resize to 800px",
        toolName: "smart_resize",
        parameters: { width: 800 }
      },
      {
        number: 4,
        description: "Rotate 90 degrees",
        toolName: "rotate_flip",
        parameters: { rotation: 90 }
      },
      {
        number: 5,
        description: "Generate white t-shirt mockup",
        toolName: "generate_mockup",
        parameters: { product: "tshirt", color: "white" }
      }
    ],
    printReadiness: {
      currentDimensions: { width: 1200, height: 800, dpi: 72 },
      recommendedDimensions: { width: 3600, height: 2400, dpi: 300 },
      warnings: [
        "Low resolution for print quality",
        "Consider upscaling before processing"
      ],
      isPrintReady: false
    },
    suggestion: {
      reason: "Upscale to 300 DPI first, then proceed (Better quality after background removal)",
      suggestedSteps: [
        {
          number: 1,
          description: "Upscale to 300 DPI",
          toolName: "upscaler",
          parameters: { scale: 3 }
        },
        {
          number: 2,
          description: "Remove orange hotkey buttons",
          toolName: "color_knockout",
          parameters: { targetColor: "#FF6600" }
        },
        {
          number: 3,
          description: "Trim extra orange spaces",
          toolName: "auto_crop",
          parameters: {}
        },
        {
          number: 4,
          description: "Rotate 90 degrees",
          toolName: "rotate_flip",
          parameters: { rotation: 90 }
        },
        {
          number: 5,
          description: "Resize to 800px",
          toolName: "smart_resize",
          parameters: { width: 800 }
        },
        {
          number: 6,
          description: "Generate white t-shirt mockup",
          toolName: "generate_mockup",
          parameters: { product: "tshirt", color: "white" }
        }
      ],
      benefits: [
        "Better quality after background removal",
        "Preserves detail in mockup generation",
        "Meets print standards (300 DPI)"
      ]
    },
    timestamp: Date.now()
  },
  confidence: 95,
  conversationId: "conv-123",
  timestamp: Date.now()
}

/**
 * Example backend logic to determine if clarification is needed
 */
async function shouldRequestClarification(
  parsedSteps: any[],
  imageMetadata: any
): Promise<boolean> {
  // Simple requests don't need clarification
  if (parsedSteps.length === 1) {
    return false
  }

  // Multi-step workflows need clarification
  if (parsedSteps.length > 2) {
    return true
  }

  // Check if print-related tools are involved
  const printTools = ['generate_mockup', 'upscaler']
  const hasPrintTool = parsedSteps.some(s => printTools.includes(s.toolName))

  // Check if image is low DPI
  const isLowDPI = imageMetadata.dpi < 150

  // Request clarification if doing print work with low DPI
  if (hasPrintTool && isLowDPI) {
    return true
  }

  // Check for destructive operations
  const destructiveTools = ['crop_with_spacing', 'auto_crop', 'smart_resize']
  const hasDestructiveOp = parsedSteps.some(s => destructiveTools.includes(s.toolName))

  return hasDestructiveOp
}

// ============================================================
// TESTING EXAMPLES
// ============================================================

/**
 * Test Case 1: Simple request (no clarification)
 */
const test1_userMessage = "remove background"
const test1_expectedBehavior = "Executes immediately without clarification"

/**
 * Test Case 2: Multi-step with print concern (shows clarification)
 */
const test2_userMessage = "remove background, resize to 800px, then mockup on white tshirt"
const test2_expectedBehavior = "Shows clarification with print readiness warning and upscale suggestion"

/**
 * Test Case 3: User confirms with text
 */
const test3_clarificationShown = true
const test3_userTypes = "yes"
const test3_expectedBehavior = "Executes suggested workflow (or original if no suggestion)"

/**
 * Test Case 4: User chooses original
 */
const test4_clarificationShown = true
const test4_userTypes = "use original"
const test4_expectedBehavior = "Executes user's original workflow (ignores suggestion)"

/**
 * Test Case 5: User cancels
 */
const test5_clarificationShown = true
const test5_userTypes = "cancel"
const test5_expectedBehavior = "Clears clarification, shows 'Operation cancelled' message"

// ============================================================
// SUMMARY
// ============================================================

/**
 * Integration Summary:
 *
 * 1. Add 2 new state variables (pendingClarification, isAnalyzing)
 * 2. Modify API response handling to check for needsClarification
 * 3. Add clarification response handler function
 * 4. Add workflow execution function
 * 5. Render clarification in message stream
 * 6. Handle text responses to clarification
 *
 * Backend needs to:
 * 1. Parse user request into steps
 * 2. Check print readiness
 * 3. Generate workflow suggestion (if applicable)
 * 4. Return clarification object when needed
 *
 * Total Changes:
 * - Frontend: ~150 lines of code
 * - Backend: ~200 lines of code
 * - New components: 2 files (already created)
 * - New types: 1 file (already created)
 *
 * Estimated Implementation Time: 2-3 hours
 */
