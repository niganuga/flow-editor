# AI Clarification Workflow - Visual Mockup

## Desktop View (420px wide chat panel)

```
┌────────────────────────────────────────────────────────────┐
│  ☆  AI Design Partner                               [X]    │
├────────────────────────────────────────────────────────────┤
│ ℹ Phase 8: AI Design Assistant                            │
│   Natural language image editing...                        │
│                                                            │
│ 🖼 Image loaded - Ready to edit!                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [User message bubble]                                     │
│  remove hot key buttons, trim orange spaces,               │
│  resize to 800px, rotate 90 degrees, then add              │
│  mockup on white tshirt                                    │
│  ───────────────────────────────────── 2:34 PM             │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ✨ Let me confirm what you want              [×]  │  │ <- ACCENT BORDER
│  ├─────────────────────────────────────────────────────┤  │    3px accent color
│  │                                                     │  │    4px shadow
│  │ ① Your Request                                     │  │
│  │    1. Remove orange hotkey buttons (color knockout)│  │
│  │    2. Trim extra orange spaces (auto crop)         │  │
│  │    3. Resize to 800px                              │  │
│  │    4. Rotate 90 degrees                            │  │
│  │    5. Generate white t-shirt mockup                │  │
│  │                                                     │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │ ⚠ Print Readiness Check                     │   │  │ <- YELLOW WARNING
│  │ │                                              │   │  │    2px border
│  │ │ Current:      1200x800px @ 72 DPI           │   │  │    2px shadow
│  │ │ Recommended:  3600x2400px @ 300 DPI         │   │  │
│  │ │                                              │   │  │
│  │ │ ⚠ Low resolution for print quality          │   │  │
│  │ │ ⚠ Consider upscaling before processing       │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  │                                                     │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │ 💡 Suggested Workflow                       │   │  │ <- GREEN SUGGESTION
│  │ │                                              │   │  │    2px border
│  │ │ Upscale to 300 DPI first, then proceed      │   │  │    2px shadow
│  │ │ (Better quality after background removal)   │   │  │
│  │ │                                              │   │  │
│  │ │ 1. Upscale to 300 DPI                       │   │  │
│  │ │ 2. Remove orange hotkey buttons             │   │  │
│  │ │ 3. Trim extra orange spaces                 │   │  │
│  │ │ 4. Rotate 90 degrees                        │   │  │
│  │ │ 5. Resize to 800px                          │   │  │
│  │ │ 6. Generate white t-shirt mockup            │   │  │
│  │ │                                              │   │  │
│  │ │ Why this is better:                         │   │  │
│  │ │ ✓ Better quality after background removal   │   │  │
│  │ │ ✓ Preserves detail in mockup generation     │   │  │
│  │ │ ✓ Meets print standards (300 DPI)           │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  │                                                     │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │                                                     │  │
│  │ ┌──────────────────┐ ┌──────────────────┐ ┌─────┐ │  │
│  │ │ ✓ Use Suggested  │ │ → Use Original   │ │ ✕   │ │  │
│  │ │    Order         │ │    Order         │ │     │ │  │ <- BUTTONS
│  │ └──────────────────┘ └──────────────────┘ └─────┘ │  │    3px borders
│  │           GREEN             BLACK        GRAY      │  │    3px shadows
│  │                                                     │  │
│  │ You can also type "yes", "use suggested", or       │  │
│  │ "cancel"                                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ [Remove background] [Auto-detect] [Trim orange]           │
│ [Rotate 90°] [Resize 800px] [Show palette]                │
│                                                            │
│ [📎] [What would you like to do?               ] [Send]   │
└────────────────────────────────────────────────────────────┘
```

---

## Mobile View (<640px)

```
┌─────────────────────────────────────┐
│  ☆ AI Design Partner         [X]   │
├─────────────────────────────────────┤
│ ℹ Phase 8                          │
│ 🖼 Image loaded                    │
├─────────────────────────────────────┤
│                                     │
│  [User]                             │
│  remove hot keys, trim,             │
│  resize 800px, rotate,              │
│  mockup white tshirt                │
│  ─────────────────── 2:34 PM        │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ ✨ Confirm              [×] │  │
│  ├──────────────────────────────┤  │
│  │ ① Your Request              │  │
│  │    1. Remove buttons        │  │
│  │    2. Trim spaces           │  │
│  │    3. Resize 800px          │  │
│  │    4. Rotate 90°            │  │
│  │    5. Mockup white tshirt   │  │
│  │                             │  │
│  │ ┌─────────────────────────┐ │  │
│  │ │ ⚠ Print Check          │ │  │
│  │ │ Current: 1200x800@72   │ │  │
│  │ │ Need: 300 DPI          │ │  │
│  │ └─────────────────────────┘ │  │
│  │                             │  │
│  │ ┌─────────────────────────┐ │  │
│  │ │ 💡 Suggested           │ │  │
│  │ │ Upscale first          │ │  │
│  │ │ 1. Upscale 300 DPI     │ │  │
│  │ │ 2. Remove buttons      │ │  │
│  │ │ 3. Trim spaces         │ │  │
│  │ │ 4. Rotate 90°          │ │  │
│  │ │ 5. Resize 800px        │ │  │
│  │ │ 6. Mockup tshirt       │ │  │
│  │ │                        │ │  │
│  │ │ ✓ Better quality       │ │  │
│  │ │ ✓ Print ready          │ │  │
│  │ └─────────────────────────┘ │  │
│  │                             │  │
│  ├──────────────────────────────┤  │
│  │ ┌─────────────────────────┐ │  │
│  │ │ ✓ Suggested            │ │  │ <- Stacked
│  │ └─────────────────────────┘ │  │    buttons
│  │ ┌─────────────────────────┐ │  │
│  │ │ → Original             │ │  │
│  │ └─────────────────────────┘ │  │
│  │ ┌─────────────────────────┐ │  │
│  │ │ ✕ Cancel               │ │  │
│  │ └─────────────────────────┘ │  │
│  │                             │  │
│  │ Type "yes" or "cancel"      │  │
│  └──────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│ [📎] [Message...    ] [Send]       │
└─────────────────────────────────────┘
```

---

## Color Palette (Neobrutalist)

### Base Colors
```css
--accent: hsl(280, 65%, 55%)        /* Primary accent (purple/pink) */
--foreground: hsl(0, 0%, 0%)        /* Black for borders/text */
--background: hsl(0, 0%, 100%)      /* White background */
--card: hsl(0, 0%, 98%)             /* Slight off-white */
```

### Semantic Colors
```css
--green-success: hsl(142, 71%, 45%)   /* Green-600 */
--green-bg: hsla(142, 71%, 45%, 0.1)  /* Green with 10% opacity */

--yellow-warning: hsl(45, 93%, 47%)   /* Yellow-500 */
--yellow-bg: hsla(45, 93%, 47%, 0.1)  /* Yellow with 10% opacity */

--accent-bg: hsla(280, 65%, 55%, 0.05) /* Accent with 5% opacity */
--accent-border: hsla(280, 65%, 55%, 0.3) /* Accent with 30% opacity */
```

---

## Component States

### Default State
```
┌──────────────────────────┐
│ ✨ Let me confirm   [×] │ <- accent border (3px)
└──────────────────────────┘    accent shadow (4px)
```

### Hover State (buttons)
```
[✓ Use Suggested Order]
   ↓ opacity: 0.9
   cursor: pointer
```

### Focus State (keyboard navigation)
```
[✓ Use Suggested Order] <- ring-2 ring-accent
   ↑ visible focus indicator
```

### Disabled State
```
[... Processing ...]
   opacity: 0.5
   cursor: not-allowed
```

---

## Interaction States

### 1. Loading/Analyzing
```
┌───────────────────────────────────┐
│ ⚡ Analyzing your request...     │ <- accent/50 border
│ Checking for better workflows    │    pulsing sparkle icon
└───────────────────────────────────┘
```

### 2. Clarification Shown
```
┌────────────────────────────────────┐
│ ✨ Let me confirm what you want   │ <- full clarification
│ [detailed content]                 │    with all sections
│ [buttons enabled]                  │
└────────────────────────────────────┘
```

### 3. User Confirmed
```
[Regular assistant message]
✓ Great choice! Executing suggested workflow...
[tool execution cards appear below]
```

### 4. User Cancelled
```
[Regular assistant message]
No problem! What would you like to do?
[back to normal chat state]
```

---

## Spacing & Typography

### Container Spacing
- Outer padding: `p-4` (16px)
- Section gap: `space-y-4` (16px)
- Button gap: `gap-2` (8px)

### Typography
```css
/* Header */
.clarification-header {
  font-size: 0.875rem;     /* 14px */
  font-weight: 700;         /* bold */
  line-height: 1.25rem;    /* 20px */
}

/* Section title */
.section-title {
  font-size: 0.875rem;     /* 14px */
  font-weight: 700;         /* bold */
}

/* Body text */
.body-text {
  font-size: 0.875rem;     /* 14px */
  line-height: 1.5rem;     /* 24px */
}

/* Small text */
.small-text {
  font-size: 0.75rem;      /* 12px */
  line-height: 1rem;       /* 16px */
}

/* Button text */
.button-text {
  font-size: 0.875rem;     /* 14px */
  font-weight: 700;         /* bold */
}
```

### Borders & Shadows
```css
/* Main container */
.clarification-container {
  border: 3px solid hsl(var(--accent));
  box-shadow: 4px 4px 0px 0px hsl(var(--accent));
  border-radius: 0.75rem; /* 12px */
}

/* Warning box */
.warning-box {
  border: 2px solid hsl(45, 93%, 47%, 0.3);
  box-shadow: 2px 2px 0px 0px hsl(var(--foreground) / 0.1);
  border-radius: 0.5rem; /* 8px */
}

/* Suggestion box */
.suggestion-box {
  border: 2px solid hsl(142, 71%, 45%, 0.3);
  box-shadow: 2px 2px 0px 0px hsl(var(--foreground) / 0.1);
  border-radius: 0.5rem; /* 8px */
}

/* Buttons */
.button-primary {
  border: 3px solid rgba(0, 0, 0, 0.8);
  box-shadow: 3px 3px 0px 0px rgba(0, 0, 0, 0.8);
  border-radius: 0.5rem; /* 8px */
}
```

---

## Animation Timing

### Slide In (clarification appears)
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

.animate-in {
  animation: slide-in-from-bottom 300ms ease-out;
}
```

### Pulse (analyzing indicator)
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Button Hover
```css
.button {
  transition: opacity 200ms ease-in-out;
}

.button:hover {
  opacity: 0.9;
}
```

---

## Accessibility Annotations

### ARIA Landmarks
```html
<div
  role="dialog"
  aria-labelledby="clarification-title"
  aria-describedby="clarification-desc"
  aria-modal="false"
>
  <h3 id="clarification-title">Let me confirm what you want</h3>
  <p id="clarification-desc">Review the steps and choose how to proceed</p>
</div>
```

### Keyboard Navigation
```
Tab Order:
1. [×] Close button
2. [Use Suggested Order] (if available)
3. [Use Original Order]
4. [Cancel]

Shortcuts:
- Enter: Accept suggested (or original if no suggestion)
- Escape: Cancel
- Tab/Shift+Tab: Navigate buttons
```

### Screen Reader Announcements
```
When clarification appears:
"Confirmation required. Review 5 steps and print readiness warnings.
Use suggested workflow or use original request."

When user confirms:
"Executing suggested workflow with 6 steps."

When user cancels:
"Operation cancelled."
```

---

## Responsive Breakpoints

### Tailwind Breakpoints Used

**Mobile First** (default < 640px):
- Buttons stack vertically (`flex-col`)
- Abbreviated button text
- Smaller padding

**Small (≥640px)**:
- Buttons horizontal (`sm:flex-row`)
- Full button text (`sm:inline`)
- Standard padding

---

## Quick CSS Reference

### Complete Clarification Container
```tsx
<div
  className="rounded-xl border-[3px] border-accent bg-accent/5 overflow-hidden"
  style={{
    boxShadow: "4px 4px 0px 0px hsl(var(--accent))",
  }}
>
  {/* Header */}
  <div className="bg-accent/10 border-b-[3px] border-accent px-4 py-3">
    ...
  </div>

  {/* Content */}
  <div className="p-4 space-y-4">
    ...
  </div>

  {/* Footer with buttons */}
  <div className="border-t-[3px] border-accent/20 p-4">
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Green suggestion button */}
      <button
        className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg border-[3px] border-foreground/80 transition-colors"
        style={{
          boxShadow: "3px 3px 0px 0px rgba(0, 0, 0, 0.8)",
        }}
      >
        Use Suggested Order
      </button>

      {/* Black original button */}
      <button
        className="flex-1 px-4 py-3 bg-foreground hover:opacity-90 text-background font-bold text-sm rounded-lg border-[3px] border-foreground transition-opacity"
        style={{
          boxShadow: "3px 3px 0px 0px rgba(0, 0, 0, 0.8)",
        }}
      >
        Use Original Order
      </button>

      {/* Gray cancel button */}
      <button
        className="sm:w-auto px-4 py-3 bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold text-sm rounded-lg border-[3px] border-foreground/20 hover:border-foreground/40 transition-colors"
        style={{
          boxShadow: "3px 3px 0px 0px hsl(var(--foreground) / 0.1)",
        }}
      >
        Cancel
      </button>
    </div>
  </div>
</div>
```

This matches your existing neobrutalist design perfectly!
