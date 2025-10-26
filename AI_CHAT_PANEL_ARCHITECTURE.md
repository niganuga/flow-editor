# AI Chat Panel Architecture

## Complete System Architecture (Phase 8)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                    (AI Chat Panel Component)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Info Banner                              │ │
│  │  Phase 8: AI Design Assistant                              │ │
│  │  Natural language image editing powered by Claude          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Image Status                               │ │
│  │  📷 Image loaded - Ready to edit!                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Messages Area                              │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────┐                        │ │
│  │  │ User Message                    │                        │ │
│  │  │ "Remove the background"         │                        │ │
│  │  └────────────────────────────────┘                        │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │ ✨ AI Design Partner            🟢 98% confidence │    │ │
│  │  │ "I'll remove the background for you!"            │    │ │
│  │  │                                                    │    │ │
│  │  │ ⚡ Tool Executions (1)                            │    │ │
│  │  │ ┌──────────────────────────────────────────────┐ │    │ │
│  │  │ │ ⚡ Background Removal  🟢 98%  ✓             │ │    │ │
│  │  │ │ ✓ Executed successfully                      │ │    │ │
│  │  │ │ 👁 Show result preview                       │ │    │ │
│  │  │ │ 🔽 Parameters                                │ │    │ │
│  │  │ └──────────────────────────────────────────────┘ │    │ │
│  │  │                                                    │    │ │
│  │  │ 🕐 2:34 PM                                        │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  │                                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Suggested Prompts                          │ │
│  │  [Remove bg] [Remove white] [Vibrant] [Upscale] [Palette] │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Input: [What would you like to do?__________] [📤 Send]  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌───────────┐
│   User    │
│  Action   │
└─────┬─────┘
      │
      │ 1. Types message and clicks send
      │
      ▼
┌─────────────────────────────────────┐
│  AI Chat Panel Component            │
│  - Validates input                  │
│  - Checks image loaded              │
│  - Creates user message             │
│  - Sets processing state            │
└─────────────┬───────────────────────┘
              │
              │ 2. Sends API request
              │
              ▼
┌─────────────────────────────────────┐
│  POST /api/ai/chat-orchestrator     │
│  - Validates request                │
│  - Checks API key                   │
│  - Validates image URL              │
└─────────────┬───────────────────────┘
              │
              │ 3. Calls orchestrator
              │
              ▼
┌─────────────────────────────────────┐
│  AI Chat Orchestrator               │
│  - Manages conversation             │
│  - Calls Claude Vision API          │
│  - Handles function calling         │
└─────────────┬───────────────────────┘
              │
              │ 4. Claude analyzes image + message
              │
              ▼
┌─────────────────────────────────────┐
│  Claude Vision API                  │
│  - Analyzes image                   │
│  - Understands request              │
│  - Returns tool call                │
└─────────────┬───────────────────────┘
              │
              │ 5. Tool parameters returned
              │
              ▼
┌─────────────────────────────────────┐
│  Parameter Validator                │
│  - Validates parameters             │
│  - Type checks                      │
│  - Range checks                     │
└─────────────┬───────────────────────┘
              │
              │ 6. Validated parameters
              │
              ▼
┌─────────────────────────────────────┐
│  Tool Executor                      │
│  - Calls appropriate tool           │
│  - Handles errors                   │
│  - Retries on failure (up to 3x)   │
└─────────────┬───────────────────────┘
              │
              │ 7. Tool execution result
              │
              ▼
┌─────────────────────────────────────┐
│  Confidence Scorer                  │
│  - Calculates confidence            │
│  - Considers validation             │
│  - Considers execution success      │
└─────────────┬───────────────────────┘
              │
              │ 8. Complete response
              │
              ▼
┌─────────────────────────────────────┐
│  API Response                       │
│  {                                  │
│    success: true,                   │
│    message: "...",                  │
│    toolExecutions: [...],           │
│    confidence: 98                   │
│  }                                  │
└─────────────┬───────────────────────┘
              │
              │ 9. Receives response
              │
              ▼
┌─────────────────────────────────────┐
│  AI Chat Panel Component            │
│  - Displays assistant message       │
│  - Renders tool execution cards     │
│  - Shows confidence badges          │
│  - Updates canvas if success        │
└─────────────┬───────────────────────┘
              │
              │ 10. Canvas update
              │
              ▼
┌─────────────────────────────────────┐
│  Image Store (Zustand)              │
│  - Updates imageUrl                 │
│  - Updates imageFile                │
│  - Triggers canvas re-render        │
└─────────────┬───────────────────────┘
              │
              │ 11. Visual update
              │
              ▼
┌─────────────────────────────────────┐
│  Canvas Component                   │
│  - Displays new image               │
│  - User sees result                 │
└─────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 AIChatPanel (Main)                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  State:                                                   │
│  - messages: ChatMessage[]                                │
│  - inputValue: string                                     │
│  - isProcessing: boolean                                  │
│  - conversationId: string                                 │
│                                                           │
│  Hooks:                                                   │
│  - useImageStore() → { imageUrl, setImage }             │
│                                                           │
│  Methods:                                                 │
│  - handleSendMessage()                                    │
│  - handleSuggestedPrompt(prompt)                         │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         InfoBanner Component (inline)             │  │
│  │  - Shows phase information                        │  │
│  │  - Explains feature                               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         ImageStatus Component (inline)            │  │
│  │  - Shows image loaded status                      │  │
│  │  - Conditional rendering                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Messages Container                        │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │  ChatMessage (mapped)                    │    │  │
│  │  │  - User or Assistant                     │    │  │
│  │  │  - Content display                       │    │  │
│  │  │  - Timestamp                             │    │  │
│  │  │  - Tool executions (if applicable)       │    │  │
│  │  │                                           │    │  │
│  │  │  ┌─────────────────────────────────┐    │    │  │
│  │  │  │  ToolExecutionCard              │    │    │  │
│  │  │  │  - Tool name                    │    │    │  │
│  │  │  │  - Confidence badge             │    │    │  │
│  │  │  │  - Success/error status         │    │    │  │
│  │  │  │  - Result preview (toggle)      │    │    │  │
│  │  │  │  - Parameters (toggle)          │    │    │  │
│  │  │  └─────────────────────────────────┘    │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  │                                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Processing Indicator (conditional)        │  │
│  │  - Shows when isProcessing = true                 │  │
│  │  - Animated spinner                               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Suggested Prompts                         │  │
│  │  - 6 quick-action buttons                         │  │
│  │  - Populates input field                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Input Area                                │  │
│  │  - Text input                                     │  │
│  │  - Send button                                    │  │
│  │  - Disabled states                                │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Sub-Component: ToolExecutionCard

```
┌─────────────────────────────────────────────────────────┐
│               ToolExecutionCard                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Props:                                                   │
│  - execution: ToolExecution                               │
│                                                           │
│  State:                                                   │
│  - isExpanded: boolean (for parameters)                   │
│  - showPreview: boolean (for result image)                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Tool Header                                      │  │
│  │  ⚡ Background Removal    🟢 98%  ✓              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Success/Error Message                            │  │
│  │  ✓ Executed successfully                          │  │
│  │  or                                                │  │
│  │  ✗ Error: [error message]                         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Result Preview (toggleable)                      │  │
│  │  👁 Show result preview                           │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  [Preview Image]                            │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Parameters (expandable)                          │  │
│  │  🔽 Parameters                                    │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  {                                          │ │  │
│  │  │    "threshold": 10,                         │ │  │
│  │  │    "tolerance": 0.1                         │ │  │
│  │  │  }                                          │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Sub-Component: ConfidenceBadge

```
┌─────────────────────────────────────┐
│       ConfidenceBadge               │
├─────────────────────────────────────┤
│                                     │
│  Props:                             │
│  - confidence: number               │
│                                     │
│  Logic:                             │
│  - getColor(confidence)             │
│    - 95+: green                     │
│    - 80-94: blue                    │
│    - 70-79: yellow                  │
│    - <70: red                       │
│                                     │
│  - getTextColor(confidence)         │
│    - Ensures readability            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Render:                            │
│  ┌───────────────────────────────┐ │
│  │  ⚡ 98%                       │ │
│  └───────────────────────────────┘ │
│  [Green background, white text]   │
│                                     │
└─────────────────────────────────────┘
```

## State Management Flow

```
┌───────────────────────────────────────────────────────────┐
│                    Component State                        │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  messages: ChatMessage[]                                    │
│  ├─ User messages                                          │
│  ├─ Assistant messages                                     │
│  └─ Each with optional toolExecutions                      │
│                                                             │
│  inputValue: string                                         │
│  └─ Controlled input field                                 │
│                                                             │
│  isProcessing: boolean                                      │
│  ├─ Disables input during processing                       │
│  └─ Shows processing indicator                             │
│                                                             │
│  conversationId: string (UUID)                              │
│  └─ Unique per session, persists across messages           │
│                                                             │
└───────────────────────────────────────────────────────────┘
           │                                │
           │                                │
           ▼                                ▼
┌─────────────────────┐      ┌──────────────────────────┐
│   Image Store       │      │   API Communication      │
│   (Zustand)         │      │                          │
├─────────────────────┤      ├──────────────────────────┤
│ - imageUrl          │      │ - POST /api/orchestrator │
│ - imageFile         │      │ - Request body           │
│ - imageName         │      │ - Response parsing       │
│                     │      │ - Error handling         │
│ Methods:            │      └──────────────────────────┘
│ - setImage()        │                  │
│ - clearImage()      │                  │
└─────────────────────┘                  │
           ▲                              │
           │                              │
           └──────────────────────────────┘
            Canvas updates on success
```

## Error Handling Flow

```
User Action
    │
    ▼
Input Validation
    │
    ├─ No input → Button disabled
    ├─ No image → Show error message
    └─ Valid → Continue
        │
        ▼
API Call
    │
    ├─ Network Error
    │   └─ Show: "Network error. Please check connection."
    │
    ├─ API Error (4xx)
    │   └─ Show: Error message from API
    │
    ├─ API Error (5xx)
    │   └─ Show: "Server error. Please try again."
    │
    └─ Success
        │
        ▼
Tool Execution
    │
    ├─ Validation Failed
    │   └─ Show in tool card: "Parameter validation failed"
    │
    ├─ Execution Failed
    │   └─ Show in tool card: Error details
    │
    └─ Success
        │
        ▼
Canvas Update
    │
    ├─ Update Failed
    │   └─ Log error, show in console
    │
    └─ Success
        └─ User sees new image
```

## Confidence Scoring System

```
┌───────────────────────────────────────────────────────┐
│            Confidence Score Calculation               │
├───────────────────────────────────────────────────────┤
│                                                         │
│  Base Score: 100                                        │
│                                                         │
│  Deductions:                                            │
│  ├─ Parameter validation issues: -5 to -20            │
│  ├─ Ambiguous user request: -10 to -30                │
│  ├─ Tool selection uncertainty: -5 to -15             │
│  ├─ Execution warnings: -5 to -10                     │
│  └─ Retry attempts: -5 per retry                      │
│                                                         │
│  Final Score: 0-100                                     │
│  └─ Displayed as color-coded badge                     │
│                                                         │
├───────────────────────────────────────────────────────┤
│                                                         │
│  Examples:                                              │
│  - "Remove background" → 98% (very clear)             │
│  - "Make it better" → 65% (ambiguous)                 │
│  - "Remove red from shirt" → 92% (specific)           │
│  - Failed then retried → 85% (success with retry)     │
│                                                         │
└───────────────────────────────────────────────────────┘
```

## Message Flow Sequence

```
1. User types message
2. Message validated (non-empty, image loaded)
3. User message added to state
4. UI updates to show user message
5. isProcessing set to true
6. Processing indicator appears
7. API request sent
8. API processes request (5-30 seconds)
9. Response received
10. Response validated
11. Assistant message created
12. Assistant message added to state
13. UI updates to show assistant message
14. Tool execution cards rendered (if any)
15. Canvas updated (if tool succeeded)
16. isProcessing set to false
17. Processing indicator removed
18. User can send next message
```

## File Structure

```
/components/panels/
  └── ai-chat-panel.tsx
      ├── Interfaces
      │   ├── ToolExecution
      │   ├── ChatMessage
      │   ├── OrchestratorResponse
      │   └── AIChatPanelProps
      │
      ├── Constants
      │   └── TOOL_DISPLAY_NAMES
      │
      ├── Components
      │   ├── ConfidenceBadge
      │   ├── ToolExecutionCard
      │   └── AIChatPanel (main)
      │
      └── Handlers
          ├── handleSendMessage
          └── handleSuggestedPrompt
```

## Performance Considerations

```
┌───────────────────────────────────────────────────────┐
│              Performance Optimizations                │
├───────────────────────────────────────────────────────┤
│                                                         │
│  1. Message Rendering                                   │
│     - Use keys for list items (message.id)            │
│     - Virtualization not needed (< 100 messages)      │
│                                                         │
│  2. Image Updates                                       │
│     - Blob URLs for efficient memory                   │
│     - URL.createObjectURL instead of base64           │
│     - Cleanup old blob URLs                            │
│                                                         │
│  3. State Updates                                       │
│     - Batch updates with functional setState          │
│     - Avoid unnecessary re-renders                     │
│     - Use useCallback for handlers (future)           │
│                                                         │
│  4. API Calls                                           │
│     - Debouncing not needed (user clicks send)        │
│     - Abort controller for cleanup (future)           │
│     - Request deduplication (future)                   │
│                                                         │
│  5. Conversation History                                │
│     - Limit to last 10 messages                        │
│     - Reduces API payload size                         │
│     - Maintains context without bloat                  │
│                                                         │
└───────────────────────────────────────────────────────┘
```

---

**Document Version**: 1.0.0
**Phase**: 8 (Complete)
**Last Updated**: 2025-10-13
