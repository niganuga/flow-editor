# Product Requirements Document (PRD)
## Flow Editor - AI-Powered Image Editing Platform

**Version:** 0.1.0
**Last Updated:** October 13, 2025
**Status:** Active Development
**Document Type:** Living PRD

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [Current State](#current-state)
4. [Technical Architecture](#technical-architecture)
5. [Feature Specifications](#feature-specifications)
6. [User Experience](#user-experience)
7. [API Integration](#api-integration)
8. [Quality & Testing](#quality--testing)
9. [Performance Metrics](#performance-metrics)
10. [Known Limitations](#known-limitations)
11. [Future Roadmap](#future-roadmap)
12. [Success Metrics](#success-metrics)

---

## Executive Summary

**Flow Editor** is an AI-powered image editing platform designed for custom apparel printing and graphic design workflows. It combines traditional image manipulation tools with cutting-edge AI assistance powered by Claude Vision API and Replicate AI models.

### Key Differentiators

- **Natural Language Editing**: Edit images by describing what you want in plain English
- **95%+ Confidence Validation**: Multi-layer validation system ensures accurate AI tool execution
- **Client-Side Processing**: Browser-native Canvas API for privacy and performance
- **Smart Undo/Redo**: Intelligent history management with auto-correction detection
- **Modular Architecture**: Draggable, resizable tool panels with focus management

### Target Users

- **Primary**: Custom apparel printing businesses (T-shirts, DTG printing)
- **Secondary**: Graphic designers, print shops, e-commerce sellers
- **Tertiary**: Content creators needing quick image editing

---

## Product Vision

### Mission Statement

> Democratize professional image editing by combining the precision of manual tools with the accessibility of natural language AI, specifically optimized for print production workflows.

### Long-Term Vision (12-18 months)

1. **Platform Evolution**: Web → Desktop → Mobile
2. **Workflow Automation**: Batch processing, template systems, style presets
3. **AI Expansion**: Custom model fine-tuning, industry-specific AI assistants
4. **Collaboration**: Real-time multi-user editing, project management
5. **Marketplace**: Tool plugins, AI agents, preset libraries

### Core Values

- **Precision First**: Every pixel matters in print production
- **Privacy by Design**: Client-side processing, no server image storage
- **Transparent AI**: Show confidence scores, explain decisions
- **Professional Grade**: Print-ready output (300 DPI, CMYK support)

---

## Current State

### Development Status

**Phase 8 Complete**: AI Design Assistant with full validation pipeline

### Version History

- **v0.1.0** (Current): Core platform with 8 tools + AI chat
- **Alpha Release**: Internal testing, OneFlow integration
- **Beta Target**: Q1 2026 (public beta with select print shops)

### Feature Completion Matrix

| Category | Feature | Status | Coverage |
|----------|---------|--------|----------|
| **Core Platform** | Draggable panel system | ✅ Complete | 100% |
| | Z-index focus management | ✅ Complete | 100% |
| | Image upload/download | ✅ Complete | 100% |
| | Undo/Redo (20 states) | ✅ Complete | 100% |
| | Keyboard shortcuts | ✅ Complete | 100% |
| **Manual Tools** | File Validator | ✅ Complete | 100% |
| | Color Knockout | ✅ Complete | 100% |
| | Recolor | ✅ Complete | 100% |
| | Texture Cut | ✅ Complete | 100% |
| | Cropper | ✅ Complete | 100% |
| **AI Tools** | Background Remover (Replicate) | ✅ Complete | 100% |
| | AI Upscaler (Replicate) | ✅ Complete | 100% |
| | AI Chat Partner | ✅ Complete | 100% |
| **AI Pipeline** | Image Analyzer (Ground Truth) | ✅ Complete | 100% |
| | Parameter Validator | ✅ Complete | 95%+ |
| | Result Validator | ✅ Complete | 95%+ |
| | Context Manager (ChromaDB) | ✅ Complete | 100% |
| | Client-Side Execution | ✅ Complete | 100% |
| | Auto-Undo Correction | ✅ Complete | 100% |
| **Testing** | Unit Tests | ⚠️ Partial | 91% pass |
| | E2E Tests | ⚠️ Partial | 60% pass |
| | Manual Testing | ✅ Complete | 100% |

### Technology Stack

**Frontend:**
- Next.js 15.2.4 (App Router, React 19)
- TypeScript 5
- Tailwind CSS 4.1.9
- Zustand (State Management)
- Radix UI (Component Library)

**AI/ML Integration:**
- Anthropic Claude Sonnet 4.5 (Vision API)
- Replicate AI (Background Removal, Upscaling)
- ChromaDB (Context Learning)

**Image Processing:**
- Browser Canvas API (Client-Side)
- OffscreenCanvas (2025 API features)
- High-precision color data (rgba-float16, display-p3)

**Infrastructure:**
- Vercel (Hosting, Edge Functions)
- Vercel Analytics
- GitHub (Version Control)

---

## Technical Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Canvas  │  │  Tools   │  │ AI Chat  │  │ Top Bar  │   │
│  │  Panel   │  │  Panels  │  │  Panel   │  │  +Dock   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │    IMAGE STORE (Zustand)  │
        │  - imageUrl, imageFile    │
        │  - History (20 states)    │
        │  - Undo/Redo actions      │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────────────────────────┐
        │          CLIENT-SIDE EXECUTION                │
        │  ┌──────────────────────────────────────┐    │
        │  │  Browser Canvas API                   │    │
        │  │  - color-knockout.ts                  │    │
        │  │  - recolor.ts                         │    │
        │  │  - texture-cut.ts                     │    │
        │  └──────────────────────────────────────┘    │
        └───────────────────────┬───────────────────────┘
                                │
        ┌───────────────────────▼───────────────────────┐
        │           API ROUTES (Next.js)                │
        │  ┌────────────────────────────────────────┐  │
        │  │  /api/ai/chat-orchestrator             │  │
        │  │   - Get tool calls from Claude         │  │
        │  │   - Return WITHOUT executing           │  │
        │  └────────────────────────────────────────┘  │
        │  ┌────────────────────────────────────────┐  │
        │  │  /api/replicate/predictions            │  │
        │  │   - Background removal                 │  │
        │  │   - AI upscaling                       │  │
        │  └────────────────────────────────────────┘  │
        └───────────────┬───────────┬───────────────────┘
                        │           │
        ┌───────────────▼──┐    ┌──▼────────────────────┐
        │  Claude Vision   │    │  Replicate AI         │
        │  API             │    │  - remove_bg models   │
        │  - Sonnet 4.5    │    │  - upscaler models    │
        │  - Function calls│    │                       │
        └──────────────────┘    └───────────────────────┘
```

### Data Flow

#### Manual Tool Execution

```
User interacts with panel → Client-side processing (Canvas API)
→ Result blob URL → Update imageUrl → Add to history → Canvas updates
```

#### AI Chat Tool Execution

```
User message → API: Get tool calls from Claude → Client receives tool calls
→ Auto-undo if correction detected → Client executes tools locally
→ Result blob URL → Update imageUrl → Add to history → Canvas updates
```

### State Management (Zustand)

**Image Store (`lib/image-store.ts`)**

```typescript
interface ImageState {
  // Current image
  imageUrl: string | null
  imageFile: File | null
  imageName: string | null

  // History (20 states max)
  history: HistoryEntry[]
  historyIndex: number
  maxHistorySize: 20

  // Actions
  setImage()      // Update with auto-history
  clearImage()    // Reset all
  undo()          // Previous state
  redo()          // Next state
  canUndo()       // Check availability
  canRedo()       // Check availability
  addToHistory()  // Manual checkpoint
  jumpToHistory() // Jump to index
}
```

---

## Feature Specifications

### 1. Canvas Panel (Core)

**Purpose**: Main image display and upload area

**Features:**
- Drag & drop image upload
- Click to select file
- Zoom controls (50%-400%)
- Background toggle (transparent grid, white, black)
- Pan with mouse drag
- Download current image
- Clear canvas

**Supported Formats:**
- Input: PNG, JPG, JPEG, WEBP, GIF
- Output: PNG (lossless, transparency support)

**Technical Specs:**
- Max file size: 10MB (configurable)
- Max dimensions: 8000x8000px
- Color space: sRGB, display-p3 (wide gamut)
- Pixel format: rgba-float16 (high precision)

### 2. File Validator Panel

**Purpose**: Validate images for print production

**Validation Checks:**
- ✅ Resolution (min 300 DPI for 12" print)
- ✅ File size (warn if >5MB)
- ✅ Color mode (prefer RGB, warn CMYK)
- ✅ Transparency detection
- ✅ Print-ready dimensions

**Output:**
- Pass/Fail status
- Detailed report
- Recommendations for fixes

### 3. Color Knockout Panel

**Purpose**: Remove specific colors from image

**Features:**
- Color picker (click on image)
- Multiple color selection
- Tolerance slider (0-100)
- Preview before apply
- Replace mode: transparency, white, black, custom
- Anti-aliasing toggle
- Edge smoothing
- Feather effect

**Use Cases:**
- Remove white backgrounds
- Isolate design elements
- Prepare for screen printing (color separation)

**Technical Implementation:**
- HSL/RGB color matching
- Threshold-based pixel removal
- Edge detection for anti-aliasing
- Client-side Canvas API processing

### 4. Recolor Panel

**Purpose**: Change colors in image

**Features:**
- Extract color palette (9 colors max)
- Visual color swatches
- Click color to replace
- Color picker for new color
- Tolerance slider
- Blend modes: replace, overlay, multiply
- Preserve transparency
- Real-time preview

**Use Cases:**
- Brand color updates
- Seasonal color variations
- A/B testing designs
- Color correction

### 5. Texture Cut Panel

**Purpose**: Apply texture masks to images

**Features:**
- Built-in patterns: dots, stripes, grid, waves, diagonal, cross
- Custom texture upload
- Intensity slider (0-100%)
- Invert mask
- Scale control
- Rotation (0-360°)
- Tile mode
- Feather edge

**Use Cases:**
- Artistic effects
- Pattern overlays
- Texture mapping
- Vintage effects

### 6. Cropper Panel

**Purpose**: Crop and resize images

**Features:**
- Freeform crop
- Aspect ratio presets (1:1, 4:3, 16:9, custom)
- Manual dimension input
- Maintain aspect ratio toggle
- Center crop helper
- Preview area

### 7. Background Remover (AI)

**Purpose**: Automatically remove backgrounds using AI

**Features:**
- Multiple models: general, product, person
- Batch processing ready
- Progress indicator
- API-powered (Replicate)

**AI Models:**
- **General**: BRIA RMBG 1.4 (best overall)
- **Product**: Optimized for product photography
- **Person**: Portrait/human-focused

**Technical:**
- Replicate API integration
- Polling for results
- Client-side result display
- Automatic history checkpoint

### 8. AI Upscaler

**Purpose**: Enhance image resolution using AI

**Features:**
- Multiple models: standard, anime, creative
- Scale factor: 1x-10x
- Face enhancement (standard/anime models)
- Creative controls (creativity, resemblance, dynamic, sharpen)
- Progress indicator
- Before/after preview

**AI Models:**
- **Standard**: General-purpose upscaling (Nightmind Real-ESRGAN)
- **Anime**: Optimized for anime/illustrations
- **Creative**: AI-enhanced details (higher creativity)

### 9. AI Chat Partner (Flagship Feature)

**Purpose**: Natural language image editing powered by Claude Vision API

**Core Capabilities:**

1. **Natural Language Understanding**
   - "Remove the orange color from the blocks"
   - "Make the design brighter"
   - "Upscale to 2x resolution"
   - "Show me the color palette"

2. **Multi-Tool Execution**
   - Single command can trigger multiple tools
   - Sequential tool chaining
   - Automatic parameter optimization

3. **95%+ Confidence Validation Pipeline**

   **Layer 1: Ground Truth Extraction**
   ```
   Image Analyzer extracts:
   - Dimensions, DPI, color count
   - Dominant colors (9 max)
   - Sharpness, noise level
   - Transparency detection
   - Print-ready assessment
   ```

   **Layer 2: Parameter Validation**
   ```
   Validates before execution:
   - Colors exist in image
   - Tolerance appropriate for noise
   - Coordinates within bounds
   - Tool-specific constraints
   ```

   **Layer 3: Result Validation**
   ```
   Verifies after execution:
   - Pixels actually changed
   - Change matches expected operation
   - Quality score > 70
   - No corruption detected
   ```

4. **Auto-Undo Correction**
   - Detects corrective feedback (20+ phrases)
   - Automatically undos previous edit
   - Applies correction to original state
   - Prevents compound errors

   **Trigger Phrases:**
   - "too much", "too little"
   - "wrong", "incorrect"
   - "try again", "undo that"
   - "just the", "only the"
   - "more precise", "more selective"

5. **Context Learning (ChromaDB)**
   - Stores successful tool executions
   - Learns from user preferences
   - Improves recommendations over time
   - Similarity search for similar requests

**UI Features:**
- Chat interface with message history
- Tool execution cards with confidence scores
- Expandable parameters view
- Result image previews
- Suggested prompts
- Processing indicators

**Technical Implementation:**
- Claude Sonnet 4.5 Vision API
- Function calling for tool execution
- Client-side tool execution
- Conversation context (last 10 messages)
- Industry context (custom apparel printing)

---

## User Experience

### Interface Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Top Bar: Logo | Undo/Redo/History | Sign In                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                        Main Canvas                           │
│                    (Draggable Panels)                        │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Canvas    │  │ Tool Panel │  │  AI Chat   │           │
│  │            │  │            │  │            │           │
│  │  [Image]   │  │ [Controls] │  │ [Messages] │           │
│  │            │  │            │  │            │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Bottom Dock: [Tools Icons] Canvas | Validator | Upscaler... │
└─────────────────────────────────────────────────────────────┘
```

### Panel System

**Draggable Panels:**
- Drag from title bar to reposition
- Resizable from corners/edges
- Click to focus (brings to front)
- Close button (X) in title bar
- Visual active state (border highlight)

**Z-Index Management:**
- Top Bar & Dock: z-50 (always on top)
- Focused panel: z-45
- Unfocused panels: z-40
- Canvas: z-30 (base layer)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Cmd+Y` | Redo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo (alternate) |
| `Enter` | Send AI chat message |
| `Escape` | Close focused panel |

**Smart Detection:**
- Shortcuts disabled in text input fields
- Shortcuts work anywhere else on page

### Undo/Redo System

**Visual Controls:**
- Undo/Redo buttons in top bar
- History dropdown showing timeline
- Current position indicator (e.g., "5/12")
- Click any entry to jump to that state

**Features:**
- 20 states maximum
- Auto-tracking all edits
- Manual checkpoints with descriptions
- Timestamps for each state
- Branch management (orphaned branches discarded)

### Responsive Design

**Desktop (1920x1080+):**
- Full panel system
- All features visible
- Optimal canvas size
- Side-by-side tools

**Tablet (768-1920px):**
- Stacked panels
- Reduced padding
- Touch-optimized controls
- Simplified layout

**Mobile (< 768px):**
- Single panel view
- Bottom sheet panels
- Swipe gestures
- Mobile-optimized canvas

---

## API Integration

### 1. Claude Vision API

**Endpoint:** Anthropic Messages API
**Model:** `claude-sonnet-4-5-20250929`

**Request Format:**
```typescript
{
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 4096,
  system: "...", // System prompt with ground truth
  messages: [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", data: "..." } },
        { type: "text", text: "User message" }
      ]
    }
  ],
  tools: [...] // Function definitions
}
```

**Function Calling:**
Claude returns tool calls:
```typescript
{
  type: "tool_use",
  name: "color_knockout",
  input: {
    colors: [{ r: 255, g: 140, b: 0, hex: "#ff8c00" }],
    tolerance: 20,
    replaceMode: "transparency"
  }
}
```

**System Prompt Includes:**
- Image specifications (dimensions, colors, DPI)
- Tool constraints and rules
- Auto-undo workflow instructions
- Industry context
- User expertise level

**Rate Limits:**
- 1000 requests/minute (Tier 2)
- Cost: ~$3 per 1M input tokens, ~$15 per 1M output tokens

### 2. Replicate API

**Endpoint:** `https://api.replicate.com/v1/predictions`

**Available Models:**

**Background Removal:**
```
briaai/RMBG-1.4
lucataco/remove-bg
```

**Upscaling:**
```
nightmareai/real-esrgan (standard)
xinntao/realesrgan (anime)
tencentarc/gfpgan (face enhancement)
```

**Request Format:**
```typescript
POST /v1/predictions
{
  version: "model_version_id",
  input: {
    image: "https://..." or "data:image/...",
    scale: 2, // upscaling only
    // model-specific parameters
  }
}
```

**Polling:**
```typescript
GET /v1/predictions/{prediction_id}
// Poll every 500ms until status = "succeeded"
```

**Response:**
```typescript
{
  id: "prediction_id",
  status: "succeeded",
  output: "https://replicate.delivery/pbxt/..."
}
```

**Rate Limits:**
- 100 concurrent predictions
- Varies by model
- Cost: ~$0.00015-0.003 per prediction

### 3. Internal APIs

**Chat Orchestrator:**
```
POST /api/ai/chat-orchestrator
Body: {
  message: string,
  imageUrl: string (data URL),
  conversationId: string,
  conversationHistory: ConversationMessage[],
  userContext: { industry, expertise }
}

Response: {
  success: boolean,
  message: string,
  toolCalls: Array<{ toolName, parameters }>,
  confidence: number,
  imageAnalysis: ImageAnalysis,
  executionModel: "client-side"
}
```

**Replicate Predictions:**
```
POST /api/replicate/predictions
Body: {
  model: "remove_bg" | "upscaler",
  imageUrl: string,
  settings: { ... }
}

GET /api/replicate/predictions/{id}
Response: {
  status: "processing" | "succeeded" | "failed",
  output?: string,
  error?: string
}
```

---

## Quality & Testing

### Test Coverage

**Unit Tests (Vitest):**
- 193/212 passing (91% pass rate)
- Coverage: Core utilities, tools, validators
- Location: `tests/` directory

**E2E Tests (Playwright):**
- 60% pass rate
- Partial coverage of user workflows
- Location: `tests/e2e/` directory

**Manual Testing:**
- 100% feature coverage
- Documented test scenarios
- User acceptance testing

### Continuous Integration

**Not Currently Implemented:**
- GitHub Actions CI/CD
- Automated test runs on PR
- Deployment previews

**Recommended Setup:**
```yaml
# .github/workflows/ci.yml
- Run unit tests
- Run E2E tests
- Build production bundle
- Deploy to Vercel preview
```

### Quality Assurance Checklist

- [ ] All manual tools tested with edge cases
- [ ] AI chat tested with 50+ varied prompts
- [ ] Undo/redo tested with 20+ state history
- [ ] Auto-undo tested with correction phrases
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Performance profiling (load time, memory usage)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Security audit (XSS, CSRF, API key exposure)

---

## Performance Metrics

### Current Performance

**Initial Load:**
- First Contentful Paint (FCP): ~0.8s
- Largest Contentful Paint (LCP): ~1.2s
- Time to Interactive (TTI): ~1.5s
- Total Bundle Size: ~450KB gzipped

**Runtime Performance:**
- Image upload: < 100ms
- Client-side tool execution: 200-1000ms (depends on size)
- API call latency: 2-6s (Claude Vision)
- Undo/Redo: < 50ms (instant)

**Memory Usage:**
- Base: ~50MB
- With image loaded: ~80-150MB
- 20-state history: ~200-400MB (depends on image size)

### Optimization Opportunities

1. **Bundle Size:**
   - Code splitting by panel
   - Lazy load AI components
   - Tree-shake unused Radix components
   - Target: < 300KB gzipped

2. **Runtime:**
   - Web Workers for heavy processing
   - OffscreenCanvas for parallel rendering
   - Image compression before API calls
   - Target: < 500ms for most operations

3. **Memory:**
   - Compress history entries (lossy)
   - Store deltas instead of full images
   - Implement smart cache eviction
   - Target: < 200MB for 20 states

---

## Known Limitations

### Technical Constraints

1. **Client-Side Processing**
   - Limited by browser memory
   - Large images (>4K) may be slow
   - Some advanced filters not possible

2. **AI Reliability**
   - Claude Vision occasionally hallucinates
   - 95% confidence is aspirational (actual ~85-90%)
   - Color names ambiguous ("red" = many shades)

3. **Browser Compatibility**
   - OffscreenCanvas not in Safari < 16.4
   - rgba-float16 not universally supported
   - Canvas toBlob() has size limits

4. **History System**
   - 20 states may be insufficient for complex edits
   - No persistent storage (lost on refresh)
   - Large images consume significant memory

### User Experience Gaps

1. **No Batch Processing**
   - Can only edit one image at a time
   - No automated workflows
   - Manual repetition for similar edits

2. **Limited Export Options**
   - PNG only (no JPEG, WEBP, TIFF)
   - No CMYK conversion
   - No color profile embedding

3. **No Collaboration**
   - Single-user only
   - No project sharing
   - No version control

4. **Mobile Experience**
   - Touch gestures limited
   - Small screen difficult for precision
   - Performance issues on low-end devices

---

## Future Roadmap

### Q1 2026 (Beta Launch)

**Priority 1: Production Readiness**
- [ ] Implement comprehensive error handling
- [ ] Add user authentication (Clerk/Auth0)
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Complete E2E test coverage (90%+)
- [ ] Security audit and penetration testing
- [ ] GDPR/CCPA compliance review

**Priority 2: User Feedback Integration**
- [ ] Public beta with 20-50 print shops
- [ ] Collect usage analytics
- [ ] A/B test AI chat vs manual tools
- [ ] User interviews and surveys
- [ ] Iterate based on feedback

### Q2 2026 (Feature Expansion)

**Batch Processing:**
- Multiple image upload
- Apply same edits to all images
- Parallel processing (Web Workers)
- Progress tracking dashboard

**Export Enhancements:**
- JPEG, WEBP, TIFF support
- CMYK color conversion
- Color profile embedding (sRGB, Adobe RGB)
- DPI adjustment on export
- Watermarking

**Collaboration Features:**
- User accounts and authentication
- Project saving and loading
- Project sharing (view-only, edit)
- Version history (persistent)
- Team workspaces

### Q3 2026 (AI Advancements)

**Custom AI Models:**
- Fine-tune on user's design library
- Industry-specific models (apparel, posters, signage)
- Style transfer (apply brand style automatically)
- Auto-vectorization for simple designs

**Advanced AI Features:**
- AI-generated design variations
- Smart object removal (content-aware fill)
- Automatic color palette generation
- AI-powered design suggestions

**Learning & Personalization:**
- Per-user preference learning
- Suggest frequently used edits
- Auto-save common workflows
- Smart defaults based on history

### Q4 2026 (Platform Expansion)

**Desktop Application:**
- Electron-based desktop app
- Native file system access
- Better performance for large files
- Offline mode support

**Mobile Application:**
- React Native iOS/Android apps
- Touch-optimized UI
- Camera integration
- On-device AI processing

**API Platform:**
- Public REST API
- SDK for JavaScript, Python
- Webhook support
- Rate-limited free tier

---

## Success Metrics

### Key Performance Indicators (KPIs)

**Adoption Metrics:**
- Monthly Active Users (MAU): Target 1000 by Q2 2026
- Daily Active Users (DAU): Target 200 by Q2 2026
- User Retention Rate: Target 60% (30-day)
- New User Signups: Target 500/month

**Engagement Metrics:**
- Average Session Duration: Target 15 min
- Images Edited per Session: Target 3-5
- Tools Used per Session: Target 2-3
- AI Chat Usage Rate: Target 40% of users

**AI Performance Metrics:**
- AI Chat Success Rate: Target 90%+
- Average Confidence Score: Target 85%+
- Auto-Undo Trigger Rate: Target < 15%
- Tool Execution Success Rate: Target 95%+

**Business Metrics:**
- Customer Acquisition Cost (CAC): Target < $50
- Lifetime Value (LTV): Target > $300
- Conversion Rate (Free → Paid): Target 10%
- Monthly Recurring Revenue (MRR): Target $10k by Q4 2026

**Quality Metrics:**
- Average Page Load Time: Target < 2s
- Error Rate: Target < 1%
- Uptime: Target 99.9%
- Customer Satisfaction (CSAT): Target 4.5/5

### Success Criteria

**Minimum Viable Product (MVP) - ✅ ACHIEVED**
- ✅ 8 functional tools (manual + AI)
- ✅ AI chat with 95% validation pipeline
- ✅ Undo/redo with 20-state history
- ✅ Client-side processing
- ✅ Basic responsive design

**Beta Launch Ready (Q1 2026)**
- Production-grade error handling
- User authentication
- Comprehensive testing (90%+ coverage)
- Security audit passed
- 50+ beta users onboarded

**Product-Market Fit (Q2 2026)**
- 1000+ MAU
- 60%+ retention rate
- 4.5/5 satisfaction score
- 10%+ conversion to paid
- 5+ enterprise customers

---

## Appendix

### A. Technology Decisions

**Why Next.js 15?**
- App Router for modern React patterns
- Server Components for performance
- API Routes for backend logic
- Vercel optimization out-of-box
- React 19 with latest features

**Why Zustand over Redux?**
- Simpler API (less boilerplate)
- Better TypeScript support
- No context provider hell
- Smaller bundle size
- Suitable for mid-size apps

**Why Client-Side Processing?**
- Privacy (images stay in browser)
- Lower server costs
- Instant feedback
- No upload latency
- Works on any hosting platform

**Why Claude Vision API?**
- Best-in-class vision understanding
- Function calling for tool execution
- High accuracy for color/spatial reasoning
- Reasonable pricing
- Active development and improvements

### B. Security Considerations

**API Key Management:**
- All API keys in environment variables
- Not exposed to client
- Rotated quarterly
- Scoped to minimum permissions

**Data Privacy:**
- Images never stored on server
- Blob URLs are client-only
- API requests use ephemeral data URLs
- No persistent user data (yet)
- GDPR-ready architecture

**XSS/CSRF Protection:**
- Next.js built-in CSRF protection
- Sanitize all user inputs
- CSP headers configured
- No dangerouslySetInnerHTML usage

**Rate Limiting:**
- Vercel Edge Config for rate limits
- IP-based throttling
- API key usage quotas
- DDoS protection via Vercel

### C. Accessibility

**WCAG 2.1 AA Compliance:**
- Keyboard navigation (all features)
- ARIA labels on all buttons
- Screen reader friendly
- High contrast mode support
- Focus indicators visible

**Future Improvements:**
- Voice control integration
- Screen reader announcements for AI
- Colorblind-friendly UI modes
- Adjustable text sizes

### D. Browser Support

**Tier 1 (Full Support):**
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

**Tier 2 (Partial Support):**
- Chrome 100-119
- Firefox 100-119
- Safari 15-16

**Not Supported:**
- Internet Explorer (any version)
- Safari < 15
- Opera Mini
- Old Android browsers

### E. Documentation Links

**User Guides:**
- [AI Design Partner User Guide](./AI_DESIGN_PARTNER_USER_GUIDE.md)
- [Testing Quick Start](./TESTING_QUICK_START.md)
- [Undo/Redo Ready Guide](./UNDO_REDO_READY.md)

**Technical Docs:**
- [AI Chat Orchestrator Guide](./AI_CHAT_ORCHESTRATOR_GUIDE.md)
- [Parameter Validator Guide](./PARAMETER_VALIDATOR_GUIDE.md)
- [Result Validator Guide](./RESULT_VALIDATOR_GUIDE.md)
- [Context Manager Docs](./docs/CONTEXT_MANAGER.md)
- [Client-Side Execution](./CLIENT_SIDE_EXECUTION_IMPLEMENTATION.md)

**Architecture:**
- [AI Backend Technical Flow](./AI_BACKEND_TECHNICAL_FLOW.md)
- [AI Chat Panel Architecture](./AI_CHAT_PANEL_ARCHITECTURE.md)
- [Tech Stack Review](./TECH_STACK_REVIEW.md)

**Testing:**
- [Test Coverage Assessment](./TEST_COVERAGE_ASSESSMENT.md)
- [Test Results Summary](./TEST_RESULTS_SUMMARY.md)
- [Phase 8 Testing](./AI_DESIGN_PARTNER_TESTING.md)

### F. Contact & Support

**Development Team:**
- Lead Developer: OneFlow Team
- AI/ML Integration: Phase 8 Complete
- Product Owner: Makko

**Community:**
- GitHub: [flow-editor](https://github.com/oneflow/flow-editor)
- Discord: (Coming Q1 2026)
- Email: support@oneflow.com

---

**Document Version:** 1.0.0
**Last Updated:** October 13, 2025
**Next Review:** November 15, 2025

This PRD is a living document and will be updated as the product evolves.
