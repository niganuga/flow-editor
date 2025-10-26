# Visual Explanation: Style Parameter Bug & Fix

## The Bug (BEFORE)

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER REQUEST: "mockup model wearing the hoodie"                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ CLAUDE VISION API                                                   │
│ - Receives system prompt with <mockup_tool_critical_requirements>  │
│ - Detects keywords: "model", "wearing"                             │
│ - Decision: MUST use style: "lifestyle-model"                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ CLAUDE FUNCTION CALL                                                │
│ {                                                                   │
│   "toolName": "generate_mockup",                                    │
│   "parameters": {                                                   │
│     "product": "hoodie",                                            │
│     "style": "lifestyle-model"  ✅ CORRECT                          │
│   }                                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ CLIENT: lib/tools/ai-mockup.ts                                      │
│ - Validates params with Zod schema                                 │
│ - validated.style = "lifestyle-model" ✅ EXISTS IN MEMORY           │
│                                                                     │
│ - Prepares API request body:                                       │
│   {                                                                 │
│     type: 'mockup',                                                 │
│     params: {                                                       │
│       product: validated.product,     ✅                            │
│       color: actualColor,             ✅                            │
│       placement: validated.placement, ✅                            │
│       // ❌ BUG: style: validated.style NOT INCLUDED                │
│     }                                                               │
│   }                                                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ API ENDPOINT: /api/replicate/predict                                │
│ - Receives params object                                           │
│ - params.style = undefined ❌ MISSING                               │
│ - Logs show: "[API] Style: undefined"                              │
│ - Uses default: product-only                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ RESULT: Flat-lay product shot ❌ WRONG                              │
│ - Expected: Lifestyle photo with model                             │
│ - Got: Product-only flat-lay                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Fix (AFTER)

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER REQUEST: "mockup model wearing the hoodie"                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ CLAUDE VISION API                                                   │
│ - Same prompt, same detection ✅                                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ CLAUDE FUNCTION CALL                                                │
│ {                                                                   │
│   "toolName": "generate_mockup",                                    │
│   "parameters": {                                                   │
│     "product": "hoodie",                                            │
│     "style": "lifestyle-model"  ✅ CORRECT                          │
│   }                                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ CLIENT: lib/tools/ai-mockup.ts (FIXED)                             │
│ - Validates params with Zod schema                                 │
│ - validated.style = "lifestyle-model" ✅                            │
│                                                                     │
│ - Prepares API request body:                                       │
│   {                                                                 │
│     type: 'mockup',                                                 │
│     params: {                                                       │
│       product: validated.product,     ✅                            │
│       color: actualColor,             ✅                            │
│       placement: validated.placement, ✅                            │
│       style: validated.style,         ✅ NOW INCLUDED (LINE 228)    │
│     }                                                               │
│   }                                                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ API ENDPOINT: /api/replicate/predict                                │
│ - Receives params object                                           │
│ - params.style = "lifestyle-model" ✅ PRESENT                       │
│ - Logs show: "[API] Style: lifestyle-model"                        │
│ - Aspect ratio: 3:4 (portrait)                                     │
│ - Uses lifestyle photography prompt                                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ buildMockupPrompt(style="lifestyle-model")                          │
│                                                                     │
│ Returns: "Create a professional lifestyle photograph showing a     │
│ model/person wearing a hoodie... Show a real person/model wearing  │
│ the garment naturally and confidently... in a casual, lifestyle    │
│ setting (urban street, coffee shop, outdoor setting...)"           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ REPLICATE API (qwen-image-edit-plus)                                │
│ - Receives lifestyle photography prompt                            │
│ - Aspect ratio: 3:4 (portrait format)                              │
│ - Generates: Professional lifestyle photo with model               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ RESULT: Lifestyle photo with model ✅ CORRECT                       │
│ - Model wearing hoodie in lifestyle setting                        │
│ - Professional photography quality                                 │
│ - Design integrated into fabric naturally                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The One-Line Fix

**File**: `/lib/tools/ai-mockup.ts`  
**Line**: 228  
**Change**: Added `style: validated.style,` to params object

```diff
  body: JSON.stringify({
    type: 'mockup',
    params: {
      product: validated.product,
      color: actualColor,
      imageUrl: imageData,
      placement: validated.placement,
      size: validated.size,
      background: validated.background,
      angle: validated.angle,
+     style: validated.style,
    },
  }),
```

---

## Why It Matters

**Before Fix**:
- All requests generated flat-lay product shots
- No way to get lifestyle/model photography
- User frustration: "I asked for a model but got a product shot"

**After Fix**:
- Requests with "model"/"wearing"/"lifestyle" → lifestyle photography
- Requests without those keywords → product shots
- System works as designed

---

## Testing Evidence

Logs BEFORE fix:
```
[Orchestrator] Getting tool calls for: mockup model wearing the attached hoodie exactly
[Orchestrator] Found: { textLength: 134, functionCalls: 1 }
[API] Style: undefined ❌
[API] Aspect ratio: 1:1 ❌ (should be 3:4 for lifestyle)
```

Logs AFTER fix (expected):
```
[Orchestrator] Getting tool calls for: mockup model wearing the attached hoodie exactly
[Orchestrator] Found: { textLength: 134, functionCalls: 1 }
[API] Style: lifestyle-model ✅
[API] Aspect ratio: 3:4 ✅ (portrait for lifestyle)
[API] Using lifestyle photography prompt ✅
```

