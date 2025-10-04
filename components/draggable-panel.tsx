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
}

export function DraggablePanel({
  title,
  onClose,
  children,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 500 },
  icon,
}: DraggablePanelProps) {
  const [position, setPosition] = useState(defaultPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState(defaultSize)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeCorner, setResizeCorner] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
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
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x))
        const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y))
        setPosition({ x: newX, y: newY })
      }
      if (isResizing && resizeCorner) {
        const deltaX = e.clientX - resizeStart.x
        const deltaY = e.clientY - resizeStart.y

        let newWidth = resizeStart.width
        let newHeight = resizeStart.height
        let newX = resizeStart.posX
        let newY = resizeStart.posY

        const minWidth = 300
        const minHeight = 400
        const maxWidth = window.innerWidth - newX - 20
        const maxHeight = window.innerHeight - newY - 20

        if (resizeCorner.includes("e")) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width + deltaX))
        }
        if (resizeCorner.includes("w")) {
          const proposedWidth = resizeStart.width - deltaX
          if (proposedWidth >= minWidth) {
            newWidth = proposedWidth
            newX = Math.max(0, resizeStart.posX + deltaX)
          }
        }
        if (resizeCorner.includes("s")) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height + deltaY))
        }
        if (resizeCorner.includes("n")) {
          const proposedHeight = resizeStart.height - deltaY
          if (proposedHeight >= minHeight) {
            newHeight = proposedHeight
            newY = Math.max(0, resizeStart.posY + deltaY)
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
      className="fixed z-40 border-[5px] border-foreground bg-card"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        boxShadow: "10px 10px 0px 0px rgba(0, 0, 0, 1)",
      }}
    >
      <div
        className="bg-card border-b-[5px] border-foreground px-4 py-3 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-3">
          {icon || <Grid3x3 className="w-5 h-5" strokeWidth={2.5} />}
          <span className="font-bold text-lg">{title}</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 border-[3px] border-foreground flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-md"
        >
          <X className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
      <div className="bg-card h-[calc(100%-60px)] overflow-hidden">{children}</div>

      <div
        className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize hover:bg-primary/20"
        onMouseDown={(e) => handleResizeMouseDown(e, "nw")}
      />
      <div
        className="absolute top-0 right-0 w-6 h-6 cursor-ne-resize hover:bg-primary/20"
        onMouseDown={(e) => handleResizeMouseDown(e, "ne")}
      />
      <div
        className="absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize hover:bg-primary/20"
        onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
      />
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize hover:bg-primary/20"
        onMouseDown={(e) => handleResizeMouseDown(e, "se")}
      />
    </div>
  )
}
