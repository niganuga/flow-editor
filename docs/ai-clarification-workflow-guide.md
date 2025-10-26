# AI Designer Partner - Clarification Workflow

## Overview

The clarification workflow adds an optional confirmation step where the AI:
1. Repeats what the user asked for (parsed into steps)
2. Checks print readiness and shows warnings
3. Suggests better workflows when relevant
4. Gets user confirmation before executing

**Design Goal**: Be helpful, not annoying. Only show clarification when it adds value.

---

## Visual Design

### Neobrutalist Aesthetic
- **Accent border** (3px) to distinguish from regular messages
- **Bold shadow** (4px) in accent color
- **Color-coded sections**:
  - Green = Workflow suggestion
  - Yellow = Print warnings
  - Accent = Clarification container
- **Mobile-responsive** buttons that stack on small screens

### Example Flow

```
┌──────────────────────────────────────────────────────┐
│ [Sparkles] Let me confirm what you want          [X] │ <- Accent bg
├──────────────────────────────────────────────────────┤
│                                                      │
│ [1] Your Request                                     │
│     1. Remove orange hotkey buttons                  │
│     2. Trim extra orange spaces                      │
│     3. Resize to 800px                               │
│     4. Rotate 90 degrees                             │
│     5. Generate white t-shirt mockup                 │
│                                                      │
│ [!] Print Readiness Check              <- Yellow box │
│     Current: 1200x800px @ 72 DPI                     │
│     Recommended: 3600x2400px @ 300 DPI               │
│     ! Low resolution for print quality               │
│                                                      │
│ [💡] Suggested Workflow                <- Green box  │
│     Upscale to 300 DPI first, then proceed           │
│                                                      │
│     1. Upscale to 300 DPI                            │
│     2. Remove orange hotkey buttons                  │
│     3. Trim extra orange spaces                      │
│     4. Rotate 90 degrees                             │
│     5. Resize to 800px                               │
│     6. Generate white t-shirt mockup                 │
│                                                      │
│     Why this is better:                              │
│     ✓ Better quality after background removal        │
│     ✓ Preserves detail in mockup generation          │
│                                                      │
├──────────────────────────────────────────────────────┤
│ [Use Suggested Order] [Use Original Order] [Cancel] │
│                                                      │
│ You can also type "yes", "use suggested", or "cancel"│
└──────────────────────────────────────────────────────┘
```

---

## Component API

### `<AIClarificationMessage>`

**Props**:
```typescript
interface ClarificationMessageProps {
  clarification: ClarificationMessage
  onResponse: (action: ClarificationAction) => void
  onCancel: () => void
}
```

**Usage**:
```tsx
<AIClarificationMessage
  clarification={clarificationData}
  onResponse={(action) => {
    if (action === 'accept-suggested') {
      executeWorkflow(clarification.suggestion.suggestedSteps)
    } else if (action === 'use-original') {
      executeWorkflow(clarification.parsedSteps)
    }
  }}
  onCancel={() => setClarification(null)}
/>
```

### `<ClarificationLoadingIndicator>`

Shows while AI is analyzing the request.

**Usage**:
```tsx
{isAnalyzing && <ClarificationLoadingIndicator />}
```

---

## Integration with AI Chat Panel

### 1. Add State Management

```typescript
// In components/panels/ai-chat-panel.tsx

import type { ClarificationMessage, ClarificationAction } from "@/lib/types/ai-clarification"
import { AIClarificationMessage, ClarificationLoadingIndicator } from "@/components/ai-clarification-message"

// Add state
const [pendingClarification, setPendingClarification] = useState<ClarificationMessage | null>(null)
const [isAnalyzing, setIsAnalyzing] = useState(false)
```

### 2. Modify API Response Handling

```typescript
// After orchestrator API call
const result = await response.json()

// Check if we need clarification
if (result.needsClarification && result.clarification) {
  setPendingClarification(result.clarification)
  setIsProcessing(false)
  return // Don't execute yet - wait for user confirmation
}

// Otherwise execute tools as normal...
```

### 3. Add Clarification to Message Stream

```typescript
{/* In the messages container */}
{messages.map((message) => (
  // ... existing message rendering
))}

{/* Show clarification if pending */}
{isAnalyzing && (
  <div className="flex justify-start animate-in slide-in-from-bottom">
    <ClarificationLoadingIndicator />
  </div>
)}

{pendingClarification && (
  <div className="flex justify-start animate-in slide-in-from-bottom">
    <div className="max-w-[90%]">
      <AIClarificationMessage
        clarification={pendingClarification}
        onResponse={(action) => {
          if (action === 'cancel') {
            setPendingClarification(null)
            // Add cancelled message
            const cancelMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: 'Operation cancelled. What would you like to do instead?',
              timestamp: Date.now(),
            }
            setMessages(prev => [...prev, cancelMsg])
            return
          }

          // Determine which workflow to execute
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

          // Clear clarification and execute
          setPendingClarification(null)
          executeToolWorkflow(stepsToExecute)
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
```

### 4. Handle Text Responses to Clarification

```typescript
// In handleSendMessage, check if we have pending clarification
if (pendingClarification) {
  const lowerMessage = userMessage.toLowerCase().trim()

  // Check for confirmation responses
  if (['yes', 'confirm', 'ok', 'go ahead', 'do it'].includes(lowerMessage)) {
    // Use suggested workflow if available, otherwise original
    const stepsToExecute = pendingClarification.suggestion
      ? pendingClarification.suggestion.suggestedSteps
      : pendingClarification.parsedSteps

    setPendingClarification(null)
    executeToolWorkflow(stepsToExecute)
    return
  }

  if (['use suggested', 'suggested', 'better way'].some(p => lowerMessage.includes(p))) {
    if (pendingClarification.suggestion) {
      setPendingClarification(null)
      executeToolWorkflow(pendingClarification.suggestion.suggestedSteps)
      return
    }
  }

  if (['use original', 'original', 'my way'].some(p => lowerMessage.includes(p))) {
    setPendingClarification(null)
    executeToolWorkflow(pendingClarification.parsedSteps)
    return
  }

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
}
```

---

## When to Show Clarification

The `shouldShowClarification()` utility function determines when clarification is needed:

### Show Clarification When:
1. **Multiple steps** (>2 operations)
2. **Print readiness concerns** (low DPI, wrong dimensions)
3. **Better workflow available** (AI has optimization suggestion)
4. **Destructive operations** (crop, resize that can't be undone)

### Skip Clarification For:
1. **Simple single-step requests** ("remove background")
2. **Non-destructive queries** ("show color palette")
3. **Reversible operations** (rotate, flip with undo)

### Example Decision Flow:

```typescript
import { shouldShowClarification } from "@/lib/types/ai-clarification"

// After parsing user request into steps
const needsClarification = shouldShowClarification(
  parsedSteps,
  printReadinessCheck,
  !!workflowSuggestion
)

if (needsClarification) {
  return {
    needsClarification: true,
    clarification: {
      id: crypto.randomUUID(),
      userRequest: originalMessage,
      parsedSteps,
      printReadiness: printReadinessCheck,
      suggestion: workflowSuggestion,
      timestamp: Date.now(),
    }
  }
}

// Otherwise proceed with execution
```

---

## Backend Integration

### Orchestrator API Changes

```typescript
// app/api/ai/chat-orchestrator/route.ts

// Add to response schema
type OrchestratorResponse = {
  success: boolean
  message: string

  // New clarification fields
  needsClarification?: boolean
  clarification?: ClarificationMessage

  // Existing fields
  toolCalls?: ToolCall[]
  confidence: number
  conversationId: string
  timestamp: number
  error?: string
}

// In orchestrator logic
async function analyzeRequest(message: string, imageUrl: string) {
  // ... parse request into steps

  // Check print readiness
  const printCheck = await checkPrintReadiness(imageUrl)

  // Generate workflow suggestion if applicable
  const suggestion = await suggestBetterWorkflow(parsedSteps, printCheck)

  // Decide if clarification needed
  if (shouldShowClarification(parsedSteps, printCheck, !!suggestion)) {
    return {
      success: true,
      message: "Let me confirm what you want to do",
      needsClarification: true,
      clarification: {
        id: crypto.randomUUID(),
        userRequest: message,
        parsedSteps,
        printReadiness: printCheck,
        suggestion,
        timestamp: Date.now(),
      },
      confidence: 95,
      conversationId,
      timestamp: Date.now(),
    }
  }

  // Otherwise return tool calls for immediate execution
  return {
    success: true,
    message: "Executing your request...",
    toolCalls: parsedSteps.map(step => ({
      toolName: step.toolName,
      parameters: step.parameters,
    })),
    confidence: 90,
    conversationId,
    timestamp: Date.now(),
  }
}
```

---

## Accessibility Features

### Keyboard Navigation
- All buttons keyboard accessible (tab navigation)
- Enter key confirms default action (suggested workflow if available)
- Escape key cancels clarification

### Screen Reader Support
```tsx
// Proper ARIA labels
<div role="dialog" aria-labelledby="clarification-title" aria-describedby="clarification-desc">
  <h3 id="clarification-title">Confirm Your Request</h3>
  <div id="clarification-desc">
    Review the steps and choose how to proceed
  </div>

  <button aria-label="Accept suggested workflow (recommended)">
    Use Suggested Order
  </button>

  <button aria-label="Use your original request">
    Use Original Order
  </button>

  <button aria-label="Cancel operation">
    Cancel
  </button>
</div>
```

### Color Contrast
- All text meets WCAG AA standards
- Icons supplement color coding (not color alone)
- Focus indicators visible on all interactive elements

---

## Mobile Responsive Design

### Breakpoints

**Desktop (≥640px)**:
```
[Use Suggested Order] [Use Original Order] [Cancel]
```

**Mobile (<640px)**:
```
[Suggested]
[Original]
[Cancel]
```

### CSS Classes
```tsx
// Button layout
<div className="flex flex-col sm:flex-row gap-2">
  <button className="flex-1">
    <span className="hidden sm:inline">Use Suggested Order</span>
    <span className="sm:hidden">Suggested</span>
  </button>
</div>
```

### Touch Targets
- Minimum 44x44px touch targets
- Adequate spacing between buttons (8px gap)
- Larger padding on mobile for easier tapping

---

## Performance Considerations

### Progressive Disclosure
- Collapse detailed print info by default on mobile
- Expand benefits section on user action
- Lazy load print readiness checks

### State Management
- Only one clarification at a time
- Clear previous clarification on new request
- Don't block UI while analyzing

### Animation Budget
- Use CSS transforms for smooth slide-in
- Hardware-accelerated animations only
- Disable animations on reduced motion preference

```tsx
<div className="animate-in slide-in-from-bottom duration-300">
  {/* Clarification content */}
</div>

// CSS
@media (prefers-reduced-motion: reduce) {
  .animate-in {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## Testing Checklist

### Functional Tests
- [ ] Clarification shows for multi-step requests
- [ ] Clarification skips for simple requests
- [ ] Button clicks execute correct workflow
- [ ] Text responses ("yes", "use suggested") work
- [ ] Cancel clears clarification
- [ ] Print warnings display correctly
- [ ] Workflow suggestions show benefits

### Accessibility Tests
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces all content
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets ≥44x44px

### Mobile Tests
- [ ] Buttons stack vertically on small screens
- [ ] Text truncates appropriately
- [ ] Scrollable on short viewports
- [ ] Touch targets adequately spaced

### Edge Cases
- [ ] Very long user requests (>10 steps)
- [ ] Requests with no image loaded
- [ ] Multiple rapid requests
- [ ] Network errors during analysis
- [ ] Slow image analysis responses

---

## Example User Flows

### Flow 1: Simple Request (No Clarification)

**User**: "remove background"

**AI**: *executes immediately*

**Result**: Background removed, no clarification shown

---

### Flow 2: Multi-Step with Suggestion

**User**: "remove hot key buttons, trim orange spaces, resize to 800px, rotate 90 degrees, then add mockup on white tshirt"

**AI**: Shows clarification with:
- Parsed 5 steps
- Print warning (72 DPI → needs 300 DPI)
- Suggested workflow (upscale first)

**User**: Clicks "Use Suggested Order"

**AI**: Executes optimized workflow, shows progress

**Result**: High-quality mockup with proper print resolution

---

### Flow 3: User Rejects Suggestion

**User**: "resize to 500px then upscale"

**AI**: Shows clarification with suggestion to upscale first

**User**: Clicks "Use Original Order"

**AI**: Executes user's requested order (even if suboptimal)

**Result**: User maintains control, AI respects choice

---

### Flow 4: Text Response

**User**: "remove background and crop tight"

**AI**: Shows clarification (destructive operations)

**User**: Types "yes"

**AI**: Executes workflow

**Result**: Natural conversation flow maintained

---

## Future Enhancements

1. **Learning from feedback**: Track which suggestions users accept/reject
2. **User preferences**: "Don't show clarifications for simple edits"
3. **Comparison preview**: Side-by-side of suggested vs original
4. **Undo clarification**: "Change my mind" after confirming
5. **Smart defaults**: Auto-accept for trusted patterns

---

## Summary

The clarification workflow adds intelligence without adding friction:

✓ **Visual Design**: Fits neobrutalist aesthetic perfectly
✓ **User Control**: Always gives user final say
✓ **Progressive Disclosure**: Only shows when valuable
✓ **Accessible**: Keyboard navigation, screen readers, mobile-friendly
✓ **Fast to Implement**: Reuses existing components and patterns

**Key Principle**: Be helpful, not annoying. The AI should feel like a smart assistant who double-checks before executing complex operations, not a bureaucrat who requires approval for everything.
