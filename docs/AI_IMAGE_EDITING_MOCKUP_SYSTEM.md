# AI Image Editing and Mockup Generation System

## Overview

This system provides AI-driven image editing and product mockup generation capabilities integrated into the AI Chat Panel. It uses the Replicate API to process natural language editing requests and generate realistic product mockups.

## Features

### 1. AI Image Editing (`edit_image` tool)
- Natural language image editing
- Support for prompts like:
  - "Remove the background"
  - "Make colors brighter"
  - "Add a sunset effect"
  - "Convert to black and white"
  - "Enhance details and sharpness"

### 2. Product Mockup Generation (`generate_mockup` tool)
- Generate mockups for various products:
  - T-Shirts
  - Hoodies
  - Mugs
  - Posters
  - Phone Cases
  - Tote Bags
- Customizable options:
  - Product colors (white, black, gray, red, blue, green, custom)
  - Design placement (center, left-chest, full-front, full-back)
  - Product sizes (small, medium, large, xl)

## Architecture

### Component Structure

```
flow-editor/
├── lib/
│   ├── replicate-client.ts         # Replicate API client wrapper
│   ├── tools/
│   │   ├── ai-image-edit.ts        # AI edit tool implementation
│   │   └── ai-mockup.ts            # Mockup generation tool
│   ├── ai-tools-orchestrator.ts    # Tool registration
│   └── client-tool-executor.ts     # Client-side execution
├── app/api/replicate/predict/      # API route for Replicate
├── components/
│   ├── panels/
│   │   └── ai-chat-panel.tsx       # Enhanced with image results
│   └── image-preview-modal.tsx     # Full-screen preview modal
└── .env.example                     # Environment variables
```

### Data Flow

1. **User Request** → AI Chat Panel
2. **Claude Analysis** → Determines tool to use
3. **Tool Execution** → Client-side or API call
4. **Result Display** → Inline preview in chat
5. **User Actions** → View/Apply/Download

## Implementation Details

### Message Type Extension

```typescript
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
  // ... existing fields
  imageResult?: ImageResult
}
```

### Tool Registration

Both tools are registered in `ai-tools-orchestrator.ts`:

```typescript
export const toolDefinitions = [
  // ... existing tools
  aiImageEditTool,
  aiMockupTool
]
```

### Client-Side Execution

Tools are executed client-side through `client-tool-executor.ts`:

```typescript
case 'edit_image': {
  const result = await editImageWithAI({
    prompt: parameters.prompt,
    imageUrl,
    strength: parameters.strength || 0.75,
  })
  // ... handle result
}

case 'generate_mockup': {
  const result = await generateMockupWithAI({
    product: parameters.product,
    color: parameters.color,
    // ... other parameters
  })
  // ... handle result
}
```

## UI Components

### Image Result Display

Shows inline previews with:
- Thumbnail image (click to preview)
- Type badge (Edit/Mockup)
- Status indicator
- Action buttons (View/Apply)

### Preview Modal

Full-screen modal with:
- Zoom controls (scroll wheel/buttons)
- Pan support (click and drag)
- Rotation (90° increments)
- Download capability
- Apply to canvas (for edits only)

## Usage Examples

### AI Image Editing

```
User: "Remove the background and make it transparent"
AI: I'll remove the background for you...
[Executes edit_image tool]
[Shows result with Apply button]
```

### Product Mockup

```
User: "Create a white t-shirt mockup with this design"
AI: I'll generate a t-shirt mockup for you...
[Executes generate_mockup tool]
[Shows mockup preview - View only]
```

## Configuration

### Environment Variables

```bash
# Required for AI editing features
REPLICATE_API_KEY=your_replicate_api_key_here

# Required for Claude integration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Replicate Models

The system is configured to use:
- **Image Editing**: `qwen/qwen-image-edit-plus` (configurable)
- **Mockup Generation**: Custom mockup models (configurable)

Note: Model version IDs need to be obtained from Replicate and configured in `replicate-client.ts`.

## API Integration

### Create Prediction

```typescript
POST /api/replicate/predict
{
  type: 'edit' | 'mockup',
  params: {
    // Tool-specific parameters
  }
}
```

### Check Status

```typescript
GET /api/replicate/predict?predictionId=xxx
```

## Limitations and Notes

### Current Implementation

1. **Demo Mode**: The current implementation includes simulated mockup generation for demonstration purposes
2. **Model Configuration**: Actual Replicate model version IDs need to be configured
3. **Polling**: Uses polling for prediction status (webhook support can be added)

### Production Considerations

1. **API Keys**: Secure storage and rotation of API keys
2. **Rate Limiting**: Implement rate limiting for API calls
3. **Error Handling**: Comprehensive error handling and user feedback
4. **Caching**: Consider caching frequently used mockups
5. **Webhooks**: Implement webhook support for better performance

## Testing

### Manual Testing Steps

1. **Setup**:
   - Add `REPLICATE_API_KEY` to `.env.local`
   - Start development server: `npm run dev`

2. **Test AI Editing**:
   - Upload an image
   - Type: "Remove the background"
   - Verify edit preview appears
   - Click "Apply" to apply to canvas

3. **Test Mockup Generation**:
   - Upload a design
   - Type: "Create a white t-shirt mockup"
   - Verify mockup preview appears
   - Click "View" to see full-size

4. **Test Preview Modal**:
   - Click on any image result
   - Test zoom (scroll wheel)
   - Test pan (drag)
   - Test download button

## Future Enhancements

1. **More Mockup Products**: Add additional product types
2. **Batch Processing**: Generate multiple mockups at once
3. **Custom Backgrounds**: Support for custom mockup backgrounds
4. **Style Transfer**: Advanced AI editing with style transfer
5. **History Tracking**: Save and replay edit sequences
6. **Preset Prompts**: Save commonly used edit prompts
7. **Export Options**: Multiple format/quality export options
8. **Real Replicate Integration**: Connect to actual Replicate models

## Troubleshooting

### Common Issues

1. **"REPLICATE_API_KEY is required"**
   - Ensure the API key is set in `.env.local`

2. **Mockup/Edit not appearing**
   - Check browser console for errors
   - Verify API route is responding

3. **Preview modal not opening**
   - Check if image URL is valid
   - Verify modal component is imported

4. **Apply button not working**
   - Only available for edits, not mockups
   - Check console for fetch errors

## Support

For questions or issues:
1. Check browser developer console for errors
2. Review API response in Network tab
3. Verify environment variables are set
4. Check Replicate API status and limits