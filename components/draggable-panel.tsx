"use client"

import type React from "react"
import { type ReactNode, useRef, useState, useEffect } from "react"
import { Grid3x3, X } from "lucide-react"

interface DraggablePanelProps {
  title: string
  onClose: () => void
  children: ReactNode
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  icon?: ReactNode
  zIndex?: number
  isActive?: boolean
  onFocus?: () => void
  className?: string
  shadowStyle?: string
  forcePosition?: { x: number; y: number } // For auto-arrange
  arrangeKey?: number // Trigger position update
}

export function DraggablePanel({
  title,
  onClose,
  children,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 500 },
  icon,
  zIndex = 40,
  isActive = false,
  onFocus,
  className = '',
  shadowStyle = "6px 6px 0px 0px rgba(0, 0, 0, 1)",
  forcePosition,
  arrangeKey = 0,
}: DraggablePanelProps) {
  // Constrain initial position to viewport
  const getConstrainedPosition = (pos: { x: number; y: number }, size: { width: number; height: number }) => {
    if (typeof window === 'undefined') {
      return pos // Return default position during SSR
    }

    const topBarHeight = 60 // Account for top bar (52px + padding)

    // On mobile, center the panel
    if (window.innerWidth < 768) {
      return {
        x: Math.max(10, (window.innerWidth - size.width) / 2),
        y: topBarHeight
      }
    }

    const maxX = Math.max(0, window.innerWidth - size.width - 20)
    const maxY = Math.max(0, window.innerHeight - size.height - 80) // Extra space for bottom dock
    return {
      x: Math.max(20, Math.min(pos.x, maxX)),
      y: Math.max(topBarHeight, Math.min(pos.y, maxY))
    }
  }

  const getResponsiveSize = (defaultSize: { width: number; height: number }) => {
    if (typeof window === 'undefined') {
      return defaultSize // Return default size during SSR
    }

    if (window.innerWidth < 768) {
      return {
        width: Math.min(defaultSize.width, window.innerWidth - 20),
        height: Math.min(defaultSize.height, window.innerHeight - 140)
      }
    }
    return defaultSize
  }

  const [position, setPosition] = useState(defaultPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState(defaultSize)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeCorner, setResizeCorner] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  // Apply constraints after mount to avoid hydration mismatch
  useEffect(() => {
    const responsiveSize = getResponsiveSize(defaultSize)
    const constrainedPosition = getConstrainedPosition(defaultPosition, responsiveSize)
    setSize(responsiveSize)
    setPosition(constrainedPosition)
  }, []) // Only run once on mount

  // Apply forced position from auto-arrange
  useEffect(() => {
    if (forcePosition) {
      setPosition(forcePosition)
    }
  }, [forcePosition, arrangeKey])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
      onFocus?.()
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeCorner(corner)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Constrain to viewport with padding
        const topBarHeight = 60
        const newX = Math.max(20, Math.min(window.innerWidth - size.width - 20, e.clientX - dragOffset.x))
        const newY = Math.max(topBarHeight, Math.min(window.innerHeight - size.height - 80, e.clientY - dragOffset.y))
        setPosition({ x: newX, y: newY })
      }
      if (isResizing && resizeCorner) {
        const deltaX = e.clientX - resizeStart.x
        const deltaY = e.clientY - resizeStart.y

        let newWidth = resizeStart.width
        let newHeight = resizeStart.height
        let newX = resizeStart.posX
        let newY = resizeStart.posY

        const minWidth = 280
        const minHeight = 350
        const maxWidth = window.innerWidth - newX - 40
        const maxHeight = window.innerHeight - newY - 100

        if (resizeCorner.includes("e")) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width + deltaX))
        }
        if (resizeCorner.includes("w")) {
          const proposedWidth = resizeStart.width - deltaX
          if (proposedWidth >= minWidth) {
            newWidth = proposedWidth
            newX = Math.max(20, resizeStart.posX + deltaX)
          }
        }
        if (resizeCorner.includes("s")) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height + deltaY))
        }
        if (resizeCorner.includes("n")) {
          const proposedHeight = resizeStart.height - deltaY
          if (proposedHeight >= minHeight) {
            newHeight = proposedHeight
            newY = Math.max(20, resizeStart.posY + deltaY)
          }
        }

        setSize({ width: newWidth, height: newHeight })
        setPosition({ x: newX, y: newY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeCorner(null)
    }

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isResizing, dragOffset, resizeCorner, resizeStart, position, size])

  return (
    <div
      ref={panelRef}
      className={`fixed border-[3px] border-foreground bg-card flex flex-col rounded-xl shadow-xl max-w-[95vw] max-h-[90vh] overflow-hidden ${isActive ? 'ring-2 ring-accent' : ''} ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        boxShadow: shadowStyle,
        zIndex,
      }}
      onMouseDown={(e) => {
        // Only trigger focus if clicking on the panel itself, not dragging
        if (!isDragging) {
          onFocus?.()
        }
      }}
    >
      <div
        className="bg-card border-b-[3px] border-foreground px-4 py-2 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 pl-1">
          {icon || <Grid3x3 className="w-4 h-4" strokeWidth={2.5} />}
          <span className="font-bold text-sm md:text-base truncate">{title}</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 border-[2px] border-foreground flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-md flex-shrink-0 mr-1"
        >
          <X className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
      <div className="bg-card flex-1 overflow-auto min-h-0 p-4">{children}</div>

      {/* Resize handles - all 4 corners with enhanced visual feedback */}
      {/* Top-left corner */}
      <div
        className="absolute top-0 left-0 w-8 h-8 cursor-nw-resize hidden md:block group"
        onMouseDown={(e) => handleResizeMouseDown(e, "nw")}
      >
        <div className="absolute top-1 left-2 w-3 h-3 border-t-2 border-l-2 border-foreground/30 group-hover:border-foreground group-hover:border-t-[3px] group-hover:border-l-[3px] transition-all rounded-tl" />
      </div>

      {/* Top-right corner */}
      <div
        className="absolute top-0 right-0 w-8 h-8 cursor-ne-resize hidden md:block group"
        onMouseDown={(e) => handleResizeMouseDown(e, "ne")}
      >
        <div className="absolute top-1 right-2 w-3 h-3 border-t-2 border-r-2 border-foreground/30 group-hover:border-foreground group-hover:border-t-[3px] group-hover:border-r-[3px] transition-all rounded-tr" />
      </div>

      {/* Bottom-left corner */}
      <div
        className="absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize hidden md:block group"
        onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
      >
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-foreground/30 group-hover:border-foreground group-hover:border-b-[3px] group-hover:border-l-[3px] transition-all rounded-bl" />
      </div>

      {/* Bottom-right corner */}
      <div
        className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize hidden md:block group"
        onMouseDown={(e) => handleResizeMouseDown(e, "se")}
      >
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-foreground/30 group-hover:border-foreground group-hover:border-b-[3px] group-hover:border-r-[3px] transition-all rounded-br" />
      </div>
    </div>
  )
}
