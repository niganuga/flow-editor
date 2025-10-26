# AI Chat Message Types - Visual Comparison

This guide shows all message types in the AI chat panel for consistent design.

---

## 1. User Message (Existing)

```
┌─────────────────────────────────────────────┐
│                        [User message bubble]│
│                        remove hot keys,     │
│                        trim, resize 800px,  │
│                        rotate, mockup       │
│                        ───────── 2:34 PM    │
└─────────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-foreground` (black)
- Text: `text-background` (white)
- Border: `border-2 border-foreground`
- Shadow: `2px 2px 0px 0px hsl(var(--foreground) / 0.2)`
- Alignment: Right-aligned
- Max width: 85%

---

## 2. Regular Assistant Message (Existing)

```
┌─────────────────────────────────────────────┐
│[Assistant message bubble]                   │
│                                             │
│☆ AI Design Partner              💯 95%     │
│                                             │
│I'll help you with that! Let me process     │
│your image...                                │
│                                             │
│───────────────────────────────── 2:34 PM   │
└─────────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-card` (off-white)
- Text: `text-foreground` (black)
- Border: `border-2 border-foreground/20`
- Shadow: `2px 2px 0px 0px hsl(var(--foreground) / 0.2)`
- Alignment: Left-aligned
- Max width: 85%
- Header: Sparkle icon + "AI Design Partner" + confidence badge

---

## 3. Tool Execution Card (Existing)

```
┌─────────────────────────────────────────────┐
│[Assistant message with tools]              │
│                                             │
│☆ AI Design Partner              💯 95%     │
│                                             │
│Done! Here's what I executed:                │
│                                             │
│ ┌────────────────────────────────────────┐ │
│ │ ⚡ Auto Crop               💯 95% ✓   │ │
│ ├────────────────────────────────────────┤ │
│ │ ✓ Executed successfully                │ │
│ │ [▼ Parameters]                         │ │
│ └────────────────────────────────────────┘ │
│                                             │
│───────────────────────────────── 2:35 PM   │
└─────────────────────────────────────────────┘
```

**Styling (Tool Card):**
- Background: `bg-background/50`
- Border: `border-2 border-foreground/20`
- Shadow: `2px 2px 0px 0px hsl(var(--foreground) / 0.1)`
- Header: `bg-foreground/5` with tool name + confidence + status icon

---

## 4. Clarification Loading Indicator (NEW)

```
┌─────────────────────────────────────────────┐
│[Clarification loading]                      │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ ⚡ Analyzing your request...            ││
│ │    Checking for better workflows and    ││
│ │    print readiness                      ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-accent/5`
- Border: `border-[3px] border-accent/50` (lighter)
- Shadow: `3px 3px 0px 0px hsl(var(--accent) / 0.5)`
- Icon: Pulsing sparkle icon
- Alignment: Left-aligned
- Max width: 90%

---

## 5. Clarification Message - Minimal (NEW)

Simple request with no suggestion, just confirmation needed.

```
┌─────────────────────────────────────────────┐
│[Clarification - Minimal]                    │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ ✨ Let me confirm what you want    [×] ││
│ ├─────────────────────────────────────────┤│
│ │                                         ││
│ │ ① Your Request                          ││
│ │    1. Remove background                 ││
│ │    2. Auto crop                         ││
│ │                                         ││
│ ├─────────────────────────────────────────┤│
│ │ [→ Confirm & Execute]  [Cancel]        ││
│ │                                         ││
│ │ You can also type "yes" or "cancel"     ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-accent/5`
- Border: `border-[3px] border-accent` (BOLD)
- Shadow: `4px 4px 0px 0px hsl(var(--accent))`
- Header: `bg-accent/10 border-b-[3px] border-accent`
- Alignment: Left-aligned
- Max width: 90%

**Buttons:**
- Confirm: Black button (`bg-foreground text-background`)
- Cancel: Gray button (`bg-foreground/5 border-foreground/20`)

---

## 6. Clarification Message - With Warning (NEW)

Has print readiness warnings.

```
┌─────────────────────────────────────────────┐
│[Clarification - With Warning]               │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ ✨ Let me confirm what you want    [×] ││
│ ├─────────────────────────────────────────┤│
│ │                                         ││
│ │ ① Your Request                          ││
│ │    1. Remove background                 ││
│ │    2. Resize to 800px                   ││
│ │    3. Generate mockup                   ││
│ │                                         ││
│ │ ┌────────────────────────────────────┐  ││
│ │ │ ⚠ Print Readiness Check           │  ││
│ │ │                                    │  ││
│ │ │ Current:      1200x800 @ 72 DPI   │  ││
│ │ │ Recommended:  3600x2400 @ 300 DPI │  ││
│ │ │                                    │  ││
│ │ │ ⚠ Low resolution for print        │  ││
│ │ └────────────────────────────────────┘  ││
│ │                                         ││
│ ├─────────────────────────────────────────┤│
│ │ [→ Confirm & Execute]  [Cancel]        ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Warning Box Styling:**
- Background: `bg-yellow-500/10`
- Border: `border-2 border-yellow-500/30`
- Shadow: `2px 2px 0px 0px hsl(var(--foreground) / 0.1)`
- Icon: Yellow warning triangle
- Text: Yellow-700/500 depending on theme

---

## 7. Clarification Message - Full (NEW)

Has warning AND suggestion.

```
┌─────────────────────────────────────────────┐
│[Clarification - Full]                       │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ ✨ Let me confirm what you want    [×] ││
│ ├─────────────────────────────────────────┤│
│ │                                         ││
│ │ ① Your Request                          ││
│ │    1. Remove background                 ││
│ │    2. Resize to 800px                   ││
│ │    3. Generate mockup                   ││
│ │                                         ││
│ │ ┌────────────────────────────────────┐  ││
│ │ │ ⚠ Print Readiness Check           │  ││
│ │ │ Current: 1200x800 @ 72 DPI        │  ││
│ │ │ ⚠ Low resolution for print        │  ││
│ │ └────────────────────────────────────┘  ││
│ │                                         ││
│ │ ┌────────────────────────────────────┐  ││
│ │ │ 💡 Suggested Workflow             │  ││
│ │ │                                    │  ││
│ │ │ Upscale to 300 DPI first          │  ││
│ │ │                                    │  ││
│ │ │ 1. Upscale to 300 DPI             │  ││
│ │ │ 2. Remove background              │  ││
│ │ │ 3. Resize to 800px                │  ││
│ │ │ 4. Generate mockup                │  ││
│ │ │                                    │  ││
│ │ │ Why this is better:               │  ││
│ │ │ ✓ Better quality                  │  ││
│ │ │ ✓ Print ready                     │  ││
│ │ └────────────────────────────────────┘  ││
│ │                                         ││
│ ├─────────────────────────────────────────┤│
│ │ [✓ Use Suggested] [→ Original] [Cancel]││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Suggestion Box Styling:**
- Background: `bg-green-500/10`
- Border: `border-2 border-green-500/30`
- Shadow: `2px 2px 0px 0px hsl(var(--foreground) / 0.1)`
- Icon: Green lightbulb
- Text: Green-700/500 depending on theme

**Buttons:**
- Suggested: Green button (`bg-green-600 text-white`)
- Original: Black button (`bg-foreground text-background`)
- Cancel: Gray button (`bg-foreground/5`)

---

## 8. Processing Indicator (Existing)

```
┌─────────────────────────────────────────────┐
│[Processing indicator]                       │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ ⟳ Analyzing and processing...          ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-card`
- Border: `border-2 border-foreground/20`
- Shadow: `2px 2px 0px 0px hsl(var(--foreground) / 0.2)`
- Icon: Spinning loader
- Alignment: Left-aligned
- Max width: 85%

---

## 9. Error Message (Existing)

```
┌─────────────────────────────────────────────┐
│[Error message]                              │
│                                             │
│☆ AI Design Partner              ⚡ 0%      │
│                                             │
│I encountered an error: Network timeout.     │
│Please try again.                            │
│                                             │
│───────────────────────────────── 2:35 PM   │
└─────────────────────────────────────────────┘
```

**Styling:**
- Same as regular assistant message
- Confidence badge shows 0%
- May include error details in content

---

## 10. Image Result Display (Existing)

```
┌─────────────────────────────────────────────┐
│[Assistant message with image result]        │
│                                             │
│☆ AI Design Partner              💯 95%     │
│                                             │
│✨ Processing complete!                      │
│                                             │
│ ┌────────────────────────────────────────┐ │
│ │ [Image Preview]                        │ │
│ │                                        │ │
│ │ 🖼️                                     │ │
│ │                                        │ │
│ ├────────────────────────────────────────┤ │
│ │ [Edit] mockup          [View] [Apply] │ │
│ └────────────────────────────────────────┘ │
│                                             │
│───────────────────────────────── 2:36 PM   │
└─────────────────────────────────────────────┘
```

**Image Result Styling:**
- Container: `border-2 border-foreground/20`
- Image: `h-48 object-cover`
- Footer: `bg-foreground/5` with action buttons

---

## Message Type Decision Tree

```
User sends message
       │
       ├─ Is there pending clarification?
       │  ├─ YES → Handle clarification response
       │  └─ NO → Continue
       │
       ├─ Does image exist?
       │  ├─ NO → Show error message (Type 9)
       │  └─ YES → Continue
       │
       ├─ Send to orchestrator API
       │
       ├─ Show analyzing indicator (Type 4)
       │
       ├─ Receive API response
       │
       ├─ Does it need clarification?
       │  ├─ YES → Show clarification (Type 5/6/7)
       │  │        Wait for user response
       │  │
       │  └─ NO → Execute tools
       │           │
       │           ├─ Show processing (Type 8)
       │           │
       │           ├─ Execute tools
       │           │
       │           └─ Show result message (Type 2/3/10)
```

---

## Responsive Behavior Comparison

### Desktop (≥640px)

**Clarification Buttons:**
```
[✓ Use Suggested Order] [→ Use Original Order] [Cancel]
        (GREEN)                  (BLACK)         (GRAY)
```

**Regular Message:**
```
Max width: 85% of chat panel (357px if panel is 420px)
```

### Mobile (<640px)

**Clarification Buttons:**
```
[✓ Suggested]
   (GREEN)

[→ Original]
  (BLACK)

[Cancel]
 (GRAY)
```

**Regular Message:**
```
Max width: 90% of chat panel (smaller absolute max)
```

---

## Color System Reference

### Border Colors
```css
/* Regular message */
.message-border { border-color: hsl(var(--foreground) / 0.2) }

/* Clarification container */
.clarification-border { border-color: hsl(var(--accent)) }

/* Warning box */
.warning-border { border-color: hsl(45, 93%, 47%, 0.3) }

/* Suggestion box */
.suggestion-border { border-color: hsl(142, 71%, 45%, 0.3) }

/* Tool card */
.tool-border { border-color: hsl(var(--foreground) / 0.2) }
```

### Background Colors
```css
/* User message */
.user-bg { background: hsl(var(--foreground)) }

/* Assistant message */
.assistant-bg { background: hsl(var(--card)) }

/* Clarification */
.clarification-bg { background: hsla(var(--accent) / 0.05) }

/* Warning box */
.warning-bg { background: hsla(45, 93%, 47%, 0.1) }

/* Suggestion box */
.suggestion-bg { background: hsla(142, 71%, 45%, 0.1) }
```

### Shadow Colors
```css
/* Regular message */
.message-shadow { box-shadow: 2px 2px 0px 0px hsl(var(--foreground) / 0.2) }

/* Clarification */
.clarification-shadow { box-shadow: 4px 4px 0px 0px hsl(var(--accent)) }

/* Warning/Suggestion boxes */
.box-shadow { box-shadow: 2px 2px 0px 0px hsl(var(--foreground) / 0.1) }

/* Buttons */
.button-shadow { box-shadow: 3px 3px 0px 0px rgba(0, 0, 0, 0.8) }
```

---

## Animation States

### Message Appears
```css
@keyframes slide-in-from-bottom {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-enter {
  animation: slide-in-from-bottom 300ms ease-out;
}
```

### Clarification Appears
```css
/* Same animation, larger element */
.clarification-enter {
  animation: slide-in-from-bottom 300ms ease-out;
}
```

### Analyzing Pulse
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.analyzing-icon {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## Accessibility Comparison

### Regular Message
```html
<div role="log" aria-live="polite">
  <div className="message">
    <p>Message content</p>
  </div>
</div>
```

### Clarification Message
```html
<div
  role="dialog"
  aria-labelledby="clarification-title"
  aria-describedby="clarification-desc"
  aria-modal="false"
>
  <h3 id="clarification-title">Let me confirm what you want</h3>
  <p id="clarification-desc">Review the steps...</p>

  <button aria-label="Accept suggested workflow">
    Use Suggested Order
  </button>
</div>
```

---

## Usage Guidelines

### When to Use Each Type

1. **Regular Message**: AI responses without tool execution
2. **Tool Execution**: AI responses with tool results
3. **Image Result**: AI operations that generate images
4. **Clarification Loading**: Before showing clarification
5. **Clarification Minimal**: 2-3 steps, no concerns
6. **Clarification Warning**: Print/quality concerns
7. **Clarification Full**: Complex workflow with suggestion
8. **Processing**: During tool execution
9. **Error**: Operation failures

### Design Consistency Rules

1. **All messages**: Left-align (assistant) or right-align (user)
2. **All borders**: 2px for regular, 3px for clarification
3. **All shadows**: Offset right+down, neobrutalist style
4. **All animations**: 300ms ease-out
5. **All spacing**: 16px padding, 16px gaps between sections

---

This comprehensive guide ensures visual consistency across all message types in the AI chat panel!
