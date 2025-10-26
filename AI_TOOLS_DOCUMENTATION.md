# AI Tools & Orchestration System Documentation

## Overview
The Flow Editor implements a comprehensive AI-powered image processing system with multiple tools, orchestration capabilities, and external API integrations.

---

## 1. AI Tools Implementation

### Tools Directory: `/lib/tools/`

#### 1.1 Background Remover Tool
**File:** `/lib/tools/background-remover.ts`
**Purpose:** Remove backgrounds from images using AI models via Replicate API
**Models:**
- **Bria RMBG** (Primary): High quality, fine detail preservation
- **CodeplugTech**: Fast general purpose removal
- **851 Labs** (Fallback): Reliable backup model

**Features:**
- Automatic model fallback on failure
- RGB conversion for compatibility
- Smart image compression for large files
- Multiple output formats (PNG, WebP)
- Optional solid background replacement

#### 1.2 Upscaler Tool
**File:** `/lib/tools/upscaler.ts`
**Purpose:** Enhance and upscale images using AI models
**Models:**
- **Standard (Real-ESRGAN)**: General purpose upscaling
- **Creative (Clarity Upscaler)**: Photographic enhancement
- **Anime (RealESRGAN Anime)**: Specialized for illustrations

**Features:**
- Scale factor: 1-10x
- Face enhancement option
- Creativity and resemblance controls (Creative model)
- Dynamic sharpening
- Prompt-based enhancement

#### 1.3 Recolor Tool
**File:** `/lib/tools/recolor.ts`
**Purpose:** Extract color palettes and recolor images using client-side processing

**Features:**
- Color palette extraction (9 or 36 colors)
- Smart/detailed extraction algorithms
- Color mapping with blend modes (replace, overlay, multiply)
- Tolerance-based matching
- LAB color space for perceptual accuracy
- Region detection with flood-fill algorithm
- deltaE2000 color difference calculation

#### 1.4 Color Knockout Tool
**File:** `/lib/tools/color-knockout.ts`
**Purpose:** Remove specific colors from images with tolerance control

**Features:**
- Multi-color selection
- Adjustable tolerance (0-100)
- Replace modes: transparency, color, mask
- Anti-aliasing for smooth edges
- Edge feathering (0-20px)
- Color picking from coordinates

#### 1.5 Texture Cut Tool
**File:** `/lib/tools/texture-cut.ts`
**Purpose:** Cut images using textures as masks (black cuts to transparent)

**Features:**
- Built-in pattern generation (dots, lines, grid, noise)
- Transform controls (scale, rotation, tiling)
- Cut strength adjustment
- Invert option (white cuts instead of black)
- Edge feathering support

---

## 2. AI Tools Orchestrator

**File:** `/lib/ai-tools-orchestrator.ts`

### Purpose
Provides a unified function-calling interface for AI Design Partner to use tools programmatically.

### Tool Definitions
```typescript
toolDefinitions = [
  'color_knockout',
  'extract_color_palette',
  'recolor_image',
  'texture_cut',
  'pick_color_at_position'
]
```

### Key Functions
- **executeToolFunction()**: Executes any tool by name with parameters
- **getAvailableTools()**: Lists all available tools
- **getToolDefinition()**: Returns schema for specific tool

### Integration Flow
1. AI receives user request
2. AI selects appropriate tool(s)
3. Orchestrator validates parameters
4. Tool executes with progress callbacks
5. Result returned as blob URL or data

---

## 3. AI Service Layer

**File:** `/lib/ai-service.ts`

### Purpose
Handles communication with AI language models (Anthropic Claude and Google Gemini).

### Supported Models
- **Claude Sonnet 4.5** (Anthropic)
- **Gemini 2.5 Pro** (Google)

### Features
- Multi-model support with fallback
- Image analysis capabilities
- Conversation history management
- System prompts for print production expertise
- Error handling and retry logic

### Expertise Areas
- Image analysis and validation
- Print production requirements (DPI, bleed, crop marks)
- Color theory and apparel printing
- Design recommendations
- File format conversions

---

## 4. Message Store

**File:** `/lib/message-store.ts`

### Purpose
Global state management for AI chat interactions using Zustand.

### State Management
- **messages**: UI message history with types (info, success, warning, error)
- **conversationHistory**: AI conversation context
- **isTyping**: Loading state indicator
- **selectedModel**: Active AI model selection

### Message Types
- **info**: General information
- **success**: Completed actions
- **warning**: Cautions
- **error**: Failures
- **processing**: In-progress

---

## 5. API Integrations

### 5.1 Replicate API Client
**File:** `/lib/api/replicate.ts`

**Features:**
- Prediction creation and polling
- Adaptive polling intervals with backoff
- Error handling with custom error codes
- Result downloading with retry
- Status message formatting

**Error Codes:**
- FILE_TOO_LARGE
- API_ERROR
- PROCESSING_ERROR
- TIMEOUT
- NETWORK_ERROR

### 5.2 API Routes

#### AI Chat Endpoint
**File:** `/app/api/ai/chat/route.ts`
- POST endpoint for AI conversations
- Handles model selection
- Image data support
- Error responses

#### Replicate Predictions
**Files:**
- `/app/api/replicate/predictions/route.ts` - Create predictions
- `/app/api/replicate/predictions/[id]/route.ts` - Get prediction status

---

## 6. UI Integration

### 6.1 AI Chat Panel
**File:** `/components/panels/ai-chat-panel.tsx`

**Features:**
- Model selector (Claude/Gemini)
- Real-time typing indicators
- Message history with icons
- Quick action buttons
- Auto-scroll on new messages
- Conversation cleanup on unmount

### 6.2 Tool-Specific Panels
Each tool has a dedicated UI panel:
- **BackgroundRemoverPanel**: `/components/panels/bg-remover-panel.tsx`
- **UpscalerPanel**: `/components/panels/upscaler-panel.tsx`
- **RecolorPanel**: `/components/panels/recolor-panel.tsx`
- **ColorKnockoutPanel**: `/components/panels/color-knockout-panel.tsx`
- **TextureCutPanel**: `/components/panels/texture-cut-panel.tsx`

---

## 7. Canvas Integration

### Canvas Utilities
**File:** `/lib/canvas-utils.ts`

**Key Functions:**
- **loadImage()**: Load images from URLs
- **applyFeather()**: Smooth edges
- **isPNGTransparent()**: Check for alpha channel
- **addWhiteBackgroundToImage()**: Handle transparency
- **compressImage()**: Optimize file sizes
- **convertToRGB()**: Format conversion

### File Utilities
**File:** `/lib/file-utils.ts`

**Key Functions:**
- **fileToDataUrl()**: Convert files to base64
- **canvasToBlob()**: Export canvas content
- **validateImageFile()**: Check file constraints
- **shouldCompressFile()**: Compression decision logic

---

## 8. External AI Services

### 8.1 Anthropic (Claude)
- **Model:** claude-sonnet-4-5-20250929
- **Max Tokens:** 4096
- **Features:** Vision, function calling, conversation context

### 8.2 Google (Gemini)
- **Model:** gemini-2.5-pro-latest
- **Max Tokens:** 4096
- **Features:** Vision, multi-modal content

### 8.3 Replicate Models
- **Background Removal:** 3 models with fallback
- **Upscaling:** 3 specialized models
- **Processing:** Asynchronous with polling

---

## 9. Environment Variables

Required API keys:
```env
ANTHROPIC_API_KEY=sk-...
GEMINI_API_KEY=...
REPLICATE_API_TOKEN=...
```

---

## 10. Processing Flow

### Typical Tool Execution:
1. User selects tool from UI or AI suggests tool
2. Image loaded and validated
3. Pre-processing (compression, format conversion)
4. Tool execution with progress updates
5. Result generation (blob URL)
6. UI update with before/after comparison
7. Download option available

### AI-Orchestrated Flow:
1. User describes desired outcome to AI
2. AI analyzes request and current image
3. AI selects appropriate tool(s)
4. Orchestrator executes with parameters
5. Results presented with explanation
6. Follow-up suggestions provided

---

## 11. Error Handling

### Levels:
1. **Tool Level**: Try-catch with specific error messages
2. **API Level**: HTTP status codes and error responses
3. **UI Level**: User-friendly error messages with details
4. **Fallback**: Alternative models or processing methods

### Common Error Scenarios:
- File too large: Automatic compression
- Model failure: Fallback to alternative
- Network timeout: Retry with backoff
- Invalid parameters: Validation before execution

---

## 12. Performance Optimizations

- **Image Resizing**: Automatic for analysis (max 500px)
- **Lazy Loading**: Tools loaded on demand
- **Caching**: Blob URLs cached in memory
- **Parallel Processing**: Multiple API calls when applicable
- **Progressive Updates**: Real-time progress indicators

---

## Quick Reference

### Add New Tool:
1. Create tool implementation in `/lib/tools/`
2. Add tool definition to orchestrator
3. Create UI panel in `/components/panels/`
4. Add to bottom dock menu
5. Update message handling if needed

### Common Imports:
```typescript
import { executeToolFunction } from '@/lib/ai-tools-orchestrator'
import { aiService } from '@/lib/ai-service'
import { useMessageStore } from '@/lib/message-store'
import { useImageStore } from '@/lib/image-store'
```

### Tool Execution Example:
```typescript
const result = await executeToolFunction(
  'color_knockout',
  {
    colors: [{ hex: '#FF0000', r: 255, g: 0, b: 0 }],
    tolerance: 30,
    replaceMode: 'transparency'
  },
  imageUrl,
  onProgress
)
```

---

Last Updated: October 2024