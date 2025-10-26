# AI Chat Assistant - Simple Implementation Plan

## THE GOAL (Crystal Clear)

Build an AI chat assistant that:
- **Sees** the uploaded design (Claude Vision)
- **Understands** natural language requests ("remove background", "make it pop on black fabric")
- **Executes** your existing tools autonomously
- **Shows** results in chat and updates canvas
- **Continues** conversation with full context

**No over-engineering. Just make it work.**

---

## What Already Exists (Your Foundation)

### ✅ Working Right Now:

**1. AI Chat UI**
- `components/panels/ai-chat-panel.tsx`
- Model selector (Claude/Gemini)
- Message display
- Input field

**2. AI Service**
- `lib/ai-service.ts`
- Claude Sonnet 4.5 integration
- Gemini 2.5 Pro integration
- Can receive images

**3. Tool Orchestrator**
- `lib/ai-tools-orchestrator.ts`
- 5 tool definitions with schemas
- `executeToolFunction()` works

**4. Working Tools**
- `lib/tools/color-knockout.ts` - Remove colors ✅
- `lib/tools/recolor.ts` - Extract palette + recolor ✅
- `lib/tools/texture-cut.ts` - Texture masks ✅
- `lib/tools/background-remover.ts` - BG removal (Replicate) ✅
- `lib/tools/upscaler.ts` - Upscale (Replicate) ✅

---

## What's Missing (The Gap)

### ❌ NOT Connected Yet:

**The Missing Link:** AI chat doesn't automatically call tools

**Current Flow:**
```
User: "Remove the background"
    ↓
AI: "Sure, I can help with that" (just text response)
    ↓
User: *manually opens color-knockout panel*
    ↓
User: *manually clicks Apply*
```

**Target Flow:**
```
User: "Remove the background"
    ↓
AI: Sees image → Understands intent → Calls color_knockout tool
    ↓
Tool executes automatically
    ↓
AI: "Done! Background removed ✓" [shows result]
    ↓
Canvas updates with new image
```

---

## The 5 Files to Build/Modify

### File 1: AI Chat Orchestrator (NEW)
**Path:** `lib/ai-chat-orchestrator.ts`

**Purpose:** Connect Claude Vision → Tool Execution → Results

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { executeToolFunction, toolDefinitions } from './ai-tools-orchestrator'

export async function chatWithVisionAndTools({
  message: string,
  imageUrl: string,
  conversationHistory: ConversationMessage[]
}): Promise<{
  textResponse: string
  toolResults: ToolResult[]
  updatedHistory: ConversationMessage[]
}> {

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Convert imageUrl to base64
  const imageData = await imageUrlToBase64(imageUrl)

  // Step 1: Call Claude with vision + tools
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    tools: toolDefinitions,
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
              data: imageData
            }
          },
          {
            type: 'text',
            text: message
          }
        ]
      }
    ],
    system: `You are an expert AI Design Assistant for print production.

When users request changes to their design, use the available tools to execute them.

Available tools:
- color_knockout: Remove specific colors (backgrounds, etc.)
- extract_color_palette: Analyze image colors
- recolor_image: Change color schemes
- texture_cut: Apply texture effects
- pick_color_at_position: Sample colors

Be conversational and helpful. Execute tools when appropriate.`
  })

  // Step 2: Check if Claude wants to use tools
  if (response.stop_reason === 'tool_use') {
    const toolCalls = response.content.filter(c => c.type === 'tool_use')

    // Step 3: Execute all tools in parallel
    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const result = await executeToolFunction(
          toolCall.name,
          toolCall.input,
          imageUrl
        )

        return {
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(result)
        }
      })
    )

    // Step 4: Send results back to Claude for final response
    const finalResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        ...conversationHistory,
        { role: 'user', content: [/* image + message */] },
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults }
      ]
    })

    return {
      textResponse: finalResponse.content[0].text,
      toolResults: toolResults.map(r => JSON.parse(r.content)),
      updatedHistory: [/* updated conversation */]
    }
  }

  // No tools needed, just text
  return {
    textResponse: response.content[0].text,
    toolResults: [],
    updatedHistory: [/* updated conversation */]
  }
}
```

---

### File 2: API Route (MODIFY)
**Path:** `app/api/ai/chat/route.ts`

**Changes:** Call new orchestrator instead of basic chat

```typescript
import { chatWithVisionAndTools } from '@/lib/ai-chat-orchestrator'

export async function POST(request: NextRequest) {
  const { message, imageUrl, conversationHistory } = await request.json()

  try {
    const result = await chatWithVisionAndTools({
      message,
      imageUrl,
      conversationHistory
    })

    return NextResponse.json(result)

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

---

### File 3: AI Chat Panel (MODIFY)
**Path:** `components/panels/ai-chat-panel.tsx`

**Changes:** Display tool results and update canvas

```typescript
const handleSendMessage = async () => {
  const userMessage = inputValue.trim()
  const { imageUrl } = useImageStore.getState()

  // Add user message to UI
  addMessage("info", userMessage)

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        imageUrl: imageUrl, // Current canvas image
        conversationHistory: conversationHistory
      })
    })

    const data = await response.json()

    // Display AI's text response
    addMessage("success", data.textResponse)

    // Display tool results
    if (data.toolResults && data.toolResults.length > 0) {
      data.toolResults.forEach((result, index) => {
        if (result.success) {
          // Show result message
          addMessage("success", result.result.message)

          // Update canvas with new image (last result)
          if (index === data.toolResults.length - 1) {
            const newImageUrl = result.result.imageUrl
            useImageStore.getState().setImageUrl(newImageUrl)
          }
        } else {
          addMessage("error", result.error)
        }
      })
    }

    // Update conversation history
    setConversationHistory(data.updatedHistory)

  } catch (error) {
    addMessage("error", "Failed to process request", [error.message])
  }
}
```

---

### File 4: New Tools (CREATE)

**A. Rotate Tool**
**Path:** `lib/tools/rotate-image.ts`

```typescript
export async function rotateImage(
  imageUrl: string,
  degrees: 90 | 180 | 270,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {

  onProgress?.(20, 'Loading image...')

  const img = await loadImage(imageUrl)

  const canvas = document.createElement('canvas')

  // Swap width/height for 90/270 degree rotations
  if (degrees === 90 || degrees === 270) {
    canvas.width = img.height
    canvas.height = img.width
  } else {
    canvas.width = img.width
    canvas.height = img.height
  }

  const ctx = canvas.getContext('2d')!

  onProgress?.(50, 'Rotating...')

  // Translate to center
  ctx.translate(canvas.width / 2, canvas.height / 2)

  // Rotate
  ctx.rotate((degrees * Math.PI) / 180)

  // Draw image
  ctx.drawImage(img, -img.width / 2, -img.height / 2)

  onProgress?.(100, 'Complete!')

  return canvasToBlob(canvas)
}
```

**B. Crop Tool**
**Path:** `lib/tools/crop-image.ts`

```typescript
export async function cropImage(
  imageUrl: string,
  cropArea: { x: number, y: number, width: number, height: number },
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {

  onProgress?.(20, 'Loading image...')

  const img = await loadImage(imageUrl)

  const canvas = document.createElement('canvas')
  canvas.width = cropArea.width
  canvas.height = cropArea.height

  const ctx = canvas.getContext('2d')!

  onProgress?.(50, 'Cropping...')

  // Draw cropped portion
  ctx.drawImage(
    img,
    cropArea.x, cropArea.y, cropArea.width, cropArea.height,
    0, 0, cropArea.width, cropArea.height
  )

  onProgress?.(100, 'Complete!')

  return canvasToBlob(canvas)
}
```

**C. Brightness Tool**
**Path:** `lib/tools/adjust-brightness.ts`

```typescript
export async function adjustBrightness(
  imageUrl: string,
  adjustment: number, // -100 to +100
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {

  onProgress?.(20, 'Loading image...')

  const img = await loadImage(imageUrl)

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  onProgress?.(50, 'Adjusting brightness...')

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // Adjust each pixel
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] + adjustment))     // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment)) // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment)) // B
    // data[i + 3] is alpha, leave unchanged
  }

  ctx.putImageData(imageData, 0, 0)

  onProgress?.(100, 'Complete!')

  return canvasToBlob(canvas)
}
```

**D. Format Conversion Tool**
**Path:** `lib/tools/convert-format.ts`

```typescript
export async function convertFormat(
  imageUrl: string,
  targetFormat: 'png' | 'jpeg' | 'webp',
  quality: number = 0.92,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {

  onProgress?.(20, 'Loading image...')

  const img = await loadImage(imageUrl)

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height

  const ctx = canvas.getContext('2d')!

  // For JPEG, fill white background (no transparency)
  if (targetFormat === 'jpeg') {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.drawImage(img, 0, 0)

  onProgress?.(50, `Converting to ${targetFormat.toUpperCase()}...`)

  const mimeType = `image/${targetFormat}`

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      onProgress?.(100, 'Complete!')
      resolve(blob!)
    }, mimeType, quality)
  })
}
```

---

### File 5: Update Tool Orchestrator (MODIFY)
**Path:** `lib/ai-tools-orchestrator.ts`

**Changes:** Add new tool definitions

```typescript
// Add to toolDefinitions array:

{
  name: 'rotate_image',
  description: 'Rotate image by 90, 180, or 270 degrees',
  parameters: {
    type: 'object',
    properties: {
      degrees: {
        type: 'number',
        enum: [90, 180, 270],
        description: 'Rotation angle'
      }
    },
    required: ['degrees']
  }
},
{
  name: 'crop_image',
  description: 'Crop image to specified area',
  parameters: {
    type: 'object',
    properties: {
      x: { type: 'number', description: 'X coordinate of top-left corner' },
      y: { type: 'number', description: 'Y coordinate of top-left corner' },
      width: { type: 'number', description: 'Width of crop area' },
      height: { type: 'number', description: 'Height of crop area' }
    },
    required: ['x', 'y', 'width', 'height']
  }
},
{
  name: 'adjust_brightness',
  description: 'Adjust image brightness',
  parameters: {
    type: 'object',
    properties: {
      adjustment: {
        type: 'number',
        description: 'Brightness adjustment from -100 (darker) to +100 (brighter)',
        minimum: -100,
        maximum: 100
      }
    },
    required: ['adjustment']
  }
},
{
  name: 'convert_format',
  description: 'Convert image to different format (PNG, JPEG, WebP)',
  parameters: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['png', 'jpeg', 'webp'],
        description: 'Target format'
      },
      quality: {
        type: 'number',
        description: 'Quality for JPEG/WebP (0-1)',
        minimum: 0,
        maximum: 1,
        default: 0.92
      }
    },
    required: ['format']
  }
}

// Add to executeToolFunction switch statement:

case 'rotate_image': {
  const { degrees } = parameters
  const blob = await rotateImage(imageUrl, degrees, onProgress)
  const resultUrl = URL.createObjectURL(blob)
  return {
    success: true,
    result: {
      imageUrl: resultUrl,
      message: `Image rotated ${degrees}°`
    }
  }
}

case 'crop_image': {
  const { x, y, width, height } = parameters
  const blob = await cropImage(imageUrl, { x, y, width, height }, onProgress)
  const resultUrl = URL.createObjectURL(blob)
  return {
    success: true,
    result: {
      imageUrl: resultUrl,
      message: 'Image cropped'
    }
  }
}

case 'adjust_brightness': {
  const { adjustment } = parameters
  const blob = await adjustBrightness(imageUrl, adjustment, onProgress)
  const resultUrl = URL.createObjectURL(blob)
  return {
    success: true,
    result: {
      imageUrl: resultUrl,
      message: `Brightness adjusted ${adjustment > 0 ? '+' : ''}${adjustment}`
    }
  }
}

case 'convert_format': {
  const { format, quality = 0.92 } = parameters
  const blob = await convertFormat(imageUrl, format, quality, onProgress)
  const resultUrl = URL.createObjectURL(blob)
  return {
    success: true,
    result: {
      imageUrl: resultUrl,
      message: `Converted to ${format.toUpperCase()}`
    }
  }
}
```

---

## Implementation Timeline

### Day 1: Core Orchestrator (4-6 hours)
```
backend-architect: Review architecture
typescript-pro: Build ai-chat-orchestrator.ts
test-engineer: Create basic tests

Result: Claude can call existing tools autonomously
```

### Day 2: Frontend Integration (3-4 hours)
```
frontend-developer: Modify ai-chat-panel.tsx
    - Display tool results
    - Update canvas
    - Show before/after

Result: User sees tool execution in chat
```

### Day 3: New Tools (4-6 hours)
```
typescript-pro: Build 4 new tools
    - rotate_image.ts
    - crop_image.ts
    - adjust_brightness.ts
    - convert_format.ts

Result: 9 total tools available
```

### Day 4: Testing & Polish (3-4 hours)
```
test-engineer: Test natural language workflows
    - "Remove background" → works
    - "Rotate 90 degrees" → works
    - "Make it brighter" → works
    - "Convert to PNG" → works

Result: MVP ready
```

**Total: 15-20 hours = 2-3 days with your agents**

---

## Example Natural Language Workflows

### Workflow 1: Background Removal
```
User: "Remove the background"
    ↓
AI: [Sees image with white background]
    ↓
AI: Calls color_knockout with colors: [#FFFFFF], tolerance: 25
    ↓
Tool executes
    ↓
AI: "Background removed ✓" [shows transparent result]
    ↓
Canvas updates
```

### Workflow 2: Make Print Ready
```
User: "Is this print ready?"
    ↓
AI: [Analyzes image visually]
    ↓
AI: "This appears to be low resolution. For quality printing, you need 300 DPI.
     Would you like me to upscale it?"
    ↓
User: "Yes"
    ↓
AI: Calls upscaler with scale: 4x
    ↓
AI: "Upscaled to print-ready resolution ✓"
```

### Workflow 3: Multi-Step Editing
```
User: "Make this pop on black fabric"
    ↓
AI: [Analyzes: white background, medium saturation colors]
    ↓
AI: Calls color_knockout (remove white) + recolor_image (boost saturation)
    ↓
AI: "I've removed the white background and boosted color saturation for black fabric ✓"
    ↓
User: "Rotate it 90 degrees"
    ↓
AI: Calls rotate_image with degrees: 90
    ↓
AI: "Rotated 90° ✓"
    ↓
User: "Convert to PNG"
    ↓
AI: Calls convert_format with format: 'png'
    ↓
AI: "Converted to PNG ✓ Ready to download."
```

---

## Start Building?

I can use your agents right now to build this:

**Use task-decomposition-expert to break down Day 1:**
```
"Break down building lib/ai-chat-orchestrator.ts:
1. File structure
2. Function signatures
3. Claude API integration with tools
4. Tool execution flow
5. Error handling
6. Type definitions

Then have typescript-pro implement it."
```

Should I start?
