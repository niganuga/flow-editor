"use client"

import { useState, useRef } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { useImageStore } from "@/lib/image-store"
import { useMessageStore } from "@/lib/message-store"
import {
  removeBackground,
  getAvailableModels,
  type BackgroundRemovalModel,
  type BackgroundRemovalSettings,
} from "@/lib/tools/background-remover"
import { Download, ZoomIn, ZoomOut, Grid3x3, Square } from "lucide-react"

type BackgroundMode = "transparent" | "black" | "white"

interface BgRemoverPanelProps {
  onClose: () => void
  zIndex?: number
  isActive?: boolean
  onFocus?: () => void
}

export function BgRemoverPanel({ onClose, zIndex, isActive, onFocus }: BgRemoverPanelProps) {
  const { imageUrl, setImage } = useImageStore()
  const { addMessage } = useMessageStore()

  const [selectedModel, setSelectedModel] = useState<BackgroundRemovalModel>("bria")
  const [customBackgroundColor, setCustomBackgroundColor] = useState<string>("")
  const [useCustomBackground, setUseCustomBackground] = useState(false)
  const [featherEdges, setFeatherEdges] = useState(0)

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)

  const [zoom, setZoom] = useState(100)
  const [background, setBackground] = useState<BackgroundMode>("transparent")

  const availableModels = getAvailableModels()

  const handleProcess = async () => {
    if (!imageUrl) {
      addMessage("warning", "Please load an image first")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setStatusMessage("Starting background removal...")

    try {
      // Convert imageUrl to File
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], "image.png", { type: blob.type })

      const settings: BackgroundRemovalSettings = {
        model: selectedModel,
        outputFormat: "png",
        backgroundColor: useCustomBackground && customBackgroundColor ? customBackgroundColor : undefined,
        featherEdges,
      }

      const resultBlobUrl = await removeBackground({
        image: file,
        settings,
        onProgress: (prog, msg) => {
          setProgress(prog)
          setStatusMessage(msg)
        },
      })

      setResultUrl(resultBlobUrl)

      // Get blob for apply functionality
      const resultResponse = await fetch(resultBlobUrl)
      const resultBlobData = await resultResponse.blob()
      setResultBlob(resultBlobData)

      addMessage("success", "Background removed successfully!")
    } catch (error) {
      console.error("Background removal error:", error)
      addMessage("error", error instanceof Error ? error.message : "Failed to remove background")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApply = async () => {
    if (resultUrl && resultBlob) {
      const file = new File([resultBlob], "no-background.png", { type: "image/png" })
      setImage(resultUrl, file, "no-background.png")

      // Add to history
      const { addToHistory } = useImageStore.getState()
      addToHistory(`Background Removed (${selectedModel})`)

      addMessage("success", "Image applied to canvas")
      onClose()
    }
  }

  const handleDownload = () => {
    if (!resultUrl) return

    const link = document.createElement("a")
    link.href = resultUrl
    link.download = `no-background.png`
    link.click()

    addMessage("success", "Image downloaded")
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 400))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const getBackgroundStyle = () => {
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
  }

  return (
    <DraggablePanel
      defaultPosition={{ x: 820, y: 70 }}
      defaultSize={{ width: 360, height: 580 }}
      title="Background Remover"
      onClose={onClose}
      zIndex={zIndex}
      isActive={isActive}
      onFocus={onFocus}
    >
      <div className="flex flex-col h-full p-3">
        {/* Preview */}
        <div className="flex-shrink-0 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="p-1 rounded border border-foreground hover:bg-muted disabled:opacity-50"
                title="Zoom Out"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-mono font-bold px-1 min-w-[2.5rem] text-center">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 400}
                className="p-1 rounded border border-foreground hover:bg-muted disabled:opacity-50"
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setBackground("transparent")}
                className={`p-1 rounded border border-foreground ${background === "transparent" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                title="Transparent Grid"
              >
                <Grid3x3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setBackground("white")}
                className={`p-1 rounded border border-foreground ${background === "white" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                title="White Background"
              >
                <Square className="w-3 h-3 fill-white stroke-foreground" />
              </button>
              <button
                onClick={() => setBackground("black")}
                className={`p-1 rounded border border-foreground ${background === "black" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                title="Black Background"
              >
                <Square className="w-3 h-3 fill-black stroke-foreground" />
              </button>
            </div>
          </div>

          <div
            className="rounded-lg overflow-hidden border-[2px] border-foreground"
            style={{ ...getBackgroundStyle(), height: "140px" }}
          >
            {imageUrl ? (
              <div className="h-full flex items-center justify-center">
                <img
                  src={resultUrl || imageUrl}
                  alt="Preview"
                  className="object-contain pointer-events-none"
                  style={{
                    width: `${zoom}%`,
                    height: `${zoom}%`,
                    maxWidth: "none",
                    maxHeight: "none",
                  }}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No image loaded
              </div>
            )}
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div className="mt-2 space-y-1">
              <div className="w-full bg-muted rounded-full h-2 border border-foreground">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">{statusMessage}</p>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 px-0.5">
          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold">AI Model</label>
            <div className="space-y-1.5">
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`w-full px-2 py-2 rounded-lg border-[2px] border-foreground text-left
                    ${
                      selectedModel === model.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card hover:bg-muted"
                    }
                    transition-colors`}
                >
                  <div className="text-xs font-bold">{model.name}</div>
                  <div className="text-[10px] opacity-80">{model.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Background Color */}
          {selectedModel !== 'bria' && (
            <div className="space-y-1.5 pt-2 border-t-[2px] border-foreground">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomBackground"
                  checked={useCustomBackground}
                  onChange={(e) => setUseCustomBackground(e.target.checked)}
                  className="rounded border-[2px] border-foreground"
                />
                <label htmlFor="useCustomBackground" className="text-xs font-bold">
                  Custom Background Color
                </label>
              </div>

              {useCustomBackground && (
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={customBackgroundColor || "#FFFFFF"}
                    onChange={(e) => setCustomBackgroundColor(e.target.value)}
                    className="w-12 h-8 rounded border-[2px] border-foreground cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customBackgroundColor || "#FFFFFF"}
                    onChange={(e) => setCustomBackgroundColor(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs rounded border-[2px] border-foreground bg-background"
                    placeholder="#FFFFFF"
                  />
                </div>
              )}
            </div>
          )}

          {/* Edge Feathering */}
          <div className="space-y-1 pt-2 border-t-[2px] border-foreground">
            <div className="flex justify-between text-xs">
              <label className="font-bold">Edge Feather</label>
              <span className="text-muted-foreground">{featherEdges}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={featherEdges}
              onChange={(e) => setFeatherEdges(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 mt-3 pt-3 border-t-[2px] border-foreground space-y-2">
          {resultUrl && (
            <button
              onClick={handleDownload}
              className="w-full px-3 py-1.5 rounded-lg border-[2px] border-foreground font-bold text-xs
                bg-card hover:bg-muted transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleProcess}
              disabled={isProcessing || !imageUrl}
              className="px-3 py-1.5 rounded-lg border-[2px] border-foreground font-bold text-xs
                bg-primary text-primary-foreground hover:bg-primary/90
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? "Processing..." : "Remove BG"}
            </button>

            <button
              onClick={handleApply}
              disabled={!resultUrl}
              className="px-3 py-1.5 rounded-lg border-[2px] border-foreground font-bold text-xs
                bg-card hover:bg-muted
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </DraggablePanel>
  )
}
