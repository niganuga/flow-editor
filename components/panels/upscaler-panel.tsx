"use client"

import { useState, useRef } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { useImageStore } from "@/lib/image-store"
import { useMessageStore } from "@/lib/message-store"
import { upscaleImage, getAvailableModels, type UpscaleModel, type UpscaleSettings } from "@/lib/tools/upscaler"
import { Download, Upload, ZoomIn, ZoomOut, Grid3x3, Square } from "lucide-react"

type BackgroundMode = "transparent" | "black" | "white"

interface UpscalerPanelProps {
  onClose: () => void
  zIndex?: number
  isActive?: boolean
  onFocus?: () => void
  forcePosition?: { x: number; y: number }
  arrangeKey?: number
}

export function UpscalerPanel({ onClose, zIndex, isActive, onFocus, forcePosition, arrangeKey }: UpscalerPanelProps) {
  const { imageUrl, setImage } = useImageStore()
  const { addMessage } = useMessageStore()

  const [selectedModel, setSelectedModel] = useState<UpscaleModel>("standard")
  const [scaleFactor, setScaleFactor] = useState(2)
  const [faceEnhance, setFaceEnhance] = useState(false)

  // Creative model settings
  const [creativity, setCreativity] = useState(0.35)
  const [resemblance, setResemblance] = useState(0.6)
  const [dynamic, setDynamic] = useState(6)
  const [sharpen, setSharpen] = useState(1)

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)

  const [zoom, setZoom] = useState(100)
  const [background, setBackground] = useState<BackgroundMode>("transparent")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const availableModels = getAvailableModels()

  const handleProcess = async () => {
    if (!imageUrl) {
      addMessage("warning", "Please load an image first")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setStatusMessage("Starting upscale process...")

    try {
      // Convert imageUrl to File
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], "image.png", { type: blob.type })

      const settings: UpscaleSettings = {
        model: selectedModel,
        scaleFactor,
        faceEnhance: selectedModel !== "creative" ? faceEnhance : undefined,
        creativity: selectedModel === "creative" ? creativity : undefined,
        resemblance: selectedModel === "creative" ? resemblance : undefined,
        dynamic: selectedModel === "creative" ? dynamic : undefined,
        sharpen: selectedModel === "creative" ? sharpen : undefined,
        outputFormat: "png",
      }

      const resultBlobUrl = await upscaleImage({
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

      addMessage("success", "Upscale complete!")
    } catch (error) {
      console.error("Upscale error:", error)
      addMessage("error", error instanceof Error ? error.message : "Failed to upscale image")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApply = async () => {
    if (resultUrl && resultBlob) {
      const file = new File([resultBlob], "upscaled.png", { type: "image/png" })
      setImage(resultUrl, file, "upscaled.png")

      // Add to history
      const { addToHistory } = useImageStore.getState()
      addToHistory(`Upscaled ${scaleFactor}x (${selectedModel})`)

      addMessage("success", "Upscaled image applied to canvas")
      onClose()
    }
  }

  const handleDownload = () => {
    if (!resultUrl) return

    const link = document.createElement("a")
    link.href = resultUrl
    link.download = `upscaled-${scaleFactor}x.png`
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
      title="AI Upscaler"
      onClose={onClose}
      zIndex={zIndex}
      isActive={isActive}
      onFocus={onFocus}
      forcePosition={forcePosition}
      arrangeKey={arrangeKey}
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
            <div className="grid grid-cols-3 gap-1.5">
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`px-2 py-1.5 rounded-lg border-[2px] border-foreground text-[10px] font-bold
                    ${
                      selectedModel === model.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card hover:bg-muted"
                    }
                    transition-colors capitalize`}
                  title={model.description}
                >
                  {model.id}
                </button>
              ))}
            </div>
          </div>

          {/* Scale Factor */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <label className="font-bold">Scale Factor</label>
              <span className="text-muted-foreground">{scaleFactor}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={scaleFactor}
              onChange={(e) => setScaleFactor(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Face Enhancement (Standard/Anime only) */}
          {selectedModel !== "creative" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="faceEnhance"
                checked={faceEnhance}
                onChange={(e) => setFaceEnhance(e.target.checked)}
                className="rounded border-[2px] border-foreground"
              />
              <label htmlFor="faceEnhance" className="text-xs font-bold">
                Enhance Faces
              </label>
            </div>
          )}

          {/* Creative Model Settings */}
          {selectedModel === "creative" && (
            <div className="space-y-2 pt-2 border-t-[2px] border-foreground">
              <label className="text-xs font-bold">Creative Settings</label>

              {/* Creativity */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <label>Creativity</label>
                  <span className="text-muted-foreground">{creativity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={creativity}
                  onChange={(e) => setCreativity(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Resemblance */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <label>Resemblance</label>
                  <span className="text-muted-foreground">{resemblance.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={resemblance}
                  onChange={(e) => setResemblance(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Dynamic */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <label>Dynamic</label>
                  <span className="text-muted-foreground">{dynamic}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={dynamic}
                  onChange={(e) => setDynamic(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Sharpen */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <label>Sharpen</label>
                  <span className="text-muted-foreground">{sharpen.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={sharpen}
                  onChange={(e) => setSharpen(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}
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
              {isProcessing ? "Processing..." : "Upscale"}
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
