# React Performance Optimization - Quick Implementation Guide
**Flow Editor - Practical Code Examples**

---

## Table of Contents
1. [React.memo - Component Memoization](#1-reactmemo---component-memoization)
2. [useCallback - Event Handler Optimization](#2-usecallback---event-handler-optimization)
3. [useMemo - Computed Value Caching](#3-usememo---computed-value-caching)
4. [Zustand Selector Optimization](#4-zustand-selector-optimization)
5. [Code Splitting with React.lazy](#5-code-splitting-with-reactlazy)
6. [Memory Leak Fixes](#6-memory-leak-fixes)
7. [React Concurrent Features](#7-react-concurrent-features)

---

## 1. React.memo - Component Memoization

### Pattern: Wrap all panel components with React.memo

**File: `/components/canvas.tsx`**

```tsx
import { memo } from 'react'

// BEFORE
export function Canvas({ onClose, zIndex, isActive, onFocus }: CanvasProps) {
  // Component body
}

// AFTER
export const Canvas = memo(function Canvas({ onClose, zIndex, isActive, onFocus }: CanvasProps) {
  // Component body
})

// OR with custom comparison (for complex props)
export const Canvas = memo(
  function Canvas({ onClose, zIndex, isActive, onFocus }: CanvasProps) {
    // Component body
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    // Return false if props changed (allow re-render)
    return (
      prevProps.zIndex === nextProps.zIndex &&
      prevProps.isActive === nextProps.isActive
    )
  }
)
```

**Apply to all these files:**
- `/components/canvas.tsx`
- `/components/bottom-dock.tsx`
- `/components/top-bar.tsx`
- `/components/draggable-panel.tsx`
- `/components/panels/ai-chat-panel.tsx`
- `/components/panels/upscaler-panel.tsx`
- `/components/panels/bg-remover-panel.tsx`
- `/components/panels/file-validator-panel.tsx`
- `/components/panels/cropper-panel.tsx`
- All other panel components

---

## 2. useCallback - Event Handler Optimization

### Pattern: Wrap all event handlers passed as props

**File: `/app/page.tsx`**

```tsx
import { useCallback } from 'react'

export default function PhotoEditorPage() {
  // BEFORE - Functions recreated every render
  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool)
    // ...
  }

  const handleClosePanel = (tool: Tool) => {
    // ...
  }

  // AFTER - Functions cached between renders
  const handleToolClick = useCallback((tool: Tool) => {
    setActiveTool(tool)
    setOpenPanels((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(tool)) {
        newSet.delete(tool)
      } else {
        newSet.add(tool)
        setFocusedPanel(tool)
      }
      return newSet
    })
  }, []) // Empty deps - only created once

  const handlePanelFocus = useCallback((tool: Tool) => {
    setFocusedPanel(tool)
    setActiveTool(tool)
  }, [])

  const handleClosePanel = useCallback((tool: Tool) => {
    // Implementation...
  }, [clearImage]) // Include external dependencies

  // For inline arrow functions, create separate callbacks
  const handleCloseValidator = useCallback(() => {
    handleClosePanel("validator")
  }, [handleClosePanel])

  const handleFocusValidator = useCallback(() => {
    handlePanelFocus("validator")
  }, [handlePanelFocus])

  return (
    <>
      {openPanels.has("validator") && (
        <FileValidatorPanel
          onClose={handleCloseValidator}  // ✅ Stable reference
          onFocus={handleFocusValidator}  // ✅ Stable reference
        />
      )}
    </>
  )
}
```

**File: `/components/canvas.tsx`**

```tsx
export const Canvas = memo(function Canvas({ onClose, zIndex, isActive, onFocus }: CanvasProps) {
  // BEFORE
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 400))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25))
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // ...
  }

  // AFTER
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 400))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 100) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing'
      }
    }
  }, [zoom, pan.x, pan.y]) // Include dependencies

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && zoom > 100) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }, [isPanning, zoom, panStart.x, panStart.y])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    if (containerRef.current) {
      containerRef.current.style.cursor = zoom > 100 ? 'grab' : 'default'
    }
  }, [zoom])
})
```

---

## 3. useMemo - Computed Value Caching

### Pattern: Cache expensive computations and object/array creations

**File: `/components/canvas.tsx`**

```tsx
import { useMemo } from 'react'

export const Canvas = memo(function Canvas({ ... }) {
  // BEFORE - Function called every render
  const getBackgroundStyle = () => {
    switch (background) {
      case "black":
        return { backgroundColor: "#000000" }
      case "white":
        return { backgroundColor: "#FFFFFF" }
      case "transparent":
      default:
        return {
          backgroundImage: "repeating-conic-gradient(...)",
          backgroundPosition: "0 0, 10px 10px",
          backgroundSize: "20px 20px"
        }
    }
  }

  // AFTER - Cached and only recomputed when background changes
  const backgroundStyle = useMemo(() => {
    switch (background) {
      case "black":
        return { backgroundColor: "#000000" }
      case "white":
        return { backgroundColor: "#FFFFFF" }
      case "transparent":
      default:
        return {
          backgroundImage: "repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%)",
          backgroundPosition: "0 0, 10px 10px",
          backgroundSize: "20px 20px"
        }
    }
  }, [background])

  // Cache image transform styles
  const imageStyle = useMemo(() => ({
    width: `${zoom}%`,
    height: `${zoom}%`,
    maxWidth: "none",
    maxHeight: "none",
    transform: `translate(${pan.x}px, ${pan.y}px)`,
    transition: isPanning ? 'none' : 'transform 0.1s ease-out'
  }), [zoom, pan.x, pan.y, isPanning])

  return (
    <div style={backgroundStyle}>
      <img style={imageStyle} />
    </div>
  )
})
```

**File: `/components/bottom-dock.tsx`**

```tsx
// BEFORE - Array recreated every render
const tools = [
  { id: "validator" as Tool, icon: FileCheck, label: "File Validator" },
  { id: "upscaler" as Tool, icon: ArrowUpCircle, label: "Upscaler" },
  // ... 8 items
]

// AFTER - Move outside component (best option)
const TOOLS = [
  { id: "validator" as Tool, icon: FileCheck, label: "File Validator" },
  { id: "upscaler" as Tool, icon: ArrowUpCircle, label: "Upscaler" },
  // ... 8 items
] as const

export function BottomDock({ activeTool, onToolClick }: BottomDockProps) {
  return (
    <div>
      {TOOLS.map((tool) => (
        <button key={tool.id} onClick={() => onToolClick(tool.id)}>
          {/* ... */}
        </button>
      ))}
    </div>
  )
}
```

**File: `/components/panels/ai-chat-panel.tsx`**

```tsx
// BEFORE - Array recreated every render
const suggestedPrompts = [
  'Remove the background',
  'Auto-detect and trim',
  // ... 6 prompts
]

// AFTER - Move outside component
const SUGGESTED_PROMPTS = [
  'Remove the background',
  'Auto-detect and trim',
  'Trim orange spaces',
  'Rotate 90 degrees',
  'Resize to 800px',
  'Show color palette',
] as const

// OR if it needs to be dynamic, use useMemo
const suggestedPrompts = useMemo(() => {
  return imageUrl
    ? ['Remove the background', 'Auto-detect and trim']
    : ['Upload an image first']
}, [imageUrl])
```

---

## 4. Zustand Selector Optimization

### Pattern: Subscribe only to needed state slices

**File: `/components/top-bar.tsx`**

```tsx
// BEFORE - Subscribes to entire store
const { imageUrl } = useImageStore()

// AFTER - Selective subscription
const imageUrl = useImageStore(state => state.imageUrl)

// For multiple values, use shallow comparison
import { shallow } from 'zustand/shallow'

const { imageUrl, imageName } = useImageStore(
  state => ({ 
    imageUrl: state.imageUrl, 
    imageName: state.imageName 
  }),
  shallow
)
```

**File: `/components/canvas.tsx`**

```tsx
// BEFORE
const { imageUrl, imageName, setImage } = useImageStore()

// AFTER - Option 1: Separate selectors
const imageUrl = useImageStore(state => state.imageUrl)
const imageName = useImageStore(state => state.imageName)
const setImage = useImageStore(state => state.setImage)

// AFTER - Option 2: Shallow comparison
const { imageUrl, imageName, setImage } = useImageStore(
  state => ({ 
    imageUrl: state.imageUrl,
    imageName: state.imageName,
    setImage: state.setImage
  }),
  shallow
)
```

**File: `/components/keyboard-shortcuts.tsx`**

```tsx
// BEFORE - Re-subscribes when functions change (they shouldn't, but safer)
const { undo, redo, canUndo, canRedo } = useImageStore()

useEffect(() => {
  // Event listener setup
}, [undo, redo, canUndo, canRedo])

// AFTER - Use getState() for stable function references
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    const { undo, redo, canUndo, canRedo } = useImageStore.getState()
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      if (canUndo()) undo()
    }
    // ...
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, []) // Empty deps - only set up once
```

---

## 5. Code Splitting with React.lazy

### Pattern: Lazy load panel components

**File: `/app/page.tsx`**

```tsx
import { lazy, Suspense } from "react"

// BEFORE - All panels loaded immediately
import { FileValidatorPanel } from "@/components/panels/file-validator-panel"
import { UpscalerPanel } from "@/components/panels/upscaler-panel"
import { BgRemoverPanel } from "@/components/panels/bg-remover-panel"
// ... 5 more imports

// AFTER - Lazy load panels
const FileValidatorPanel = lazy(() => import("@/components/panels/file-validator-panel"))
const UpscalerPanel = lazy(() => import("@/components/panels/upscaler-panel"))
const BgRemoverPanel = lazy(() => import("@/components/panels/bg-remover-panel"))
const ColorKnockoutPanel = lazy(() => import("@/components/panels/color-knockout-panel"))
const RecolorPanel = lazy(() => import("@/components/panels/recolor-panel"))
const TextureCutPanel = lazy(() => import("@/components/panels/texture-cut-panel"))
const AIChatPanel = lazy(() => import("@/components/panels/ai-chat-panel"))

export default function PhotoEditorPage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 grid-background overflow-hidden relative" />

      {/* Always render Canvas (not lazy) */}
      {openPanels.has("canvas") && (
        <Canvas {...canvasProps} />
      )}

      {/* Wrap lazy panels in Suspense */}
      <Suspense fallback={<PanelSkeleton />}>
        {openPanels.has("validator") && (
          <FileValidatorPanel {...validatorProps} />
        )}
        {openPanels.has("upscaler") && (
          <UpscalerPanel {...upscalerProps} />
        )}
        {/* ... other panels */}
      </Suspense>

      <BottomDock activeTool={activeTool} onToolClick={handleToolClick} />
    </div>
  )
}

// Optional: Loading skeleton
function PanelSkeleton() {
  return (
    <div className="fixed left-20 top-20 w-96 h-96 bg-card border-2 border-foreground/20 rounded-xl animate-pulse">
      <div className="p-4">
        <div className="h-6 bg-foreground/10 rounded mb-4" />
        <div className="h-32 bg-foreground/10 rounded" />
      </div>
    </div>
  )
}
```

**Important:** Each panel file needs default export:

```tsx
// File: /components/panels/upscaler-panel.tsx

// Add default export for lazy loading
export default UpscalerPanel

// Keep named export for backwards compatibility
export { UpscalerPanel }
```

---

## 6. Memory Leak Fixes

### Pattern: Revoke blob URLs when no longer needed

**File: `/lib/image-store.ts`**

```tsx
export const useImageStore = create<ImageState>((set, get) => ({
  // BEFORE - Blob URLs never freed
  setImage: (url, file, name) => {
    set({
      imageUrl: url,
      imageFile: file,
      imageName: name,
    })
  },

  // AFTER - Revoke old blob URLs
  setImage: (url, file, name) => {
    const state = get()
    
    // Revoke old blob URL to prevent memory leaks
    if (state.imageUrl && state.imageUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(state.imageUrl)
      } catch (error) {
        console.warn('Failed to revoke blob URL:', error)
      }
    }

    // Also revoke blob URLs in history if needed
    const newEntry = {
      imageUrl: url,
      imageFile: file,
      fileName: name,
      description: name || 'State change',
      timestamp: Date.now(),
    }

    if (state.history.length === 0) {
      set({
        imageUrl: url,
        imageFile: file,
        imageName: name,
        history: [newEntry],
        historyIndex: 0,
      })
    } else {
      // When adding new state, revoke future states that will be pruned
      const futureStates = state.history.slice(state.historyIndex + 1)
      futureStates.forEach(entry => {
        if (entry.imageUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(entry.imageUrl)
          } catch (error) {
            console.warn('Failed to revoke future blob URL:', error)
          }
        }
      })

      const newHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        newEntry
      ]

      const trimmedHistory = newHistory.slice(-state.maxHistorySize)

      set({
        imageUrl: url,
        imageFile: file,
        imageName: name,
        history: trimmedHistory,
        historyIndex: trimmedHistory.length - 1,
      })
    }
  },

  // AFTER - Revoke all blob URLs on clear
  clearImage: () => {
    const state = get()
    
    // Revoke current image
    if (state.imageUrl && state.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.imageUrl)
    }
    
    // Revoke all history blob URLs
    state.history.forEach(entry => {
      if (entry.imageUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(entry.imageUrl)
        } catch (error) {
          console.warn('Failed to revoke history blob URL:', error)
        }
      }
    })

    set({
      imageUrl: null,
      imageFile: null,
      imageName: null,
      history: [],
      historyIndex: -1,
    })
  },
}))
```

---

## 7. React Concurrent Features

### Pattern: Use useTransition for non-urgent updates

**File: `/components/panels/ai-chat-panel.tsx`**

```tsx
import { useTransition, useDeferredValue } from 'react'

export function AIChatPanel({ ... }) {
  const [isPending, startTransition] = useTransition()
  const [inputValue, setInputValue] = useState("")
  const deferredInputValue = useDeferredValue(inputValue)

  const handleSendMessage = () => {
    const userMessage = inputValue.trim()
    setInputValue("") // Immediate - feels instant

    // Wrap heavy state update in transition
    startTransition(() => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      }])
    })

    // This won't block the input clear above
    setIsProcessing(true)
    // ... API call
  }

  return (
    <div>
      {/* Show pending state */}
      {isPending && <div>Adding message...</div>}
      
      {/* Use deferred value for search/filter */}
      <SearchResults query={deferredInputValue} />
    </div>
  )
}
```

### Pattern: Use Suspense for async operations

```tsx
import { Suspense } from 'react'

export default function PhotoEditorPage() {
  return (
    <Suspense fallback={<PanelLoadingSkeleton />}>
      {openPanels.has("ai-chat") && (
        <AIChatPanel {...aiChatProps} />
      )}
    </Suspense>
  )
}
```

---

## Testing Performance Improvements

### 1. React DevTools Profiler

```tsx
import { Profiler } from 'react'

function onRenderCallback(
  id: string,
  phase: "mount" | "update",
  actualDuration: number,
) {
  console.log(`${id} ${phase} took ${actualDuration}ms`)
}

export default function PhotoEditorPage() {
  return (
    <Profiler id="PhotoEditor" onRender={onRenderCallback}>
      {/* Your components */}
    </Profiler>
  )
}
```

### 2. Performance Monitoring Hook

```tsx
// hooks/use-performance-monitor.ts
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      if (duration > 16) { // More than one frame
        console.warn(`${componentName} render took ${duration}ms`)
      }
    }
  })
}

// Usage
function MyComponent() {
  usePerformanceMonitor('MyComponent')
  // ...
}
```

---

## Checklist for Each Component

- [ ] Wrapped with React.memo?
- [ ] Event handlers use useCallback?
- [ ] Computed values use useMemo?
- [ ] Zustand selectors are selective?
- [ ] Static arrays/objects moved outside component?
- [ ] Blob URLs properly revoked?
- [ ] No memory leaks in useEffect cleanup?
- [ ] Large components lazy loaded?

---

**Quick Reference:**
- **React.memo**: Prevent re-render when props unchanged
- **useCallback**: Stable function reference between renders
- **useMemo**: Cache expensive computations
- **Zustand selectors**: Subscribe only to needed state
- **React.lazy**: Load components on-demand
- **URL.revokeObjectURL**: Free blob URL memory

