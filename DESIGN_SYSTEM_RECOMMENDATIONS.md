# Design System Recommendations
**Flow Editor - Design Tokens & Component Standards**

## Overview
Establish consistent design tokens and component patterns for the neo-brutalist Flow Editor interface.

---

## 1. Design Tokens (CSS Variables)

### File: `/Users/makko/Code/OneFlow/flow-editor/app/globals.css`

Add these tokens after line 41:

```css
:root {
  /* Existing colors... */

  /* Spacing Scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;

  /* Border Widths */
  --border-thin: 1px;
  --border-standard: 2px;
  --border-heavy: 3px;
  --border-ultra: 4px;

  /* Shadow Brutalist */
  --shadow-xs: 1px 1px 0px 0px rgba(0, 0, 0, 1);
  --shadow-sm: 2px 2px 0px 0px rgba(0, 0, 0, 1);
  --shadow-md: 3px 3px 0px 0px rgba(0, 0, 0, 1);
  --shadow-lg: 6px 6px 0px 0px rgba(0, 0, 0, 1);
  --shadow-xl: 8px 8px 0px 0px rgba(0, 0, 0, 1);

  /* Shadow Soft (for active states) */
  --shadow-soft: 2px 2px 0px 0px rgba(0, 0, 0, 0.2);

  /* Focus Ring */
  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;

  /* Animation Duration */
  --duration-instant: 50ms;
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;

  /* Animation Easing */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);

  /* Z-Index Scale */
  --z-base: 0;
  --z-canvas: 30;
  --z-panel: 40;
  --z-panel-active: 45;
  --z-dock: 50;
  --z-topbar: 50;
  --z-modal: 60;
  --z-toast: 70;
  --z-tooltip: 80;
  --z-skip-link: 100;

  /* Panel Defaults */
  --panel-min-width: 280px;
  --panel-min-height: 350px;
  --panel-padding: var(--space-md);
  --panel-border-radius: 12px;

  /* Touch Targets */
  --touch-target-min: 44px;
  --touch-target-comfortable: 48px;
}
```

---

## 2. Utility Classes

### Add to `/Users/makko/Code/OneFlow/flow-editor/app/globals.css`

```css
@layer utilities {
  /* Brutalist Button Base */
  .brutalist-button {
    @apply border-[var(--border-standard)] border-foreground rounded-lg
           font-bold transition-all duration-[var(--duration-fast)]
           px-4 py-2;
    box-shadow: var(--shadow-sm);
  }

  .brutalist-button:hover {
    @apply translate-x-[1px] translate-y-[1px];
    box-shadow: var(--shadow-xs);
  }

  .brutalist-button:active {
    @apply translate-x-[2px] translate-y-[2px];
    box-shadow: none;
  }

  .brutalist-button-active {
    @apply bg-accent text-accent-foreground;
  }

  /* Brutalist Card */
  .brutalist-card {
    @apply border-[var(--border-heavy)] border-foreground rounded-xl bg-card;
    box-shadow: var(--shadow-lg);
  }

  /* Screen Reader Only */
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

  .sr-only:focus {
    position: static;
    width: auto;
    height: auto;
    padding: inherit;
    margin: inherit;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }

  /* Focus Visible Enhancement */
  .focus-ring {
    @apply outline-none focus-visible:ring-[var(--focus-ring-width)]
           focus-visible:ring-ring focus-visible:ring-offset-[var(--focus-ring-offset)];
  }

  /* Touch Targets */
  .touch-target {
    min-width: var(--touch-target-min);
    min-height: var(--touch-target-min);
  }

  @media (pointer: coarse) {
    .touch-target-adaptive {
      min-width: var(--touch-target-comfortable);
      min-height: var(--touch-target-comfortable);
    }
  }

  /* Panel Base Styles */
  .panel-base {
    @apply brutalist-card;
    min-width: var(--panel-min-width);
    min-height: var(--panel-min-height);
  }

  .panel-active {
    @apply ring-[var(--border-standard)] ring-accent;
  }

  /* Animation Utilities */
  .animate-press {
    @apply active:scale-95 transition-transform duration-[var(--duration-fast)];
  }

  .animate-slide-in {
    animation: slideIn var(--duration-normal) var(--ease-standard);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

---

## 3. Component Patterns

### Button Component Enhancement
**File:** `/Users/makko/Code/OneFlow/flow-editor/components/ui/button.tsx`

```tsx
// Add brutalist variant
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        brutalist: 'brutalist-button', // NEW
        // ... existing variants
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3',
        lg: 'h-11 px-8', // Increased for better touch targets
        icon: 'size-11', // Changed from size-9 for mobile
        'icon-sm': 'size-9',
      },
    },
  }
)
```

### Icon Button Pattern
**Create:** `/Users/makko/Code/OneFlow/flow-editor/components/ui/icon-button.tsx`

```tsx
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg border-[var(--border-standard)] border-foreground transition-all focus-ring touch-target-adaptive disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-card hover:bg-muted active:bg-muted/80",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        ghost: "border-transparent hover:bg-muted",
      },
      size: {
        sm: "size-9",
        md: "size-11",
        lg: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: React.ComponentType<{ className?: string }>
  label: string // Required for accessibility
  asChild?: boolean
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, icon: Icon, label, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        ref={ref}
        className={cn(iconButtonVariants({ variant, size, className }))}
        aria-label={label}
        title={label}
        style={{ boxShadow: "var(--shadow-sm)" }}
        {...props}
      >
        <Icon className="w-5 h-5" />
      </Comp>
    )
  }
)

IconButton.displayName = "IconButton"

export { IconButton, iconButtonVariants }
```

### Panel Header Component
**Create:** `/Users/makko/Code/OneFlow/flow-editor/components/ui/panel-header.tsx`

```tsx
"use client"

import * as React from "react"
import { X, Minimize2 } from "lucide-react"
import { IconButton } from "./icon-button"

interface PanelHeaderProps {
  title: string
  icon?: React.ReactNode
  onClose: () => void
  onMinimize?: () => void
  isMinimized?: boolean
}

export function PanelHeader({
  title,
  icon,
  onClose,
  onMinimize,
  isMinimized = false,
}: PanelHeaderProps) {
  return (
    <div
      className="bg-card border-b-[var(--border-heavy)] border-foreground px-3 py-2 flex items-center justify-between select-none"
      role="banner"
    >
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-bold text-sm md:text-base truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-1">
        {onMinimize && (
          <IconButton
            variant="ghost"
            size="sm"
            icon={Minimize2}
            label={isMinimized ? `Expand ${title}` : `Minimize ${title}`}
            onClick={onMinimize}
          />
        )}
        <IconButton
          variant="ghost"
          size="sm"
          icon={X}
          label={`Close ${title} panel`}
          onClick={onClose}
          className="hover:bg-destructive hover:text-destructive-foreground"
        />
      </div>
    </div>
  )
}
```

---

## 4. Responsive Breakpoints

### Add to design tokens:

```css
:root {
  /* Breakpoints (matches Tailwind defaults) */
  --screen-sm: 640px;
  --screen-md: 768px;
  --screen-lg: 1024px;
  --screen-xl: 1280px;
  --screen-2xl: 1536px;
}
```

### Component Responsive Patterns

```tsx
// Use custom hook for consistent media queries
// File: /lib/hooks/use-media-query.ts

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
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

// Predefined breakpoints
export const useIsMobile = () => useMediaQuery('(max-width: 768px)')
export const useIsTablet = () => useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)')
```

---

## 5. Color System Enhancements

### Semantic Color Tokens

```css
:root {
  /* Status Colors */
  --color-success: #22c55e;
  --color-success-foreground: #ffffff;
  --color-warning: #f59e0b;
  --color-warning-foreground: #000000;
  --color-error: #ef4444;
  --color-error-foreground: #ffffff;
  --color-info: #3b82f6;
  --color-info-foreground: #ffffff;

  /* Transparency Levels */
  --opacity-disabled: 0.5;
  --opacity-hover: 0.9;
  --opacity-pressed: 0.8;

  /* Overlay */
  --overlay-color: rgba(0, 0, 0, 0.5);
}
```

### Status Badge Component
**Create:** `/Users/makko/Code/OneFlow/flow-editor/components/ui/status-badge.tsx`

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border-[var(--border-standard)] border-foreground",
  {
    variants: {
      variant: {
        success: "bg-[var(--color-success)] text-[var(--color-success-foreground)]",
        warning: "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]",
        error: "bg-[var(--color-error)] text-[var(--color-error-foreground)]",
        info: "bg-[var(--color-info)] text-[var(--color-info-foreground)]",
        default: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ComponentType<{ className?: string }>
}

export function StatusBadge({ className, variant, icon: Icon, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      style={{ boxShadow: "var(--shadow-xs)" }}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}
```

---

## 6. Typography Scale

### Add to globals.css

```css
@layer base {
  /* Typography Scale */
  .text-display {
    font-size: 2.5rem;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .text-heading-1 {
    font-size: 2rem;
    line-height: 1.25;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .text-heading-2 {
    font-size: 1.5rem;
    line-height: 1.3;
    font-weight: 700;
  }

  .text-heading-3 {
    font-size: 1.25rem;
    line-height: 1.35;
    font-weight: 600;
  }

  .text-body {
    font-size: 1rem;
    line-height: 1.5;
    font-weight: 400;
  }

  .text-body-sm {
    font-size: 0.875rem;
    line-height: 1.5;
    font-weight: 400;
  }

  .text-caption {
    font-size: 0.75rem;
    line-height: 1.4;
    font-weight: 500;
  }

  .text-mono {
    font-family: var(--font-geist-mono), monospace;
  }
}
```

---

## 7. Spacing System

### Consistent Component Spacing

```tsx
// Example Panel Layout Pattern
export function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header - no padding (handled by PanelHeader) */}
      <PanelHeader {...headerProps} />

      {/* Content - standard padding */}
      <div className="flex-1 overflow-y-auto p-[var(--panel-padding)] space-y-[var(--space-md)]">
        {children}
      </div>

      {/* Footer/Actions - standard padding with top border */}
      <div className="border-t-[var(--border-standard)] border-foreground p-[var(--panel-padding)] space-y-[var(--space-sm)]">
        {/* Action buttons */}
      </div>
    </div>
  )
}
```

---

## 8. Animation Patterns

### Add to globals.css

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInFromBottom {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Utility Classes */
.animate-fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-standard);
}

.animate-slide-in-bottom {
  animation: slideInFromBottom var(--duration-normal) var(--ease-standard);
}

.animate-slide-in-right {
  animation: slideInFromRight var(--duration-normal) var(--ease-standard);
}

.animate-bounce-in {
  animation: bounceIn var(--duration-slow) var(--ease-bounce);
}
```

---

## 9. Implementation Priority

### Phase 1: Foundation (Week 1)
1. Add all design tokens to globals.css
2. Create utility classes (brutalist-button, sr-only, focus-ring)
3. Update existing components to use tokens

### Phase 2: Components (Week 2)
4. Create IconButton component
5. Create PanelHeader component
6. Create StatusBadge component
7. Refactor existing panels to use new components

### Phase 3: Polish (Week 3)
8. Implement consistent animations
9. Add responsive utilities
10. Create design system documentation

---

## 10. Design System Checklist

- [ ] All CSS variables defined in globals.css
- [ ] Utility classes documented and tested
- [ ] IconButton component created
- [ ] PanelHeader component created
- [ ] StatusBadge component created
- [ ] All buttons use consistent focus states
- [ ] All interactive elements meet 44px touch target
- [ ] Animation timing consistent across app
- [ ] Typography scale applied consistently
- [ ] Spacing system used throughout
- [ ] Components exported from index files
- [ ] Storybook/documentation created (optional)

---

## 11. Usage Examples

### Before (Inconsistent)
```tsx
// Old button pattern
<button
  onClick={handleClick}
  className="px-3 py-1.5 rounded-lg border-[2px] border-foreground"
  style={{ boxShadow: "2px 2px 0px 0px rgba(0, 0, 0, 1)" }}
>
  <Icon className="w-3 h-3" />
</button>
```

### After (Consistent)
```tsx
// New pattern with IconButton
<IconButton
  variant="default"
  size="md"
  icon={Icon}
  label="Descriptive action"
  onClick={handleClick}
/>
```

### Before (Inline styles)
```tsx
<div style={{ boxShadow: "6px 6px 0px 0px rgba(0, 0, 0, 1)" }}>
```

### After (Design tokens)
```tsx
<div className="brutalist-card">
```

---

## Resources

- **Design Tokens:** `/Users/makko/Code/OneFlow/flow-editor/app/globals.css`
- **Component Library:** `/Users/makko/Code/OneFlow/flow-editor/components/ui/`
- **Hooks:** `/Users/makko/Code/OneFlow/flow-editor/lib/hooks/`

---

**Version:** 1.0.0
**Last Updated:** October 20, 2025
**Status:** Ready for implementation
