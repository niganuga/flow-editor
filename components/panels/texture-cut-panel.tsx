"use client"

import { useState, useRef, useEffect } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { useImageStore } from "@/lib/image-store"
import { useMessageStore } from "@/lib/message-store"
import {
  textureCut,
  createPatternTexture,
} from "@/lib/tools/texture-cut"
import { Download, Upload, ZoomIn, ZoomOut, Grid3x3, Square } from "lucide-react"

type BackgroundMode = "transparent" | "black" | "white"

interface TextureCutPanelProps {
  onClose: () => void
  zIndex?: number
  isActive?: boolean
  onFocus?: () => void
  forcePosition?: { x: number; y: number }
  arrangeKey?: number
}

export function TextureCutPanel({ onClose, zIndex, isActive, onFocus, forcePosition, arrangeKey }: TextureCutPanelProps) {
  const { imageUrl, setImage } = useImageStore()
  const { addMessage } = useMessageStore()

  const [textureUrl, setTextureUrl] = useState<string | null>(null)
  const [amount, setAmount] = useState(0.5)
  const [feather, setFeather] = useState(0)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [tile, setTile] = useState(false)
  const [invert, setInvert] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [zoom, setZoom] = useState(100)
  const [background, setBackground] = useState<BackgroundMode>("transparent")
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const url = event.target?.result as string
      setTextureUrl(url)
      addMessage("success", "Texture loaded")
    }
    reader.readAsDataURL(file)
  }

  const handleCreatePattern = (type: 'dots' | 'lines' | 'grid' | 'noise') => {
    try {
      const patternUrl = createPatternTexture(type, 200, 200, '#000000', 10)
      setTextureUrl(patternUrl)
      addMessage("success", `${type} pattern created`)
    } catch (error) {
      addMessage("error", "Failed to create pattern")
    }
  }

  const handleProcess = async () => {
    if (!imageUrl || !textureUrl) {
      addMessage("warning", "Please load both base image and texture")
      return
    }

    setIsProcessing(true)
    addMessage("info", "Cutting texture...")

    try {
      const blob = await textureCut({
        baseImageUrl: imageUrl,
        textureUrl,
        cutSettings: {
          amount,
          featherPx: feather,
          invert,
        },
        transformSettings: {
          scale,
          rotation,
          tile,
        },
        onProgress: (progress, message) => {
          console.log(`${progress}%: ${message}`)
        },
      })

      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setResultBlob(blob)
      addMessage("success", "Texture cut complete!")
    } catch (error) {
      console.error("Texture cut error:", error)
      addMessage("error", "Failed to cut texture")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApply = async () => {
    if (resultUrl && resultBlob) {
      const file = new File([resultBlob], "texture-cut.png", { type: "image/png" })
      setImage(resultUrl, file, "texture-cut.png")
      addMessage("success", "Texture cut applied to canvas")
      onClose()
    }
  }

  const handleDownload = () => {
    if (!resultUrl) return

    const link = document.createElement("a")
    link.href = resultUrl
    link.download = "texture-cut.png"
    link.click()

    addMessage("success", "Image downloaded")
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 400))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 100) {
      setPanPosition({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Reset pan when zoom changes to 100% or less
  useEffect(() => {
    if (zoom <= 100) {
      setPanPosition({ x: 0, y: 0 })
    }
  }, [zoom])

  // Generate live preview when texture or settings change
  useEffect(() => {
    if (!imageUrl || !textureUrl) {
      setPreviewUrl(null)
      return
    }

    let cancelled = false

    const generatePreview = async () => {
      try {
        const blob = await textureCut({
          baseImageUrl: imageUrl,
          textureUrl,
          cutSettings: {
            amount,
            featherPx: feather,
            invert,
          },
          transformSettings: {
            scale,
            rotation,
            tile,
          },
        })

        if (!cancelled) {
          const url = URL.createObjectURL(blob)
          // Revoke old preview URL
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
          }
          setPreviewUrl(url)
        }
      } catch (error) {
        console.error("Preview generation error:", error)
      }
    }

    // Debounce preview generation
    const timeoutId = setTimeout(() => {
      generatePreview()
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [imageUrl, textureUrl, amount, feather, scale, rotation, tile, invert])

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
      defaultSize={{ width: 360, height: 550 }}
      title="Texture+Cut"
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
              {/* Zoom Controls */}
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

            {/* Background Toggle */}
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
            ref={containerRef}
            className="rounded-lg overflow-hidden border-[2px] border-foreground"
            style={{ ...getBackgroundStyle(), height: "140px" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {imageUrl ? (
              <div
                className="h-full flex items-center justify-center"
                style={{
                  cursor: zoom > 100 ? (isPanning ? 'grabbing' : 'grab') : 'default'
                }}
              >
                <img
                  src={resultUrl || previewUrl || imageUrl}
                  alt="Preview"
                  className="object-contain pointer-events-none"
                  style={{
                    width: `${zoom}%`,
                    height: `${zoom}%`,
                    maxWidth: "none",
                    maxHeight: "none",
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px)`,
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                  }}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No image loaded
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 px-0.5">
          {/* Texture Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold">Texture</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleTextureUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-1.5 rounded-lg border-[2px] border-foreground font-bold text-xs
                bg-primary text-primary-foreground hover:bg-primary/90 transition-colors
                flex items-center justify-center gap-2"
            >
              <Upload className="w-3 h-3" />
              Upload Texture
            </button>

            {textureUrl && (
              <div className="rounded-lg border-[2px] border-foreground overflow-hidden">
                <img src={textureUrl} alt="Texture" className="w-full h-20 object-cover" />
              </div>
            )}
          </div>

          {/* Quick Patterns */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold">Quick Patterns</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['dots', 'lines', 'grid', 'noise'] as const).map((pattern) => (
                <button
                  key={pattern}
                  onClick={() => handleCreatePattern(pattern)}
                  className="px-2 py-1.5 rounded-lg border-[2px] border-foreground font-bold text-[10px]
                    bg-card hover:bg-muted transition-colors capitalize"
                >
                  {pattern}
                </button>
              ))}
            </div>
          </div>

          {/* Cut Controls */}
          <div className="space-y-1.5 pt-2 border-t-[2px] border-foreground">
            <label className="text-xs font-bold">Cut Mode</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setInvert(false)}
                className={`px-3 py-1.5 rounded-lg border-[2px] border-foreground font-bold text-xs
                  ${
                    !invert
                      ? "bg-primary text-primary-foreground"
                      : "bg-card hover:bg-muted"
                  }
                  transition-colors`}
              >
                Cut
              </button>
              <button
                onClick={() => setInvert(true)}
                className={`px-3 py-1.5 rounded-lg border-[2px] border-foreground font-bold text-xs
                  ${
                    invert
                      ? "bg-primary text-primary-foreground"
                      : "bg-card hover:bg-muted"
                  }
                  transition-colors`}
              >
                Invert
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <label className="font-bold">Amount</label>
              <span className="text-muted-foreground">{Math.round(amount * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Transform Controls */}
          <div className="space-y-2 pt-2 border-t-[2px] border-foreground">
            <label className="text-xs font-bold">Transform</label>

            {/* Scale */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label>Scale</label>
                <span className="text-muted-foreground">{scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label>Rotation</label>
                <span className="text-muted-foreground">{rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Tile */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tile"
                checked={tile}
                onChange={(e) => setTile(e.target.checked)}
                className="rounded border-[2px] border-foreground"
              />
              <label htmlFor="tile" className="text-xs font-bold">
                Tile Texture
              </label>
            </div>
          </div>

          {/* Feather */}
          <div className="space-y-1 pt-2 border-t-[2px] border-foreground">
            <div className="flex justify-between text-xs">
              <label className="font-bold">Edge Feather</label>
              <span className="text-muted-foreground">{feather}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={feather}
              onChange={(e) => setFeather(Number(e.target.value))}
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
              disabled={isProcessing || !textureUrl}
              className="px-3 py-1.5 rounded-lg border-[2px] border-foreground font-bold text-xs
                bg-primary text-primary-foreground hover:bg-primary/90
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? "Processing..." : "Cut"}
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
