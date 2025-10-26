# AI Chat Orchestrator - Complete Integration Guide

## Overview

The AI Chat Orchestrator is the **core brain** that coordinates Claude Vision API, validation layers, and tool execution to achieve >95% confidence in image editing operations.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                           │
│              (components/ai-chat-panel.tsx)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API ROUTE                              │
│             (app/api/ai/chat-orchestrator)                  │
│  - Request validation                                       │
│  - Error handling                                           │
│  - Response formatting                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 AI CHAT ORCHESTRATOR                        │
│            (lib/ai-chat-orchestrator.ts)                    │
│  processUserMessage(request) → response                     │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌────────────────────────┐         ┌────────────────────────┐
│   1. IMAGE ANALYZER    │         │  2. CLAUDE VISION API  │
│  analyzeImage()        │         │  callClaudeWithTools() │
│  - Extract ground truth│         │  - System prompt       │
│  - Get real specs      │         │  - Function calling    │
│  - Confidence 0-100    │         │  - Parse response      │
└────────────────────────┘         └────────────────────────┘
            │                                   │
            └─────────────────┬─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              3. PARAMETER VALIDATOR                         │
│         validateToolParameters()                            │
│  - Check against ground truth                               │
│  - Check historical patterns (ChromaDB)                     │
│  - Validate against schema                                  │
│  - Confidence 0-100                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              4. TOOL EXECUTION                              │
│         executeToolFunction()                               │
│  - Route to tool implementation                             │
│  - Execute with progress tracking                           │
│  - Return result image URL                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              5. CONTEXT STORAGE                             │
│         storeToolExecution()                                │
│  - Store successful executions (confidence ≥ 70%)           │
│  - Store conversation history                               │
│  - Build knowledge base for learning                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   RETURN RESPONSE                           │
│  - success: boolean                                         │
│  - message: string                                          │
│  - toolExecutions: Array                                    │
│  - confidence: number                                       │
│  - timestamp: number                                        │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Image Analyzer (Phase 1)
**File**: `/lib/image-analyzer.ts`

Extracts ground truth from pixels to prevent hallucinations.

```typescript
import { analyzeImage } from './image-analyzer';

const analysis = await analyzeImage(imageUrl, (progress, msg) => {
  console.log(`${progress}%: ${msg}`);
});

// Returns:
{
  width: 1920,
  height: 1080,
  dominantColors: [
    { r: 255, g: 0, b: 0, hex: '#ff0000', percentage: 45 },
    { r: 0, g: 0, b: 255, hex: '#0000ff', percentage: 30 }
  ],
  hasTransparency: true,
  sharpnessScore: 75,
  confidence: 100
}
```

**Key Features:**
- Pixel-level color extraction
- Sharpness and noise detection
- Print readiness validation
- DPI detection
- Transparency detection

### 2. Parameter Validator (Phase 3)
**File**: `/lib/parameter-validator.ts`

Validates Claude's parameters against ground truth and historical patterns.

```typescript
import { validateToolParameters } from './parameter-validator';

const validation = await validateToolParameters(
  'color_knockout',
  {
    colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
    tolerance: 30
  },
  imageAnalysis,
  imageUrl
);

// Returns:
{
  isValid: true,
  confidence: 95,
  warnings: [],
  errors: [],
  reasoning: 'Color found in image with 45% coverage. Tolerance appropriate.',
  adjustedParameters: null
}
```

**Validation Layers:**
1. **Schema Validation** - Types, bounds, enums
2. **Ground Truth Check** - Colors exist in image
3. **Historical Patterns** - Similar successful executions
4. **Tool-Specific Logic** - Custom validation per tool

### 3. Context Manager (Phase 2)
**File**: `/lib/context-manager.ts`

Provides learning layer through ChromaDB (gracefully degrades to in-memory).

```typescript
import {
  storeConversationTurn,
  storeToolExecution,
  findSimilarExecutions
} from './context-manager';

// Store conversation
await storeConversationTurn(
  conversationId,
  'Remove the background',
  'I used the AI background remover...',
  imageAnalysis
);

// Store successful execution
await storeToolExecution(conversationId, {
  toolName: 'background_remover',
  parameters: { model: 'bria' },
  success: true,
  confidence: 98,
  resultMetrics: { executionTimeMs: 2300 },
  imageSpecsSnapshot: imageAnalysis,
  timestamp: Date.now()
});

// Find similar executions
const similar = await findSimilarExecutions(
  'color_knockout',
  imageAnalysis,
  5
);
```

**Storage:**
- Conversation history
- Successful tool executions (confidence ≥ 70%)
- Image analysis snapshots
- Parameter patterns

### 4. AI Tools Orchestrator
**File**: `/lib/ai-tools-orchestrator.ts`

Defines tools and executes them.

```typescript
import { executeToolFunction, toolDefinitions } from './ai-tools-orchestrator';

// Tool definitions for Claude
const tools = toolDefinitions; // Array of tool schemas

// Execute a tool
const result = await executeToolFunction(
  'color_knockout',
  { colors: [...], tolerance: 30 },
  imageUrl,
  (progress, msg) => console.log(`${progress}%: ${msg}`)
);

// Returns:
{
  success: true,
  result: {
    imageUrl: 'blob:...',
    message: 'Color knockout applied successfully'
  }
}
```

**Available Tools:**
- `color_knockout` - Remove specific colors
- `recolor_image` - Change colors
- `texture_cut` - Apply texture masks
- `background_remover` - AI background removal
- `upscaler` - AI upscaling
- `extract_color_palette` - Get dominant colors
- `pick_color_at_position` - Sample pixel color

### 5. AI Chat Orchestrator (Phase 4)
**File**: `/lib/ai-chat-orchestrator.ts`

The core brain that coordinates everything.

```typescript
import { processUserMessage } from './ai-chat-orchestrator';

const response = await processUserMessage({
  message: 'Remove the blue background',
  imageUrl: 'blob:...',
  conversationId: 'conv-123',
  conversationHistory: [],
  userContext: {
    industry: 'custom apparel printing',
    expertise: 'novice'
  }
});

// Returns:
{
  success: true,
  message: 'I used the AI background remover to remove the background...',
  toolExecutions: [
    {
      toolName: 'background_remover',
      parameters: { model: 'bria' },
      executionSuccess: true,
      resultImageUrl: 'blob:...',
      confidence: 98,
      executionTimeMs: 2300
    }
  ],
  confidence: 98,
  conversationId: 'conv-123',
  timestamp: 1234567890
}
```

## System Prompt Engineering

The orchestrator builds a detailed system prompt with ground truth:

```typescript
You are an AI design assistant specialized in custom apparel printing.

GROUND TRUTH IMAGE SPECIFICATIONS:
- Dimensions: 1920x1080 px
- Resolution: Unknown DPI
- Transparency: Yes
- Color Count: 5000 unique colors
- Dominant Colors: #ff0000, #0000ff, #ffffff
- Sharpness: 75/100
- Noise Level: 20/100
- Print Ready: No

IMPORTANT RULES:
1. ONLY suggest colors that exist in the dominant colors list above
2. Choose tolerance values appropriate for the noise level
3. If user request is ambiguous, ask clarifying questions
4. Explain what each tool will do in simple language
5. Warn if operation may significantly alter the design

USER CONTEXT:
- Industry: custom apparel printing
- Expertise: novice

When you need to execute a tool, use the function calling feature.
I will validate your parameters before execution.
```

This prevents hallucinations by providing real specifications.

## Confidence Calculation

The orchestrator calculates overall confidence from multiple sources:

```typescript
// Weighted confidence calculation
const weights = {
  validationConfidence: 0.4,   // 40% weight
  executionSuccess: 0.4,        // 40% weight
  historicalPatterns: 0.2       // 20% weight
};

for (const execution of executions) {
  const validationScore = execution.validationResult.confidence;
  const executionScore = execution.success ? 100 : 0;
  const historicalScore = execution.validationResult.historicalConfidence || 75;

  const weighted =
    validationScore * weights.validationConfidence +
    executionScore * weights.executionSuccess +
    historicalScore * weights.historicalPatterns;

  totalConfidence += weighted;
}

overallConfidence = Math.round(totalConfidence / executions.length);
```

**Confidence Levels:**
- **95-100%**: Excellent - All systems agree, high success probability
- **85-94%**: Good - Minor warnings but likely to succeed
- **70-84%**: Fair - Some concerns, may need adjustments
- **Below 70%**: Low - Not stored for learning, user should be warned

## API Route

**Endpoint**: `POST /api/ai/chat-orchestrator`

**Request:**
```json
{
  "message": "Remove the blue background",
  "imageUrl": "blob:http://localhost:3000/abc123",
  "conversationId": "conv-123",
  "conversationHistory": [
    {
      "role": "user",
      "content": "What can you do?",
      "timestamp": 1234567890
    },
    {
      "role": "assistant",
      "content": "I can help you edit images...",
      "timestamp": 1234567891
    }
  ],
  "userContext": {
    "industry": "custom apparel printing",
    "expertise": "novice"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "I used the AI background remover to remove the background from your image. The result looks great!",
  "toolExecutions": [
    {
      "toolName": "background_remover",
      "parameters": {
        "model": "bria",
        "outputFormat": "png"
      },
      "success": true,
      "resultImageUrl": "blob:http://localhost:3000/xyz789",
      "confidence": 98
    }
  ],
  "confidence": 98,
  "conversationId": "conv-123",
  "timestamp": 1234567892,
  "processingTimeMs": 2345
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Validation failed: Color #00ff00 not found in image",
  "message": "I couldn't find that color in your image. The dominant colors are: #ff0000, #0000ff, #ffffff. Would you like to use one of these instead?",
  "conversationId": "conv-123",
  "timestamp": 1234567892,
  "processingTimeMs": 456
}
```

## Usage Examples

### Example 1: Simple Background Removal

```typescript
import { processUserMessage } from './lib/ai-chat-orchestrator';

const response = await processUserMessage({
  message: 'Remove the background',
  imageUrl: blobUrl,
  conversationId: `conv-${Date.now()}`,
  conversationHistory: [],
  userContext: {
    expertise: 'novice'
  }
});

if (response.success) {
  // Update canvas with result
  const resultUrl = response.toolExecutions[0]?.resultImageUrl;
  if (resultUrl) {
    updateCanvas(resultUrl);
  }
}
```

### Example 2: Color Replacement

```typescript
const response = await processUserMessage({
  message: 'Change all red to blue',
  imageUrl: blobUrl,
  conversationId: conversationId,
  conversationHistory: previousMessages,
  userContext: {
    industry: 'custom apparel printing',
    expertise: 'intermediate'
  }
});

// Claude will:
// 1. Analyze image to find red color
// 2. Call recolor_image tool with mapping
// 3. Validate parameters
// 4. Execute and return result
```

### Example 3: Multi-Step Operation

```typescript
// User: "Remove background and upscale 2x"
const response = await processUserMessage({
  message: 'Remove background and upscale 2x',
  imageUrl: blobUrl,
  conversationId: conversationId,
  conversationHistory: [],
});

// Claude will:
// 1. Call background_remover tool
// 2. Validate parameters
// 3. Execute background removal
// 4. Call upscaler tool
// 5. Validate parameters
// 6. Execute upscaling
// 7. Return both results

// Check executions
response.toolExecutions.forEach(exec => {
  console.log(`${exec.toolName}: ${exec.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Confidence: ${exec.confidence}%`);
});
```

### Example 4: Conversational Context

```typescript
// First message
const response1 = await processUserMessage({
  message: 'What colors are in this image?',
  imageUrl: blobUrl,
  conversationId: conversationId,
  conversationHistory: []
});
// Claude: "I see red (#ff0000 - 45%), blue (#0000ff - 30%), white (#ffffff - 25%)"

// Second message (with context)
const response2 = await processUserMessage({
  message: 'Remove the red',
  imageUrl: blobUrl,
  conversationId: conversationId,
  conversationHistory: [
    { role: 'user', content: 'What colors are in this image?', timestamp: Date.now() },
    { role: 'assistant', content: response1.message, timestamp: Date.now() }
  ]
});
// Claude knows which red to remove from previous context
```

## Error Handling

The orchestrator never throws errors - it always returns a response:

```typescript
try {
  const response = await processUserMessage(request);

  if (response.success) {
    // Happy path
    handleSuccess(response);
  } else {
    // Error path (validation, execution, API error)
    handleError(response.error, response.message);
  }
} catch (error) {
  // This should never happen - orchestrator catches all errors
  console.error('Unexpected error:', error);
}
```

**Common Error Patterns:**

1. **Parameter Validation Failed**
   ```typescript
   {
     success: false,
     error: 'Validation failed: Color not found',
     message: 'The color you specified doesn\'t exist in the image...',
     confidence: 0
   }
   ```

2. **Tool Execution Failed**
   ```typescript
   {
     success: false,
     error: 'Tool execution failed: Network timeout',
     message: 'I encountered a network error. Please try again.',
     confidence: 0
   }
   ```

3. **Claude API Error**
   ```typescript
   {
     success: false,
     error: 'ANTHROPIC_API_KEY not configured',
     message: 'The AI service is not properly configured.',
     confidence: 0
   }
   ```

## Testing

Run the comprehensive test suite:

```bash
# Run all orchestrator tests
npm test -- ai-chat-orchestrator.test.ts

# Run with coverage
npm test -- ai-chat-orchestrator.test.ts --coverage

# Run specific test
npm test -- ai-chat-orchestrator.test.ts -t "should process message"
```

**Test Coverage:**
- ✅ Simple messages without tool calls
- ✅ Single tool execution
- ✅ Multiple tool executions
- ✅ Validation failures
- ✅ Execution failures
- ✅ Low confidence handling
- ✅ Conversation history
- ✅ User context
- ✅ Error scenarios
- ✅ Confidence calculation
- ✅ API integration

All tests use mocked dependencies for fast, reliable execution.

## Performance Optimization

**Typical Execution Times:**

| Phase                  | Time       | Notes                          |
|------------------------|------------|--------------------------------|
| Image Analysis         | 200-500ms  | Depends on image size          |
| Claude API Call        | 1-3s       | Network latency + processing   |
| Parameter Validation   | 50-200ms   | Includes ChromaDB query        |
| Tool Execution         | 500-5000ms | Depends on tool and image size |
| Context Storage        | 10-50ms    | Async, non-blocking            |
| **Total**              | **2-9s**   | End-to-end for one operation   |

**Optimization Strategies:**

1. **Parallel Operations**
   ```typescript
   // Run independent operations in parallel
   const [analysis, context] = await Promise.all([
     analyzeImage(imageUrl),
     getConversationContext(conversationId)
   ]);
   ```

2. **Caching**
   ```typescript
   // Cache image analysis for same image
   const cacheKey = `analysis:${imageUrlHash}`;
   let analysis = cache.get(cacheKey);
   if (!analysis) {
     analysis = await analyzeImage(imageUrl);
     cache.set(cacheKey, analysis, 300); // 5 minutes
   }
   ```

3. **Streaming**
   ```typescript
   // Stream Claude responses for faster UX
   const stream = await anthropic.messages.stream({...});
   for await (const chunk of stream) {
     updateUI(chunk);
   }
   ```

## Environment Configuration

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
MAX_TOKENS=4096
MIN_CONFIDENCE_TO_STORE=70
MAX_EXECUTION_TIME_MS=60000
```

## Monitoring & Logging

The orchestrator provides detailed logging:

```typescript
[Orchestrator] Processing message: Remove the blue background
[Orchestrator] Step 1: Analyzing image for ground truth...
[Orchestrator] Analysis: 10% - Loading image...
[Orchestrator] Analysis: 50% - Extracting colors...
[Orchestrator] Image analysis complete: {dimensions: "1920x1080", colors: 9, confidence: 100}
[Orchestrator] Step 2: Calling Claude Vision API...
[Orchestrator] Claude response received
[Orchestrator] Found: {textLength: 234, functionCalls: 1}
[Orchestrator] Step 3-5: Processing 1 function call(s)...
[Orchestrator] Processing call 1/1: background_remover
[Orchestrator] Validating background_remover parameters...
[Orchestrator] Validation result: {isValid: true, confidence: 98}
[Orchestrator] Executing background_remover...
[Tool:background_remover] 25% - Downloading model...
[Tool:background_remover] 75% - Processing...
[Orchestrator] Execution succeeded in 2300ms
[Orchestrator] Overall confidence: 98
[Orchestrator] Request completed in 3456ms
```

## Security Considerations

1. **API Key Protection**
   - Never expose ANTHROPIC_API_KEY to client
   - Use server-side API routes only

2. **Input Validation**
   - Validate image URLs (blob: or data: only)
   - Sanitize user messages
   - Limit conversation history size

3. **Rate Limiting**
   - Implement per-user rate limits
   - Queue requests during high load

4. **Error Messages**
   - Don't expose sensitive error details to user
   - Log full errors server-side only

## Troubleshooting

### Issue: Low Confidence Scores

**Symptoms**: Confidence consistently < 80%

**Solutions**:
1. Check image quality - low sharpness reduces confidence
2. Verify colors exist in image - hallucinated colors reduce confidence
3. Check historical patterns - new operations have neutral confidence
4. Review validation warnings - adjust parameters based on feedback

### Issue: Tool Execution Failures

**Symptoms**: Tools fail with errors

**Solutions**:
1. Check API quotas (Replicate, other services)
2. Verify image formats are supported
3. Check network connectivity
4. Review tool-specific error messages
5. Check execution timeouts

### Issue: Claude Not Using Tools

**Symptoms**: Claude returns text but no tool calls

**Solutions**:
1. Check system prompt clarity
2. Verify tool definitions are passed to API
3. Use more explicit user messages
4. Check Claude model version supports function calling

### Issue: Slow Performance

**Symptoms**: Requests take >10 seconds

**Solutions**:
1. Optimize image size before analysis
2. Cache image analysis results
3. Use faster tool algorithms when available
4. Consider async/background processing
5. Monitor Claude API latency

## Next Steps

1. **Phase 5: Result Validator** (In Progress)
   - Compare before/after images
   - Calculate pixels changed
   - Verify expected outcome
   - Auto-retry if quality low

2. **Phase 6: Error Handler**
   - Intelligent retry logic
   - Parameter adjustment suggestions
   - Fallback strategies

3. **Phase 7: Performance Monitor**
   - Track execution metrics
   - Monitor API usage
   - Optimize slow operations

4. **Phase 8: Analytics Dashboard**
   - Success rates by tool
   - Common failure patterns
   - User satisfaction metrics

## Resources

- **Code**: `/lib/ai-chat-orchestrator.ts`
- **API Route**: `/app/api/ai/chat-orchestrator/route.ts`
- **Tests**: `/tests/ai-chat-orchestrator.test.ts`
- **UI Integration**: `/components/panels/ai-chat-panel.tsx`
- **Documentation**: This file

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Review test suite for usage examples
3. Check validation warnings for parameter issues
4. Verify environment configuration

---

**Status**: Production Ready ✅
**Confidence**: >95% achievable with all layers working together
**Last Updated**: 2025-10-13
