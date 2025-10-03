"use client"

import { useState } from "react"
import { TopBar } from "@/components/top-bar"
import { BottomDock } from "@/components/bottom-dock"
import { Canvas } from "@/components/canvas"
import { FileValidatorPanel } from "@/components/panels/file-validator-panel"
import { UpscalerPanel } from "@/components/panels/upscaler-panel"
import { BgRemoverPanel } from "@/components/panels/bg-remover-panel"
import { CropperPanel } from "@/components/panels/cropper-panel"

export type Tool =
  | "validator"
  | "upscaler"
  | "bg-remover"
  | "cropper"
  | "downscaler"
  | "color-knockout"
  | "recolor"
  | "blend"

export default function PhotoEditorPage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [openPanels, setOpenPanels] = useState<Set<Tool>>(new Set())

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

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl)
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />

      <Canvas uploadedImage={uploadedImage} onImageUpload={handleImageUpload} />

      {/* Tool Panels */}
      {openPanels.has("validator") && (
        <FileValidatorPanel onClose={() => handleClosePanel("validator")} imageUrl={uploadedImage} />
      )}
      {openPanels.has("upscaler") && (
        <UpscalerPanel onClose={() => handleClosePanel("upscaler")} imageUrl={uploadedImage} />
      )}
      {openPanels.has("bg-remover") && (
        <BgRemoverPanel onClose={() => handleClosePanel("bg-remover")} imageUrl={uploadedImage} />
      )}
      {openPanels.has("cropper") && (
        <CropperPanel onClose={() => handleClosePanel("cropper")} imageUrl={uploadedImage} />
      )}

      <BottomDock activeTool={activeTool} onToolClick={handleToolClick} />
    </div>
  )
}
