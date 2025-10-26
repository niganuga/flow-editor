# Accessibility & UX Fix Checklist
**Priority Issues for Flow Editor**

## Critical Issues (Fix Immediately)

### 1. ARIA Labels - Bottom Dock Tools
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/bottom-dock.tsx`
**Lines:** 42-95

```tsx
// CURRENT (Line 57-86)
<button
  onClick={() => onToolClick(tool.id)}
  className={/* ... */}
>
  <Icon className="w-4 h-4 md:w-5 md:h-5" />
</button>

// FIX TO:
<button
  onClick={() => onToolClick(tool.id)}
  aria-label={`${tool.label}${isActive ? ' - Active' : ''}`}
  aria-pressed={isActive}
  className={/* ... */}
>
  <Icon className="w-4 h-4 md:w-5 md:h-5" />
</button>
```

### 2. Panel Close Buttons
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/draggable-panel.tsx`
**Lines:** 204-209

```tsx
// CURRENT
<button onClick={onClose}>
  <X className="w-4 h-4" strokeWidth={3} />
</button>

// FIX TO:
<button
  onClick={onClose}
  aria-label={`Close ${title} panel`}
>
  <X className="w-4 h-4" strokeWidth={3} />
</button>
```

### 3. Canvas Controls ARIA Labels
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/canvas.tsx`
**Lines:** 182-260

```tsx
// Add aria-label to all icon-only buttons:
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7"
  onClick={handleZoomOut}
  disabled={zoom <= 25}
  aria-label="Zoom out"
>
  <ZoomOut className="h-4 w-4" />
</Button>
```

### 4. Focus Management in Draggable Panels
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/draggable-panel.tsx`
**Add focus trap:**

```bash
pnpm add focus-trap-react
```

```tsx
import FocusTrap from 'focus-trap-react'

// Wrap panel content with FocusTrap when isActive
{isActive ? (
  <FocusTrap>
    <div ref={panelRef} className={/* ... */}>
      {/* panel content */}
    </div>
  </FocusTrap>
) : (
  <div ref={panelRef} className={/* ... */}>
    {/* panel content */}
  </div>
)}
```

### 5. Live Regions for Status Updates
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/panels/ai-chat-panel.tsx`
**Lines:** 644-661

```tsx
// Add above processing indicator
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {isProcessing ? "Processing your request, please wait..." : ""}
</div>

// Add sr-only utility to globals.css:
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 6. Semantic HTML for Bottom Dock
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/bottom-dock.tsx`
**Lines:** 35-99

```tsx
// CURRENT
<div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50">
  <div className="rounded-xl p-1.5 md:p-2 bg-card">
    <div className="flex gap-1 md:gap-1.5">
      {tools.map(/* ... */)}
    </div>
  </div>
</div>

// FIX TO:
<nav
  className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50"
  aria-label="Tool palette"
>
  <div className="rounded-xl p-1.5 md:p-2 bg-card">
    <div className="flex gap-1 md:gap-1.5" role="toolbar">
      {tools.map(/* ... */)}
    </div>
  </div>
</nav>
```

### 7. Panel Dialog Role
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/draggable-panel.tsx`
**Line:** 178

```tsx
// CURRENT
<div
  ref={panelRef}
  className={`fixed border-[3px] /* ... */`}
  style={/* ... */}
>

// FIX TO:
<div
  ref={panelRef}
  role="dialog"
  aria-modal="false"
  aria-label={title}
  className={`fixed border-[3px] /* ... */`}
  style={/* ... */}
>
```

---

## High Priority Issues (Fix This Week)

### 8. Skip Navigation Link
**File:** `/Users/makko/Code/OneFlow/flow-editor/app/page.tsx`
**Add at top of component:**

```tsx
export default function PhotoEditorPage() {
  // ... existing code ...

  return (
    <div className="h-screen flex flex-col bg-background">
      <a
        href="#main-canvas"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-foreground focus:text-background"
      >
        Skip to main canvas
      </a>

      <TopBar />

      <main id="main-canvas" className="flex-1 grid-background overflow-hidden relative" />

      {/* ... rest of component ... */}
    </div>
  )
}
```

### 9. Mobile Touch Targets
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/bottom-dock.tsx`
**Line:** 62

```tsx
// CURRENT
className="rounded-lg w-9 h-9 md:w-10 md:h-10"

// FIX TO (44px minimum on mobile)
className="rounded-lg w-11 h-11 md:w-12 md:h-12"

// Also update icon sizes
<Icon className="w-5 h-5 md:w-6 md:h-6" />
```

### 10. Keyboard Shortcuts Modal
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/keyboard-shortcuts-modal.tsx` (NEW)

```tsx
"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-card border-[3px] border-foreground rounded-xl p-6 max-w-md"
        style={{ boxShadow: "6px 6px 0px 0px rgba(0, 0, 0, 1)" }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="shortcuts-title"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="shortcuts-title" className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close shortcuts dialog"
            className="p-2 hover:bg-muted rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <ShortcutRow keys={["Ctrl/Cmd", "Z"]} action="Undo" />
          <ShortcutRow keys={["Ctrl/Cmd", "Y"]} action="Redo" />
          <ShortcutRow keys={["Ctrl/Cmd", "Shift", "Z"]} action="Redo (Alt)" />
          <ShortcutRow keys={["?"]} action="Toggle this dialog" />
        </div>
      </div>
    </div>
  )
}

function ShortcutRow({ keys, action }: { keys: string[], action: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-foreground/10">
      <div className="flex gap-1">
        {keys.map(key => (
          <kbd
            key={key}
            className="px-2 py-1 bg-muted text-xs font-mono rounded border-2 border-foreground"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-sm">{action}</span>
    </div>
  )
}
```

**Then add to layout:**
```tsx
// app/layout.tsx
import { KeyboardShortcutsModal } from '@/components/keyboard-shortcuts-modal'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <KeyboardShortcuts />
        <KeyboardShortcutsModal />
        {children}
      </body>
    </html>
  )
}
```

---

## Medium Priority Issues (Fix Next Sprint)

### 11. Toast Notification System
```bash
npx shadcn@latest add toast
npx shadcn@latest add sonner
```

**File:** `/Users/makko/Code/OneFlow/flow-editor/app/layout.tsx`
```tsx
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
```

**Usage in panels:**
```tsx
import { toast } from "sonner"

// Replace addMessage calls with:
toast.success("Background removed successfully!")
toast.error("Failed to process image")
toast.loading("Processing image...")
```

### 12. Mobile Panel Full-Screen
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/draggable-panel.tsx`

```tsx
// Add useMediaQuery hook
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}

// In DraggablePanel component:
const isMobile = useMediaQuery('(max-width: 768px)')

// Conditionally disable dragging on mobile
const handleMouseDown = (e: React.MouseEvent) => {
  if (isMobile) return // Don't allow dragging on mobile
  // ... existing code
}
```

### 13. Focus Visible Enhancement
**File:** `/Users/makko/Code/OneFlow/flow-editor/app/globals.css`

```css
/* Add after @layer base */
@layer base {
  *:focus-visible {
    outline: 3px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  button:focus-visible {
    outline: 3px solid hsl(var(--ring));
    outline-offset: 2px;
  }
}
```

---

## Testing Checklist

### Automated Tests
```bash
# Install testing dependencies
pnpm add -D @axe-core/react eslint-plugin-jsx-a11y

# Add to .eslintrc.json:
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ]
}

# Run linter
pnpm lint
```

### Manual Tests
- [ ] Tab through entire app (logical order?)
- [ ] Use only keyboard (can access all features?)
- [ ] Turn on screen reader (VoiceOver on Mac: Cmd+F5)
- [ ] Test with 200% browser zoom
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test with keyboard only (no mouse)
- [ ] Test focus indicators visible on all elements

### Browser Extensions
Install these for quick accessibility testing:
- **axe DevTools** (Chrome/Firefox) - Free accessibility checker
- **WAVE** - Web accessibility evaluation tool
- **Lighthouse** (Chrome DevTools) - Audit tab

---

## Quick Wins (30 minutes each)

1. **Add lang attribute** ✓ (Already done in layout.tsx line 20)
2. **Add page title** ✓ (Already done in layout.tsx line 9)
3. **Add ARIA labels to all buttons** (30 min - see fixes above)
4. **Add skip link** (15 min - see fix #8)
5. **Increase touch targets** (15 min - see fix #9)
6. **Add sr-only class** (5 min - see fix #5)

---

## Resources

### Documentation
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN ARIA Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [WebAIM Keyboard Accessibility](https://webaim.org/techniques/keyboard/)

### Tools
- [Axe Browser Extension](https://www.deque.com/axe/browser-extensions/)
- [WAVE Extension](https://wave.webaim.org/extension/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Libraries
- [focus-trap-react](https://github.com/focus-trap/focus-trap-react)
- [react-aria](https://react-spectrum.adobe.com/react-aria/)
- [Radix UI](https://www.radix-ui.com/) (already in use via shadcn)

---

## Success Metrics

After implementing fixes, aim for:
- ✓ **Lighthouse Accessibility Score:** 95+
- ✓ **Axe DevTools:** 0 critical violations
- ✓ **WAVE:** 0 errors
- ✓ **Keyboard Navigation:** All features accessible
- ✓ **Screen Reader:** All content announced properly

---

**Last Updated:** October 20, 2025
**Priority:** CRITICAL - Fix before production release
