"use client"

import { useState, useRef, useEffect } from "react"
import { TopBar } from "@/components/top-bar"
import { BottomDock } from "@/components/bottom-dock"
import { Canvas } from "@/components/canvas"
import { FileValidatorPanel } from "@/components/panels/file-validator-panel"
import { UpscalerPanel } from "@/components/panels/upscaler-panel"
import { BgRemoverPanel } from "@/components/panels/bg-remover-panel"
import { ColorKnockoutPanel } from "@/components/panels/color-knockout-panel"
import { RecolorPanel } from "@/components/panels/recolor-panel"
import { TextureCutPanel } from "@/components/panels/texture-cut-panel"
import { AIChatPanel } from "@/components/panels/ai-chat-panel"
import { HistoryPanel } from "@/components/panels/history-panel"
import { useImageStore } from "@/lib/image-store"

export type Tool =
  | "validator"
  | "upscaler"
  | "bg-remover"
  | "downscaler"
  | "color-knockout"
  | "recolor"
  | "blend"
  | "ai-chat"
  | "history"
  | "canvas"

interface PanelPosition {
  x: number
  y: number
}

// Default panel sizes (can be customized per panel type)
const PANEL_SIZES: Record<Tool, { width: number; height: number }> = {
  canvas: { width: 400, height: 500 },
  validator: { width: 350, height: 450 },
  upscaler: { width: 380, height: 420 },
  "bg-remover": { width: 380, height: 400 },
  downscaler: { width: 380, height: 400 },
  "color-knockout": { width: 380, height: 450 },
  recolor: { width: 380, height: 450 },
  blend: { width: 380, height: 450 },
  "ai-chat": { width: 480, height: 550 },
  history: { width: 350, height: 500 },
}

export default function PhotoEditorPage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [openPanels, setOpenPanels] = useState<Set<Tool>>(new Set(["canvas"]))
  const [focusedPanel, setFocusedPanel] = useState<Tool>("canvas")
  const [panelPositions, setPanelPositions] = useState<Record<string, PanelPosition>>({})
  const [arrangeKey, setArrangeKey] = useState(0) // Trigger re-arrange
  const clearImage = useImageStore((state) => state.clearImage)
  const imageUrl = useImageStore((state) => state.imageUrl)

  // Z-index management:
  // - TopBar: z-50 (fixed in TopBar component)
  // - BottomDock: z-50 (fixed in BottomDock component)
  // - Canvas: z-30 (base layer, always active)
  // - Tool panels: z-40 (active/focused panel gets z-45)
  const getZIndex = (tool: Tool) => {
    if (tool === "canvas") return 30
    return focusedPanel === tool ? 45 : 40
  }

  // Tetris-style auto-arrange algorithm
  const autoArrangePanels = () => {
    const topBarHeight = 60
    const bottomDockHeight = 80
    const padding = 20
    const gap = 15

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
    const availableHeight = viewportHeight - topBarHeight - bottomDockHeight

    const panels = Array.from(openPanels).filter((tool) => tool !== "canvas")
    const newPositions: Record<string, PanelPosition> = {}

    // Sort panels by size (largest first) for better Tetris packing
    const sortedPanels = panels.sort((a, b) => {
      const aSize = PANEL_SIZES[a].width * PANEL_SIZES[a].height
      const bSize = PANEL_SIZES[b].width * PANEL_SIZES[b].height
      return bSize - aSize
    })

    // Track occupied spaces for collision detection
    interface Rect {
      x: number
      y: number
      width: number
      height: number
    }
    const occupiedSpaces: Rect[] = []

    // Helper: Check if position overlaps with any occupied space
    const isOccupied = (x: number, y: number, width: number, height: number): boolean => {
      return occupiedSpaces.some((rect) => {
        return !(
          x + width <= rect.x ||
          x >= rect.x + rect.width ||
          y + height <= rect.y ||
          y >= rect.y + rect.height
        )
      })
    }

    // Helper: Find first available position (Tetris-style left-to-right, top-to-bottom)
    const findAvailablePosition = (width: number, height: number): PanelPosition => {
      const startY = topBarHeight + padding
      const maxY = viewportHeight - bottomDockHeight - height - padding

      // Try positions from top-left, row by row
      for (let y = startY; y <= maxY; y += gap) {
        for (let x = padding; x <= viewportWidth - width - padding; x += gap) {
          if (!isOccupied(x, y, width, height)) {
            return { x, y }
          }
        }
      }

      // Fallback: stack vertically if no space found
      const fallbackX = padding
      const fallbackY = occupiedSpaces.length > 0
        ? Math.max(...occupiedSpaces.map(r => r.y + r.height)) + gap
        : startY

      return { x: fallbackX, y: Math.min(fallbackY, maxY) }
    }

    // Place each panel
    sortedPanels.forEach((tool) => {
      const size = PANEL_SIZES[tool]
      const position = findAvailablePosition(size.width, size.height)

      newPositions[tool] = position
      occupiedSpaces.push({
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      })
    })

    setPanelPositions(newPositions)
    setArrangeKey((prev) => prev + 1) // Trigger panel re-positioning
  }

  const handleToolClick = (tool: Tool) => {
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
  }

  const handlePanelFocus = (tool: Tool) => {
    setFocusedPanel(tool)
    setActiveTool(tool)
  }

  const handleClosePanel = (tool: Tool) => {
    let shouldResetCanvas = false

    setOpenPanels((prev) => {
      const newSet = new Set(prev)
      newSet.delete(tool)

      if (newSet.size === 0) {
        shouldResetCanvas = true
        newSet.add("canvas")
      }

      return newSet
    })

    if (shouldResetCanvas) {
      clearImage()
    }

    if (activeTool === tool) {
      setActiveTool(null)
    }

    // Reset focus to canvas if the closed panel was focused
    if (focusedPanel === tool) {
      setFocusedPanel("canvas")
    }
  }

  const handleHistoryClick = () => {
    handleToolClick("history")
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar
        onHistoryClick={handleHistoryClick}
        onAutoArrangeClick={autoArrangePanels}
        showHistoryButton={openPanels.has("history")}
      />

      <main className="flex-1 grid-background overflow-hidden relative" />

      {openPanels.has("canvas") && (
        <Canvas
          onClose={() => handleClosePanel("canvas")}
          zIndex={getZIndex("canvas")}
          isActive={true}
          onFocus={() => handlePanelFocus("canvas")}
        />
      )}

      {openPanels.has("validator") && (
        <FileValidatorPanel
          onClose={() => handleClosePanel("validator")}
          zIndex={getZIndex("validator")}
          isActive={focusedPanel === "validator"}
          onFocus={() => handlePanelFocus("validator")}
          forcePosition={panelPositions["validator"]}
          arrangeKey={arrangeKey}
        />
      )}
      {openPanels.has("upscaler") && (
        <UpscalerPanel
          onClose={() => handleClosePanel("upscaler")}
          zIndex={getZIndex("upscaler")}
          isActive={focusedPanel === "upscaler"}
          onFocus={() => handlePanelFocus("upscaler")}
          forcePosition={panelPositions["upscaler"]}
          arrangeKey={arrangeKey}
        />
      )}
      {openPanels.has("bg-remover") && (
        <BgRemoverPanel
          onClose={() => handleClosePanel("bg-remover")}
          zIndex={getZIndex("bg-remover")}
          isActive={focusedPanel === "bg-remover"}
          onFocus={() => handlePanelFocus("bg-remover")}
          forcePosition={panelPositions["bg-remover"]}
          arrangeKey={arrangeKey}
        />
      )}
      {openPanels.has("color-knockout") && (
        <ColorKnockoutPanel
          onClose={() => handleClosePanel("color-knockout")}
          zIndex={getZIndex("color-knockout")}
          isActive={focusedPanel === "color-knockout"}
          onFocus={() => handlePanelFocus("color-knockout")}
          forcePosition={panelPositions["color-knockout"]}
          arrangeKey={arrangeKey}
        />
      )}
      {openPanels.has("recolor") && (
        <RecolorPanel
          onClose={() => handleClosePanel("recolor")}
          zIndex={getZIndex("recolor")}
          isActive={focusedPanel === "recolor"}
          onFocus={() => handlePanelFocus("recolor")}
          forcePosition={panelPositions["recolor"]}
          arrangeKey={arrangeKey}
        />
      )}
      {openPanels.has("blend") && (
        <TextureCutPanel
          onClose={() => handleClosePanel("blend")}
          zIndex={getZIndex("blend")}
          isActive={focusedPanel === "blend"}
          onFocus={() => handlePanelFocus("blend")}
          forcePosition={panelPositions["blend"]}
          arrangeKey={arrangeKey}
        />
      )}
      {openPanels.has("ai-chat") && (
        <AIChatPanel
          onClose={() => handleClosePanel("ai-chat")}
          zIndex={getZIndex("ai-chat")}
          isActive={focusedPanel === "ai-chat"}
          onFocus={() => handlePanelFocus("ai-chat")}
          forcePosition={panelPositions["ai-chat"]}
          arrangeKey={arrangeKey}
        />
      )}
      {openPanels.has("history") && (
        <HistoryPanel
          onClose={() => handleClosePanel("history")}
          zIndex={getZIndex("history")}
          isActive={focusedPanel === "history"}
          onFocus={() => handlePanelFocus("history")}
          forcePosition={panelPositions["history"]}
          arrangeKey={arrangeKey}
        />
      )}

      <BottomDock activeTool={activeTool} onToolClick={handleToolClick} />
    </div>
  )
}
