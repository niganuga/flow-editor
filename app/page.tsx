"use client"

import { useState } from "react"
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

export default function PhotoEditorPage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [openPanels, setOpenPanels] = useState<Set<Tool>>(new Set(["canvas"]))
  const [focusedPanel, setFocusedPanel] = useState<Tool>("canvas")
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />

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
        />
      )}
      {openPanels.has("upscaler") && (
        <UpscalerPanel
          onClose={() => handleClosePanel("upscaler")}
          zIndex={getZIndex("upscaler")}
          isActive={focusedPanel === "upscaler"}
          onFocus={() => handlePanelFocus("upscaler")}
        />
      )}
      {openPanels.has("bg-remover") && (
        <BgRemoverPanel
          onClose={() => handleClosePanel("bg-remover")}
          zIndex={getZIndex("bg-remover")}
          isActive={focusedPanel === "bg-remover"}
          onFocus={() => handlePanelFocus("bg-remover")}
        />
      )}
      {openPanels.has("color-knockout") && (
        <ColorKnockoutPanel
          onClose={() => handleClosePanel("color-knockout")}
          zIndex={getZIndex("color-knockout")}
          isActive={focusedPanel === "color-knockout"}
          onFocus={() => handlePanelFocus("color-knockout")}
        />
      )}
      {openPanels.has("recolor") && (
        <RecolorPanel
          onClose={() => handleClosePanel("recolor")}
          zIndex={getZIndex("recolor")}
          isActive={focusedPanel === "recolor"}
          onFocus={() => handlePanelFocus("recolor")}
        />
      )}
      {openPanels.has("blend") && (
        <TextureCutPanel
          onClose={() => handleClosePanel("blend")}
          zIndex={getZIndex("blend")}
          isActive={focusedPanel === "blend"}
          onFocus={() => handlePanelFocus("blend")}
        />
      )}
      {openPanels.has("ai-chat") && (
        <AIChatPanel
          onClose={() => handleClosePanel("ai-chat")}
          zIndex={getZIndex("ai-chat")}
          isActive={focusedPanel === "ai-chat"}
          onFocus={() => handlePanelFocus("ai-chat")}
        />
      )}
      {openPanels.has("history") && (
        <HistoryPanel
          onClose={() => handleClosePanel("history")}
          zIndex={getZIndex("history")}
          isActive={focusedPanel === "history"}
          onFocus={() => handlePanelFocus("history")}
        />
      )}

      <BottomDock activeTool={activeTool} onToolClick={handleToolClick} />
    </div>
  )
}
