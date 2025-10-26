# AI Design Assistant - Backend Technical Flow

## The Complete Request-to-Result Pipeline

**User Request:** "Make this design pop on black fabric"

Let's trace EXACTLY what happens behind the scenes, step-by-step.

---

## Phase 1: Vision Analysis (AI "Sees" the Design)

### Step 1.1: User Uploads Image

```typescript
// components/panels/ai-chat-panel.tsx

const [inputValue, setInputValue] = useState("")
const { imageUrl } = useImageStore() // Current canvas image

const handleSendMessage = async () => {
  const userMessage = inputValue.trim() // "Make this design pop on black fabric"

  // 1. Convert canvas image to base64 for AI vision
  const canvas = document.querySelector('canvas')
  const imageData = canvas.toDataURL('image/png') // base64 string

  // 2. Send to AI backend
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4.5',
      message: userMessage,
      imageData: imageData, // <-- AI can "see" this
      conversationHistory: previousMessages
    })
  })
}
```

---

### Step 1.2: Backend Receives Request

```typescript
// app/api/ai/chat/route.ts

export async function POST(request: NextRequest) {
  const { model, message, imageData, conversationHistory } = await request.json()

  // Call the AI orchestration layer
  const result = await aiChatWithVisionAndTools({
    model,
    message,
    imageData,
    conversationHistory
  })

  return NextResponse.json(result)
}
```

---

### Step 1.3: AI Vision Analysis

```typescript
// lib/ai-chat-orchestrator.ts (NEW FILE - this is the brain)

import Anthropic from '@anthropic-ai/sdk'
import { toolDefinitions } from './ai-tools-orchestrator'

export async function aiChatWithVisionAndTools({
  model,
  message,
  imageData,
  conversationHistory
}) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // STEP 1: Send image + message to Claude with vision
  const analysisResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,

    // CRITICAL: Define available tools
    tools: toolDefinitions, // Your existing tools + new ones

    messages: [
      ...conversationHistory,
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageData.split('base64,')[1] // Remove data URL prefix
            }
          },
          {
            type: 'text',
            text: message // "Make this design pop on black fabric"
          }
        ]
      }
    ],

    // CRITICAL: Print production expertise
    system: `You are an expert AI Design Assistant specialized in custom printing.

CURRENT IMAGE ANALYSIS:
When you receive an image, analyze:
1. Dominant colors (extract from image visually)
2. Contrast level (low/medium/high)
3. Background type (transparent, solid, gradient)
4. Approximate complexity (simple logo vs detailed photo)
5. Estimated print-readiness

PRINT PRODUCTION KNOWLEDGE:
- Black fabric needs: Bright, high-saturation colors (neon, white, metallics)
- Low contrast on black fabric = invisible design
- White backgrounds should be removed for colored fabrics
- Pastel colors wash out on dark fabrics

AVAILABLE TOOLS:
You have access to these image editing tools via function calling:
${JSON.stringify(toolDefinitions.map(t => ({ name: t.name, description: t.description })), null, 2)}

YOUR WORKFLOW:
1. Analyze the image visually
2. Understand user intent from their message
3. Determine what changes are needed
4. If you're CERTAIN about the intent: Propose specific tool calls
5. If AMBIGUOUS: Ask clarifying questions before acting

AMBIGUITY HANDLING:
- "enhance" → Ask: "Enhance brightness, contrast, or colors?"
- "fix" → Ask: "What specifically should I fix?"
- "make it better" → Ask: "Better for print quality, visual appeal, or both?"
- "pop" + black fabric → CERTAIN: Boost saturation, remove white BG

RESPONSE FORMAT:
- First: Brief analysis (1-2 sentences)
- Then: Specific recommendation with tool calls OR clarifying question
- Use tool calls when you're >80% confident`
  })

  // Claude's response contains:
  // - Text analysis: "I see a logo with blue/yellow colors and white background"
  // - Tool use blocks: [{ type: 'tool_use', name: 'extract_color_palette', input: {...} }]

  return analysisResponse
}
```

**What Claude "sees" in the image:**
```
Claude's internal analysis (not visible to user yet):
"I observe a graphic design with primarily blue (#2563EB) and yellow (#FCD34D)
colors. The design has a white background (#FFFFFF). The contrast ratio against
black fabric would be approximately 3.5:1 for the blues (too low for visibility).

User intent: 'pop on black fabric' = increase visibility and vibrancy on dark background

Actions needed:
1. Remove white background (use color_knockout tool)
2. Increase color saturation (use recolor_image tool)
3. Optionally show mockup on black t-shirt (use generate_mockup tool)

Confidence: 95% - This is a clear use case"
```

---

## Phase 2: Tool Selection & Parameter Extraction

### Step 2.1: Claude Decides Which Tools to Use

```typescript
// Claude's response includes tool_use blocks:

{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "I see a logo with blue and yellow colors on a white background. To make this pop on black fabric, I'll remove the white background and boost the color saturation. This will create better contrast."
    },
    {
      "type": "tool_use",
      "id": "tool_call_1",
      "name": "color_knockout",
      "input": {
        "colors": [
          { "hex": "#FFFFFF", "r": 255, "g": 255, "b": 255 }
        ],
        "tolerance": 20,
        "replaceMode": "transparency",
        "antiAliasing": true
      }
    },
    {
      "type": "tool_use",
      "id": "tool_call_2",
      "name": "recolor_image",
      "input": {
        "colorMappings": [
          { "originalIndex": 0, "newColor": "#3B82F6" }, // Boost blue saturation
          { "originalIndex": 1, "newColor": "#FBBF24" }  // Boost yellow saturation
        ],
        "blendMode": "overlay",
        "tolerance": 30
      }
    }
  ],
  "stop_reason": "tool_use"
}
```

**Key Point:** Claude extracted the correct parameters by:
1. Visually analyzing the image (saw white background)
2. Understanding user intent ("pop on black fabric" = remove white + boost colors)
3. Knowing tool schemas (from `toolDefinitions`)
4. Choosing appropriate values (tolerance: 20, blendMode: 'overlay')

---

### Step 2.2: Backend Executes Tools

```typescript
// lib/ai-chat-orchestrator.ts (continued)

export async function aiChatWithVisionAndTools({ ... }) {
  // ... (previous code)

  const analysisResponse = await anthropic.messages.create({ ... })

  // CHECK: Did Claude want to use tools?
  if (analysisResponse.stop_reason === 'tool_use') {

    // Extract all tool_use blocks
    const toolCalls = analysisResponse.content.filter(
      block => block.type === 'tool_use'
    )

    // PARALLEL EXECUTION: Run multiple tools at once
    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall) => {
        console.log(`Executing: ${toolCall.name}`, toolCall.input)

        // Execute the actual tool function
        const result = await executeToolFunction(
          toolCall.name,
          toolCall.input,
          imageData, // Original image as input
          (progress, message) => {
            // Send progress updates to frontend
            // Could use WebSocket or Server-Sent Events here
            console.log(`${toolCall.name}: ${progress}% - ${message}`)
          }
        )

        // Return result in Claude's expected format
        return {
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify({
            success: result.success,
            resultImageUrl: result.result?.imageUrl, // Blob URL of processed image
            message: result.result?.message || result.error
          })
        }
      })
    )

    // STEP 3: Send tool results back to Claude for final response
    const finalResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        ...conversationHistory,
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageData } },
            { type: 'text', text: message }
          ]
        },
        {
          role: 'assistant',
          content: analysisResponse.content // Claude's tool calls
        },
        {
          role: 'user',
          content: toolResults // Tool execution results
        }
      ]
    })

    return {
      message: finalResponse.content[0].text,
      toolResults: toolResults.map(r => JSON.parse(r.content)),
      conversationHistory: [...conversationHistory, /* updated messages */]
    }
  }

  // No tools needed, just text response
  return {
    message: analysisResponse.content[0].text,
    toolResults: [],
    conversationHistory: [...conversationHistory, /* updated messages */]
  }
}
```

---

### Step 2.3: Tool Execution (Existing Code)

```typescript
// lib/ai-tools-orchestrator.ts (YOUR EXISTING FILE)

export async function executeToolFunction(
  toolName: string,
  parameters: any,
  imageUrl: string,
  onProgress?: (progress: number, message: string) => void
): Promise<{ success: boolean; result?: any; error?: string }> {

  try {
    switch (toolName) {
      case 'color_knockout': {
        const { colors, tolerance = 30, replaceMode = 'transparency', antiAliasing = true } = parameters

        onProgress?.(10, 'Loading image...')

        const selectedColors: SelectedColor[] = colors.map((c: any) => ({
          r: c.r,
          g: c.g,
          b: c.b,
          hex: c.hex
        }))

        onProgress?.(30, 'Analyzing colors...')

        // YOUR EXISTING IMPLEMENTATION
        const blob = await performColorKnockout({
          imageUrl,
          selectedColors,
          settings: {
            tolerance,
            replaceMode,
            antiAliasing,
            edgeSmoothing: 0.5
          },
          onProgress
        })

        onProgress?.(100, 'Complete!')

        // Convert blob to URL for display
        const resultUrl = URL.createObjectURL(blob)

        return {
          success: true,
          result: {
            imageUrl: resultUrl,
            message: 'White background removed successfully'
          }
        }
      }

      case 'recolor_image': {
        // Similar flow for recolor tool
        const palette = await extractColors(imageUrl, { paletteSize: 9 })
        const blob = await recolorImage(imageUrl, palette, parameters)
        const resultUrl = URL.createObjectURL(blob)

        return {
          success: true,
          result: {
            imageUrl: resultUrl,
            message: 'Colors boosted for black fabric'
          }
        }
      }

      // ... other tools

      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed'
    }
  }
}
```

---

## Phase 3: Display Results on Canvas

### Step 3.1: Frontend Receives Results

```typescript
// components/panels/ai-chat-panel.tsx

const handleSendMessage = async () => {
  // ... (previous code)

  const response = await fetch('/api/ai/chat', { ... })
  const data = await response.json()

  // data = {
  //   message: "I've removed the white background and boosted colors...",
  //   toolResults: [
  //     { success: true, resultImageUrl: "blob:http://localhost:3000/abc123", message: "..." },
  //     { success: true, resultImageUrl: "blob:http://localhost:3000/def456", message: "..." }
  //   ],
  //   conversationHistory: [...]
  // }

  // Display AI's text message
  addMessage("success", data.message)

  // Display tool results
  if (data.toolResults && data.toolResults.length > 0) {
    data.toolResults.forEach((result, index) => {
      if (result.success) {
        // Show before/after comparison
        addMessage("success", `Tool ${index + 1}: ${result.message}`, [
          <ImageComparison
            before={imageUrl}
            after={result.resultImageUrl}
          />
        ])

        // UPDATE MAIN CANVAS with final result
        if (index === data.toolResults.length - 1) {
          // Last tool result becomes the new canvas image
          updateCanvasImage(result.resultImageUrl)
        }
      }
    })
  }
}
```

---

### Step 3.2: Update Canvas

```typescript
// lib/image-store.ts (YOUR EXISTING ZUSTAND STORE)

interface ImageStore {
  imageUrl: string | null
  setImageUrl: (url: string | null) => void

  // NEW: Track edit history for undo/redo
  history: string[]
  historyIndex: number
  addToHistory: (url: string) => void
  undo: () => void
  redo: () => void
}

export const useImageStore = create<ImageStore>((set, get) => ({
  imageUrl: null,
  history: [],
  historyIndex: -1,

  setImageUrl: (url) => set({ imageUrl: url }),

  addToHistory: (url) => set((state) => ({
    history: [...state.history.slice(0, state.historyIndex + 1), url],
    historyIndex: state.historyIndex + 1,
    imageUrl: url
  })),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1
      return {
        historyIndex: newIndex,
        imageUrl: state.history[newIndex]
      }
    }
    return state
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1
      return {
        historyIndex: newIndex,
        imageUrl: state.history[newIndex]
      }
    }
    return state
  })
}))
```

```typescript
// Helper function to update canvas
function updateCanvasImage(newImageUrl: string) {
  const { addToHistory } = useImageStore.getState()

  // Add to history for undo/redo
  addToHistory(newImageUrl)

  // Canvas component automatically re-renders when imageUrl changes
}
```

---

## Phase 4: Continuous Conversation (Multi-Turn)

### Step 4.1: Maintaining Context

```typescript
// lib/message-store.ts (ENHANCED)

interface MessageStore {
  // UI messages (what user sees)
  messages: Message[]

  // AI conversation context (what AI sees)
  conversationHistory: ConversationMessage[]

  addMessage: (type: MessageType, content: string, details?: string[]) => void
  addToConversation: (role: 'user' | 'assistant', content: string, imageUrl?: string) => void

  clearMessages: () => void
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: Array<{
    type: 'text' | 'image' | 'tool_use' | 'tool_result'
    text?: string
    source?: { type: 'base64' | 'url', data: string }
    name?: string
    input?: any
    tool_use_id?: string
  }>
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  conversationHistory: [],

  addToConversation: (role, content, imageUrl) => set((state) => ({
    conversationHistory: [
      ...state.conversationHistory,
      {
        role,
        content: imageUrl
          ? [
              { type: 'image', source: { type: 'url', data: imageUrl } },
              { type: 'text', text: content }
            ]
          : [{ type: 'text', text: content }]
      }
    ]
  })),

  // ...
}))
```

---

### Step 4.2: Follow-Up Request Example

**Conversation Flow:**

```typescript
// Turn 1:
User: "Make this design pop on black fabric"
AI: [executes color_knockout + recolor_image]
AI: "I've removed the white background and boosted colors for black fabric ✓"

conversationHistory = [
  { role: 'user', content: [{ type: 'image', ... }, { type: 'text', text: '...' }] },
  { role: 'assistant', content: [{ type: 'text', text: '...' }, { type: 'tool_use', ... }] },
  { role: 'user', content: [{ type: 'tool_result', ... }] },
  { role: 'assistant', content: [{ type: 'text', text: 'I've removed...' }] }
]

// Turn 2:
User: "Actually, make the blue brighter"
// AI already knows:
// - Current image state (from tool_result in history)
// - Previous actions (color_knockout + recolor were applied)
// - User's intent (wants brighter blue specifically)

AI: [executes recolor_image with higher saturation for blue only]
AI: "Blue is now brighter ✓"

conversationHistory = [
  ... previous messages ...,
  { role: 'user', content: [{ type: 'text', text: 'Actually, make the blue brighter' }] },
  { role: 'assistant', content: [{ type: 'tool_use', name: 'recolor_image', input: {...} }] },
  { role: 'user', content: [{ type: 'tool_result', ... }] },
  { role: 'assistant', content: [{ type: 'text', text: 'Blue is now brighter ✓' }] }
]

// Turn 3:
User: "Show me how this looks on a black t-shirt"
AI: [executes generate_mockup]
AI: "Here's your design on a black Gildan 5000 ✓ [shows mockup]"
```

**Key Point:** Each turn appends to `conversationHistory`, so AI has full context of:
- Original image
- All edits made
- User preferences expressed
- Current state of design

---

## Phase 5: Handling Ambiguity & Clarification

### Step 5.1: Ambiguous Request Detection

```typescript
// lib/ai-chat-orchestrator.ts

const AMBIGUOUS_PATTERNS = {
  'enhance': ['brightness', 'contrast', 'colors', 'sharpness'],
  'fix': ['quality', 'colors', 'composition', 'print-readiness'],
  'make it better': ['visual appeal', 'print quality', 'color accuracy'],
  'improve': ['specific area', 'overall design', 'technical specs'],
  'adjust': ['which property', 'colors', 'size', 'position'],
  'change': ['what specifically', 'colors', 'layout', 'effects']
}

function detectAmbiguity(userMessage: string): {
  isAmbiguous: boolean
  ambiguousWord?: string
  clarificationOptions?: string[]
} {
  const messageLower = userMessage.toLowerCase()

  for (const [word, options] of Object.entries(AMBIGUOUS_PATTERNS)) {
    if (messageLower.includes(word)) {
      // Check if user specified details
      const hasDetails = options.some(opt => messageLower.includes(opt))

      if (!hasDetails) {
        return {
          isAmbiguous: true,
          ambiguousWord: word,
          clarificationOptions: options
        }
      }
    }
  }

  return { isAmbiguous: false }
}
```

---

### Step 5.2: Clarification Flow

```typescript
// System prompt addition:

system: `...

AMBIGUITY HANDLING PROTOCOL:
When user request is ambiguous, follow this decision tree:

1. VAGUE VERBS (enhance, fix, improve, adjust, change):
   - DON'T assume - ASK for specifics
   - Format: "I can [option 1], [option 2], or [option 3]. Which would you prefer?"
   - Example: "enhance" → "I can enhance brightness, contrast, or color saturation. Which?"

2. CONTEXT CLUES:
   - "for printing" → Assume DPI/quality improvements
   - "for [fabric color]" → Assume contrast/color adjustments
   - "looks off" → Ask what specifically looks wrong
   - "too [adjective]" → CLEAR - adjust that property

3. CONFIDENCE THRESHOLD:
   - >80% confident → Propose action, wait for confirmation
   - 50-80% confident → Suggest option, ask "Is this what you want?"
   - <50% confident → Ask clarifying question

4. CLARIFICATION RESPONSE FORMAT:
   {
     "type": "text",
     "text": "I can help with that! To give you the best result, which would you prefer?\n\n1. 🎨 Enhance color vibrancy\n2. 💡 Adjust brightness/contrast\n3. 🔍 Sharpen details\n\nOr tell me specifically what you'd like to improve!"
   }

   DON'T use tools until user clarifies.

5. FALLBACK SYNONYMS:
   - "pop" = increase contrast/saturation
   - "clean up" = remove background OR adjust brightness
   - "professional" = 300 DPI + proper format
   - "print-ready" = DPI check + format + color mode`
```

---

### Step 5.3: Example Ambiguity Handling

```typescript
// Conversation Example:

// Turn 1: Ambiguous
User: "Can you enhance this design?"

// AI detects ambiguity
const ambiguity = detectAmbiguity("Can you enhance this design?")
// { isAmbiguous: true, ambiguousWord: 'enhance', clarificationOptions: [...] }

// AI Response (NO TOOL USE):
AI: {
  content: [
    {
      type: "text",
      text: "I can enhance this design in several ways:\n\n1. 🎨 Boost color vibrancy and saturation\n2. 💡 Adjust brightness and contrast\n3. 🔍 Sharpen details and edges\n4. 📐 Upscale for higher print quality\n\nWhich enhancement would help most?"
    }
  ],
  stop_reason: "end_turn" // NO tool_use
}

// Turn 2: User clarifies
User: "Boost the colors"

// AI now has clear intent
AI: {
  content: [
    {
      type: "text",
      text: "Boosting color vibrancy now..."
    },
    {
      type: "tool_use",
      name: "recolor_image",
      input: {
        colorMappings: [...],
        blendMode: "overlay", // More vibrant
        tolerance: 30
      }
    }
  ],
  stop_reason: "tool_use"
}
```

---

### Step 5.4: Synonym/Natural Language Mapping

```typescript
// lib/intent-parser.ts (NEW FILE)

interface Intent {
  action: string
  confidence: number
  suggestedTool?: string
  parameters?: any
  needsClarification?: boolean
  clarificationQuestion?: string
}

export function parseUserIntent(
  message: string,
  imageAnalysis?: any
): Intent {

  const messageLower = message.toLowerCase()

  // CLEAR INTENTS (high confidence)

  if (messageLower.includes('remove background') ||
      messageLower.includes('remove bg') ||
      messageLower.includes('transparent background')) {
    return {
      action: 'remove_background',
      confidence: 95,
      suggestedTool: 'color_knockout',
      parameters: {
        colors: [{ hex: '#FFFFFF', r: 255, g: 255, b: 255 }], // Assume white
        tolerance: 30,
        replaceMode: 'transparency'
      }
    }
  }

  if (messageLower.includes('rotate')) {
    const degrees = messageLower.match(/(\d+)\s*degrees?/)?.[1]
    if (degrees) {
      return {
        action: 'rotate',
        confidence: 90,
        suggestedTool: 'rotate_image',
        parameters: { degrees: parseInt(degrees) }
      }
    } else {
      return {
        action: 'rotate',
        confidence: 60,
        needsClarification: true,
        clarificationQuestion: 'Rotate by how many degrees? (90, 180, or 270)'
      }
    }
  }

  if ((messageLower.includes('pop') || messageLower.includes('stand out')) &&
      messageLower.includes('black')) {
    return {
      action: 'optimize_for_black_fabric',
      confidence: 85,
      suggestedTool: 'multi_tool',
      parameters: {
        tools: ['color_knockout', 'recolor_image'],
        reasoning: 'Remove white BG + boost saturation for dark fabric'
      }
    }
  }

  // AMBIGUOUS INTENTS (low confidence)

  if (messageLower.includes('enhance') ||
      messageLower.includes('improve') ||
      messageLower.includes('make it better')) {
    return {
      action: 'enhance',
      confidence: 30,
      needsClarification: true,
      clarificationQuestion: 'What would you like to enhance?\n1. Color vibrancy\n2. Brightness/contrast\n3. Sharpness\n4. Print quality (DPI)'
    }
  }

  if (messageLower.includes('fix')) {
    return {
      action: 'fix',
      confidence: 20,
      needsClarification: true,
      clarificationQuestion: 'What needs fixing? I can help with:\n- Color issues\n- Low quality/DPI\n- Background removal\n- Sizing problems'
    }
  }

  // CONTEXT-AWARE INTENTS

  if (messageLower.includes('print') || messageLower.includes('printing')) {
    // Check DPI from image analysis
    if (imageAnalysis?.dpi < 300) {
      return {
        action: 'prepare_for_print',
        confidence: 80,
        suggestedTool: 'upscaler',
        parameters: {
          scale: Math.ceil(300 / imageAnalysis.dpi),
          reasoning: 'Current DPI too low for printing'
        }
      }
    }
  }

  // FALLBACK: Let Claude handle it
  return {
    action: 'unknown',
    confidence: 0,
    needsClarification: false // Let Claude's intelligence parse it
  }
}
```

---

### Step 5.5: Integration with AI Chat

```typescript
// lib/ai-chat-orchestrator.ts (ENHANCED)

export async function aiChatWithVisionAndTools({ message, imageData, ... }) {

  // STEP 0: Pre-analyze intent
  const intent = parseUserIntent(message)

  if (intent.needsClarification) {
    // Return clarification question immediately (no API call needed)
    return {
      message: intent.clarificationQuestion,
      toolResults: [],
      conversationHistory: [...]
    }
  }

  // STEP 1: Build enhanced system prompt with intent hint
  let systemPrompt = BASE_SYSTEM_PROMPT

  if (intent.confidence > 70) {
    systemPrompt += `\n\nUSER INTENT HINT: This request likely means "${intent.action}".
Suggested tool: ${intent.suggestedTool}
Confidence: ${intent.confidence}%

You can use this hint to guide your response, but analyze the image yourself to confirm.`
  }

  // STEP 2: Call Claude with enhanced context
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    system: systemPrompt,
    messages: [...],
    tools: toolDefinitions
  })

  // ... (rest of flow)
}
```

---

## Phase 6: Error Handling & Fallbacks

### Step 6.1: Tool Execution Failures

```typescript
// lib/ai-tools-orchestrator.ts

export async function executeToolFunction(toolName, parameters, imageUrl, onProgress) {
  try {
    // ... tool execution
  } catch (error) {
    console.error(`Tool ${toolName} failed:`, error)

    // FALLBACK STRATEGIES

    if (toolName === 'color_knockout' && error.message.includes('timeout')) {
      // Fallback: Use lower tolerance
      return executeToolFunction(toolName, {
        ...parameters,
        tolerance: parameters.tolerance - 10
      }, imageUrl, onProgress)
    }

    if (toolName === 'upscaler' && error.message.includes('file too large')) {
      // Fallback: Use smaller scale
      return executeToolFunction(toolName, {
        ...parameters,
        scale: Math.max(2, parameters.scale - 1)
      }, imageUrl, onProgress)
    }

    if (toolName === 'generate_mockup' && error.message.includes('API error')) {
      // Fallback: Retry once after 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000))
      return executeToolFunction(toolName, parameters, imageUrl, onProgress)
    }

    // No fallback available
    return {
      success: false,
      error: `${toolName} failed: ${error.message}`,
      fallbackSuggestion: 'Try adjusting the settings or uploading a smaller image'
    }
  }
}
```

---

### Step 6.2: AI Communicates Failures

```typescript
// When tool fails, Claude receives error in tool_result:

{
  role: 'user',
  content: [
    {
      type: 'tool_result',
      tool_use_id: 'tool_call_1',
      content: JSON.stringify({
        success: false,
        error: 'color_knockout failed: Image too large for processing',
        fallbackSuggestion: 'Try uploading a smaller image or reducing quality'
      })
    }
  ]
}

// Claude's response:
{
  content: [
    {
      type: 'text',
      text: "I wasn't able to remove the background because the image is too large for processing. Here are your options:\n\n1. I can resize the image first, then remove the background\n2. You can upload a smaller version\n\nWould you like me to resize it automatically?"
    }
  ]
}
```

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  USER: "Make this design pop on black fabric"               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND: ai-chat-panel.tsx                                │
│  - Convert canvas to base64                                 │
│  - Send to /api/ai/chat                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND: app/api/ai/chat/route.ts                          │
│  - Receive message + imageData                              │
│  - Call aiChatWithVisionAndTools()                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR: lib/ai-chat-orchestrator.ts                  │
│                                                              │
│  STEP 1: Pre-analyze intent                                 │
│  ├─ parseUserIntent("make this pop...")                     │
│  ├─ Detects: "optimize_for_black_fabric"                    │
│  └─ Confidence: 85% ✓                                       │
│                                                              │
│  STEP 2: Call Claude Vision API                             │
│  ├─ Send image (base64)                                     │
│  ├─ Send message                                            │
│  ├─ Send tool definitions                                   │
│  └─ Send system prompt (print expertise)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  CLAUDE VISION: Analyzes Image                              │
│                                                              │
│  What Claude "sees":                                        │
│  ├─ Dominant colors: Blue (#2563EB), Yellow (#FCD34D)       │
│  ├─ Background: White (#FFFFFF)                             │
│  ├─ Contrast on black fabric: LOW (3.5:1)                   │
│  └─ Recommendation: Remove white BG + boost saturation      │
│                                                              │
│  Claude's reasoning:                                        │
│  "User wants design to 'pop' on black fabric.               │
│   Current white background will be invisible.               │
│   Blue/yellow need higher saturation for dark backgrounds.  │
│   I'll use color_knockout + recolor_image tools."           │
│                                                              │
│  Claude's response:                                         │
│  ├─ Text: "I'll remove the white background and boost..."   │
│  ├─ tool_use: color_knockout (white, tolerance: 20)         │
│  └─ tool_use: recolor_image (boost saturation 30%)          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR: Execute Tools in Parallel                    │
│                                                              │
│  Promise.all([                                              │
│    executeToolFunction('color_knockout', {...}),            │
│    executeToolFunction('recolor_image', {...})              │
│  ])                                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  TOOL EXECUTOR: lib/ai-tools-orchestrator.ts                │
│                                                              │
│  Tool 1: color_knockout                                     │
│  ├─ Load image from base64                                  │
│  ├─ Call performColorKnockout() (YOUR EXISTING CODE)        │
│  ├─ Process: Remove white pixels (tolerance: 20)            │
│  ├─ Return: Blob with transparent background                │
│  └─ Convert to URL: blob:http://localhost:3000/abc123       │
│                                                              │
│  Tool 2: recolor_image                                      │
│  ├─ Extract current palette (YOUR EXISTING CODE)            │
│  ├─ Apply color mappings (boost saturation)                 │
│  ├─ Return: Blob with enhanced colors                       │
│  └─ Convert to URL: blob:http://localhost:3000/def456       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR: Send Results Back to Claude                  │
│                                                              │
│  anthropic.messages.create({                                │
│    messages: [                                              │
│      ... previous conversation ...,                         │
│      { role: 'assistant', content: [tool_use blocks] },     │
│      { role: 'user', content: [                             │
│        { type: 'tool_result', content: {                    │
│          success: true,                                     │
│          resultImageUrl: "blob:...abc123"                   │
│        }},                                                  │
│        { type: 'tool_result', content: {                    │
│          success: true,                                     │
│          resultImageUrl: "blob:...def456"                   │
│        }}                                                   │
│      ]}                                                     │
│    ]                                                        │
│  })                                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  CLAUDE: Generate Final Response                            │
│                                                              │
│  Claude sees tool results succeeded.                        │
│  Claude crafts final message:                               │
│                                                              │
│  "Done! I've removed the white background and boosted the   │
│   blue and yellow colors to create better contrast on black │
│   fabric. The design will now really pop! ✓                 │
│                                                              │
│   Would you like to see a mockup on a black t-shirt?"       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND: Return to Frontend                                │
│                                                              │
│  return {                                                   │
│    message: "Done! I've removed...",                        │
│    toolResults: [                                           │
│      { resultImageUrl: "blob:...abc123", ... },             │
│      { resultImageUrl: "blob:...def456", ... }              │
│    ],                                                       │
│    conversationHistory: [...updated...]                     │
│  }                                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND: Display Results                                  │
│                                                              │
│  1. Add AI message to chat                                  │
│  2. Show before/after comparison                            │
│  3. Update main canvas with final result                    │
│  4. Add to history for undo/redo                            │
│  5. Store conversation for next turn                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary: The 6 Critical Pieces

**1. Vision Input**
- Canvas → base64 → Claude sees it as image

**2. AI Analysis + Decision**
- Claude analyzes visually + understands intent
- Selects appropriate tools
- Extracts correct parameters from context

**3. Tool Execution**
- Your existing `executeToolFunction()` runs the tools
- Returns blob URLs of processed images

**4. Result Display**
- Blob URLs update canvas and chat
- History tracked for undo/redo

**5. Conversation Memory**
- Full message history maintained
- Each turn builds on previous context

**6. Ambiguity Handling**
- Intent parser detects unclear requests
- AI asks clarifying questions
- Only acts when confident

---

## Next Implementation Steps

Want me to create the actual code files to implement this flow? I can use your 46 agents to:

1. **backend-architect**: Design the complete API structure
2. **typescript-pro**: Implement ai-chat-orchestrator.ts
3. **ai-engineer**: Build intent-parser.ts and enhance ai-service.ts
4. **frontend-developer**: Upgrade ai-chat-panel.tsx with result display
5. **test-engineer**: Create tests for the entire flow

Should I start building this?
