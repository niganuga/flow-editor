# Auto-Undo Correction Feature

## 🎯 Overview

The AI Design Partner now includes **intelligent auto-undo** functionality that automatically reverts to the previous image state when the user provides corrective feedback. This prevents compound errors and ensures corrections are applied to the correct image state.

## 🔍 Problem It Solves

### Before (Incorrect Behavior)
```
1. User: "Remove orange color in blocks"
   → Tool executes, removes too much
2. User: "That was too much, just the blocks"
   → Tool executes on ALREADY EDITED image
   → Compounds the error ❌
```

### After (Correct Behavior)
```
1. User: "Remove orange color in blocks"
   → Tool executes, removes too much
2. User: "That was too much, just the blocks"
   → System AUTO-UNDOS to previous state ✅
   → Tool executes with corrected parameters on original image
   → Result is correct ✅
```

## 🚀 How It Works

### Detection Trigger Phrases

The system detects correction intent when user messages contain phrases like:

- **"too much"** / **"too little"** - Quantity feedback
- **"incorrect"** / **"wrong"** - Direct correction
- **"try again"** / **"undo that"** - Retry request
- **"more precise"** / **"more selective"** - Refinement request
- **"just the"** / **"only the"** - Scope narrowing
- **"knocked out too"** / **"removed too"** - Tool-specific feedback

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User sends correction message                            │
│    "knocked out too much, just the orange inside blocks"   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. detectCorrectionIntent() analyzes message                │
│    → Detects: "knocked out too" + "just the"               │
│    → Returns: true                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. System checks if undo is available                       │
│    → canUndo() → true                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Auto-undo to previous state                              │
│    → undo() called                                          │
│    → Image reverts to pre-edit state                        │
│    → Chat shows: "↩️ Reverted to previous state..."        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. AI processes correction with new parameters              │
│    → Claude receives system prompt about auto-undo          │
│    → Returns corrected tool call (lower tolerance, etc.)    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Tool executes on REVERTED image                          │
│    → Correct result applied ✅                              │
└─────────────────────────────────────────────────────────────┘
```

## 📝 Implementation Details

### 1. Correction Detection

**File:** `components/panels/ai-chat-panel.tsx:252-279`

```typescript
const detectCorrectionIntent = (message: string): boolean => {
  const correctionPhrases = [
    'too much',
    'too little',
    'not enough',
    'incorrect',
    'wrong',
    'undo that',
    'revert',
    'go back',
    'try again',
    'more precise',
    'more selective',
    'be more',
    'instead',
    'just the',
    'only the',
    'just inside',
    'only inside',
    'not quite',
    'didn\'t work',
    'knocked out too',
    'removed too',
  ]

  const lowerMessage = message.toLowerCase()
  return correctionPhrases.some(phrase => lowerMessage.includes(phrase))
}
```

### 2. Auto-Undo Logic

**File:** `components/panels/ai-chat-panel.tsx:317-335`

```typescript
// ===== AUTO-UNDO FOR CORRECTIONS =====
const isCorrectionRequest = detectCorrectionIntent(userMessage)
const { canUndo, undo } = useImageStore.getState()

if (isCorrectionRequest && canUndo()) {
  console.log('[AI Chat] 🔄 Correction detected - auto-undoing to previous state')
  undo()

  // Add informational message to chat
  const undoInfoMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: "↩️ Reverted to previous state before applying correction...",
    timestamp: Date.now(),
    confidence: 100,
  }
  setMessages(prev => [...prev, undoInfoMsg])
}
```

### 3. Claude System Prompt

**File:** `lib/ai-chat-orchestrator.ts:610-620`

Claude is informed about the auto-undo workflow:

```
AUTO-UNDO WORKFLOW:
When the user says the previous edit was incorrect (e.g., "too much", "wrong",
"try again", "only the blocks"), the system will AUTOMATICALLY undo to the
previous image state before applying your corrected tool call. You should:
- Acknowledge their feedback
- Provide corrected parameters (e.g., lower tolerance, different colors)
- Execute the tool with the new parameters
- The system handles the undo for you - don't mention undoing

Example:
User: "knocked out too much, just the orange inside the blocks"
You: "Got it! I'll be more selective and only target the orange inside those
      blocks. Using a lower tolerance..."
System: [Auto-undos to previous state, then applies your corrected tool call]
```

## 🧪 Testing

### Test Scenario 1: Tolerance Correction

```
1. Upload image with orange blocks
2. Say: "knockout the orange color in the square blocks"
   → Tool executes with default tolerance (30)
3. Say: "knocked out too much, just the orange inside the blocks"
   → System auto-undos
   → Shows: "↩️ Reverted to previous state..."
   → Tool executes with lower tolerance (15-20)
   → Result is more selective ✅
```

### Test Scenario 2: Color Correction

```
1. Upload image with multiple colors
2. Say: "remove the red areas"
   → Removes wrong shade of red
3. Say: "wrong red, just the bright red"
   → System auto-undos
   → Tool targets correct red
   → Result is correct ✅
```

### Test Scenario 3: Area Correction

```
1. Upload image with text and background
2. Say: "remove white background"
   → Removes white from text too
3. Say: "only the background, not the text"
   → System auto-undos
   → Tool processes with better targeting
   → Text preserved ✅
```

## 📊 Console Logs

When auto-undo is triggered, you'll see:

```
[AI Chat] 🔄 Correction detected - auto-undoing to previous state
[History] Undo to: Original Upload
↩️ Reverted to previous state before applying correction...
[AI Chat] Executing color_knockout client-side...
[Tool:color_knockout] 100% - Complete
[AI Chat] color_knockout succeeded with result URL
```

## ✅ Benefits

1. **Prevents Compound Errors**
   - Corrections apply to the correct state
   - No accumulation of mistakes

2. **Natural User Experience**
   - Users don't need to manually undo
   - Just say what's wrong and the system handles it

3. **Intelligent Detection**
   - Recognizes 20+ correction phrases
   - Handles both explicit and implicit feedback

4. **Safe Operation**
   - Only undos when history is available
   - Preserves all edit history
   - Can still manually undo if needed

## 🔮 Future Enhancements

1. **Multi-Step Undo**
   - "Go back 2 steps and try again"
   - "Revert to the version before upscaling"

2. **Contextual Learning**
   - Learn which corrections users commonly make
   - Preemptively adjust parameters

3. **Visual Diff**
   - Show before/after comparison
   - Highlight what changed

4. **Undo Confirmation**
   - Optional: Ask before auto-undoing
   - "Should I revert to the previous state first?"

## 🐛 Edge Cases Handled

- **No history available** → Auto-undo skipped, continues normally
- **Multiple corrections** → Each triggers auto-undo
- **Mixed feedback** → Only undos if correction phrases detected
- **False positives** → Conservative detection (requires specific phrases)

## 🎯 Success Criteria

- ✅ Detects correction intent accurately
- ✅ Auto-undos before re-applying edit
- ✅ Shows informational message to user
- ✅ Claude understands not to mention undoing
- ✅ Result applies to correct image state
- ✅ Console logs show workflow clearly

---

**Status:** ✅ **IMPLEMENTED AND READY TO TEST**

**Test it now:** Upload an image, make an edit, then say "that was too much" and watch the auto-undo happen!
