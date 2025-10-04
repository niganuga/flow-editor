"use client"

import { useState } from "react"
import { TopBar } from "@/components/top-bar"
import { BottomDock } from "@/components/bottom-dock"
import { Canvas } from "@/components/canvas"
import { FileValidatorPanel } from "@/components/panels/file-validator-panel"
import { UpscalerPanel } from "@/components/panels/upscaler-panel"
import { BgRemoverPanel } from "@/components/panels/bg-remover-panel"
import { CropperPanel } from "@/components/panels/cropper-panel"
import { AIChatPanel } from "@/components/panels/ai-chat-panel"

export type Tool =
  | "validator"
  | "upscaler"
  | "bg-remover"
  | "cropper"
  | "downscaler"
  | "color-knockout"
  | "recolor"
  | "blend"
  | "ai-chat"
  | "canvas"

export default function PhotoEditorPage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [openPanels, setOpenPanels] = useState<Set<Tool>>(new Set(["canvas"]))

  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool)
    setOpenPanels((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(tool)) {
        newSet.delete(tool)
      } else {
        newSet.add(tool)
      }
      return newSet
    })
  }

  const handleClosePanel = (tool: Tool) => {
    setOpenPanels((prev) => {
      const newSet = new Set(prev)
      newSet.delete(tool)
      return newSet
    })
    if (activeTool === tool) {
      setActiveTool(null)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />

      <main className="flex-1 grid-background overflow-hidden relative" />

      {openPanels.has("canvas") && <Canvas onClose={() => handleClosePanel("canvas")} />}

      {openPanels.has("validator") && <FileValidatorPanel onClose={() => handleClosePanel("validator")} />}
      {openPanels.has("upscaler") && <UpscalerPanel onClose={() => handleClosePanel("upscaler")} />}
      {openPanels.has("bg-remover") && <BgRemoverPanel onClose={() => handleClosePanel("bg-remover")} />}
      {openPanels.has("cropper") && <CropperPanel onClose={() => handleClosePanel("cropper")} />}
      {openPanels.has("ai-chat") && <AIChatPanel onClose={() => handleClosePanel("ai-chat")} />}

      <BottomDock activeTool={activeTool} onToolClick={handleToolClick} />
    </div>
  )
}
