"use client"

import type React from "react"

import { type ReactNode, useRef, useState, useEffect } from "react"
import { Grid3x3, X } from "lucide-react"

interface DraggablePanelProps {
  title: string
  onClose: () => void
  children: ReactNode
  defaultPosition?: { x: number; y: number }
}

export function DraggablePanel({
  title,
  onClose,
  children,
  defaultPosition = { x: 100, y: 100 },
}: DraggablePanelProps) {
  const [position, setPosition] = useState(defaultPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset])

  return (
    <div
      ref={panelRef}
      className="fixed z-40 min-w-[400px] border-[5px] border-foreground bg-card"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        boxShadow: "10px 10px 0px 0px rgba(0, 0, 0, 1)",
      }}
    >
      <div
        className="bg-card border-b-[5px] border-foreground px-6 py-4 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-3">
          <Grid3x3 className="w-5 h-5" strokeWidth={2.5} />
          <span className="font-bold text-lg">{title}</span>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 border-[3px] border-foreground flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-md"
        >
          <X className="w-5 h-5" strokeWidth={3} />
        </button>
      </div>
      <div className="bg-card">{children}</div>
    </div>
  )
}
