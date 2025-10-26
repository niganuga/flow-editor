# AI Design Partner - User Guide

## Overview

The AI Design Partner is a natural language interface for editing images. Instead of learning complex tools and settings, you can simply tell the AI what you want, and it will execute the appropriate image editing operations.

**This is Phase 8 (FINAL PHASE) of the AI Design Assistant implementation.**

## Features

1. **Natural Language Commands**: Talk to the AI like you would talk to a designer
2. **Tool Execution Transparency**: See exactly what tools were used and their confidence scores
3. **Result Preview**: Preview results before they're applied to the main canvas
4. **Conversation History**: The AI remembers your conversation for context
5. **Suggested Prompts**: Quick-action buttons for common tasks
6. **Confidence Scoring**: See how confident the AI is about each operation

## Getting Started

### 1. Upload an Image
First, upload an image to the editor. The AI Design Partner requires an image to work with.

**Status Indicator**: Look for the image status indicator at the top of the panel:
- "Image loaded - Ready to edit!" (Green) - You're ready to go!
- "No image - Please upload one first" (Gray) - Upload an image first

### 2. Start a Conversation
Once you have an image loaded, you can start chatting with the AI. Here are some example prompts:

#### Background Removal
- "Remove the background"
- "Delete the white background"
- "Make the background transparent"

#### Color Operations
- "Remove white color"
- "Remove all red tones"
- "Make colors more vibrant"
- "Show me the color palette"

#### Image Enhancement
- "Upscale this image"
- "Make it higher resolution"
- "Improve the quality"

#### Color Manipulation
- "Change blue to green"
- "Recolor the shirt to red"
- "Make the background yellow"

#### Analysis
- "Analyze this image"
- "What colors are in this image?"
- "Is this print-ready?"

### 3. Review Tool Executions
When the AI executes tools, you'll see detailed cards showing:

**Tool Execution Card Components:**
- **Tool Name**: Friendly name (e.g., "Color Knockout" instead of "color_knockout")
- **Confidence Score**: Color-coded badge showing confidence level
  - Green (95%+): Very confident
  - Blue (80-94%): Confident
  - Yellow (70-79%): Moderate confidence
  - Red (<70%): Low confidence
- **Success/Error Status**: Check mark for success, X for failure
- **Result Preview**: Click "Show result preview" to see the output
- **Parameters**: Click "Parameters" to see the exact settings used

### 4. Canvas Updates
If a tool execution succeeds and produces an image:
- The main canvas is automatically updated with the result
- You can continue editing from there
- The conversation history is maintained

## Suggested Prompts

The panel includes quick-action buttons for common tasks:
1. **Remove the background**: Remove image background
2. **Remove white color**: Knockout white pixels
3. **Make colors vibrant**: Recolor for vibrancy
4. **Upscale this image**: Increase resolution
5. **Show color palette**: Extract and display colors
6. **Remove red tones**: Knockout red colors

Click any suggested prompt to populate the input field.

## Understanding Confidence Scores

The AI provides confidence scores for both overall responses and individual tool executions:

### Overall Confidence
Shown as a badge next to the AI's response header.

### Tool Execution Confidence
Each tool execution has its own confidence score:
- **95-100%**: Very high confidence - the AI is certain this is correct
- **80-94%**: High confidence - the AI believes this is the right approach
- **70-79%**: Moderate confidence - the AI thinks this will work but isn't certain
- **Below 70%**: Low confidence - the AI is attempting this but unsure

**Note**: Low confidence doesn't mean failure. The AI still executes the tool, but you should review the results carefully.

## Tool Execution Flow

When you send a message:

1. **Analysis Phase**: The AI analyzes your request and the current image
   - Shows: "Analyzing and processing..."

2. **Tool Selection**: The AI determines which tool(s) to use
   - Multiple tools may be chained together

3. **Parameter Validation**: Parameters are validated before execution
   - The AI ensures parameters meet tool requirements

4. **Execution**: Tools are executed with retry logic
   - Up to 3 attempts for each tool
   - Automatic parameter adjustment on failures

5. **Result Display**: Tool execution cards are displayed
   - Success/failure status
   - Confidence scores
   - Result preview
   - Parameter details

6. **Canvas Update**: If successful, the main canvas is updated
   - You'll see the result immediately
   - Original image is replaced

## Advanced Features

### Conversation Context
The AI remembers the last 10 messages for context:
- You can refer to previous operations
- The AI understands follow-up requests
- Example:
  - You: "Remove the background"
  - AI: *removes background*
  - You: "Now make it bigger"
  - AI: *understands you mean upscale the image*

### Error Handling
If something goes wrong:
1. The AI will display an error message
2. Tool execution cards will show failure status
3. The error details are included
4. You can retry with a different prompt

### Result Preview
For tool executions with image outputs:
- Click "Show result preview" to see the output
- Preview is displayed inline
- Helps you verify before committing
- Canvas updates automatically on success

## Tips for Best Results

### 1. Be Specific
- Good: "Remove the white background"
- Less Good: "Fix the background"

### 2. One Task at a Time
- Good: "Remove the background" then "Upscale the image"
- Less Good: "Remove the background and make it bigger and change colors"

### 3. Use Natural Language
- Good: "Make the shirt red"
- Also Good: "Change the shirt color to red"
- Also Good: "Recolor the shirt to red"

### 4. Check Confidence Scores
- High confidence (95%+): Trust the result
- Moderate confidence (70-79%): Review the result
- Low confidence (<70%): Verify carefully or try rewording

### 5. Review Tool Executions
- Expand the Parameters section to see what was used
- Preview the result before accepting
- Learn which prompts work best for your needs

## Troubleshooting

### "Please upload an image first"
**Solution**: You need to upload an image before the AI can help. Use the file upload in the main editor.

### "I encountered an error: API error: 503"
**Solution**: The AI service is not configured. Contact your administrator to set up the ANTHROPIC_API_KEY.

### "I encountered an error: Rate limit exceeded"
**Solution**: Too many requests. Wait a moment and try again.

### Low Confidence Scores
**Solution**: Try rewording your prompt to be more specific. The AI needs clear instructions.

### Tool Execution Failed
**Solution**:
1. Check the error message in the tool execution card
2. Try rewording your prompt
3. Verify the image is suitable for the operation
4. Check the parameters used (expand the Parameters section)

### Canvas Not Updating
**Solution**:
1. Check if the tool execution succeeded (green check mark)
2. Verify there's a result image (click "Show result preview")
3. Try refreshing the page
4. Re-upload the image

## Supported Operations

The AI Design Partner currently supports:

1. **Color Knockout**: Remove specific colors from the image
2. **Recolor**: Change colors in the image
3. **Texture Cut**: Cut texture patterns
4. **Background Removal**: Remove image backgrounds
5. **Upscaling**: Increase image resolution
6. **Color Palette Extraction**: Extract dominant colors
7. **Color Picking**: Pick colors at specific positions
8. **Image Analysis**: Analyze image properties

## Privacy and Security

- All image processing happens on the server
- Images are sent to the AI service for analysis
- No images are permanently stored
- Conversation history is session-only
- Each session has a unique conversation ID

## Technical Details

**AI Model**: Claude Vision API (Sonnet 4.5)
**Retry Logic**: Up to 3 attempts per tool
**Conversation History**: Last 10 messages
**User Context**: Custom apparel printing (novice level)
**Confidence Threshold**: 95% for production-ready operations

## Support

If you encounter issues:
1. Check the browser console for error logs
2. Review the tool execution details
3. Try rewording your prompt
4. Contact support with the conversation ID

## Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line (not implemented yet)

## Future Enhancements

Planned features:
- Multi-image support
- Undo/redo operations
- Save conversation history
- Export tool execution logs
- Custom user context settings
- Model selection (Claude vs Gemini)

---

**Version**: 1.0.0 (Phase 8 - Final Release)
**Last Updated**: 2025-10-13
