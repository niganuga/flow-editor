"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { useImageStore } from "@/lib/image-store"
import { useMessageStore } from "@/lib/message-store"
import {
  performColorKnockout,
  pickColorFromImage,
  type SelectedColor,
  type ReplaceMode
} from "@/lib/tools/color-knockout"
import { Trash2, Pipette, Download, ZoomIn, ZoomOut, Grid3x3, Square } from "lucide-react"

interface ColorKnockoutPanelProps {
  onClose: () => void
  zIndex?: number
  isActive?: boolean
  onFocus?: () => void
}

type BackgroundMode = "transparent" | "black" | "white"

export function ColorKnockoutPanel({ onClose, zIndex, isActive, onFocus }: ColorKnockoutPanelProps) {
  const { imageUrl, setImage } = useImageStore()
  const { addMessage } = useMessageStore()

  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([])
  const [tolerance, setTolerance] = useState(30)
  const [replaceMode, setReplaceMode] = useState<ReplaceMode>("transparency")
  const [feather, setFeather] = useState(0)
  const [antiAliasing, setAntiAliasing] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPicking, setIsPicking] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [suggestedColors, setSuggestedColors] = useState<SelectedColor[]>([])
  const [zoom, setZoom] = useState(100)
  const [background, setBackground] = useState<BackgroundMode>("transparent")
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Extract top 3 colors with tolerance-based clustering
  useEffect(() => {
    const extractTopColors = async () => {
      if (!imageUrl) {
        setSuggestedColors([])
        return
      }

      try {
        // Load image
        const img = new Image()
        img.crossOrigin = "anonymous"
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = imageUrl
        })

        // Create canvas
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) return

        // Resize for performance
        const maxSize = 200
        const scale = maxSize / Math.max(img.width, img.height)
        canvas.width = Math.floor(img.width * scale)
        canvas.height = Math.floor(img.height * scale)

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Color clustering with tolerance
        const colorClusters: Array<{ r: number; g: number; b: number; count: number }> = []
        const tolerance = 30 // Tolerance to group similar colors

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]

          // Skip transparent and extreme colors
          if (r === undefined || g === undefined || b === undefined || a === undefined) continue
          if (a < 200) continue
          if (r > 250 && g > 250 && b > 250) continue
          if (r < 5 && g < 5 && b < 5) continue

          // Find existing cluster or create new one
          let foundCluster = false
          for (const cluster of colorClusters) {
            const rDiff = Math.abs(r - cluster.r)
            const gDiff = Math.abs(g - cluster.g)
            const bDiff = Math.abs(b - cluster.b)

            if (rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance) {
              // Add to existing cluster (update average)
              cluster.r = Math.round((cluster.r * cluster.count + r) / (cluster.count + 1))
              cluster.g = Math.round((cluster.g * cluster.count + g) / (cluster.count + 1))
              cluster.b = Math.round((cluster.b * cluster.count + b) / (cluster.count + 1))
              cluster.count++
              foundCluster = true
              break
            }
          }

          if (!foundCluster) {
            colorClusters.push({ r, g, b, count: 1 })
          }
        }

        // Sort by count and take top 3
        const topColors = colorClusters
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(cluster => ({
            r: cluster.r,
            g: cluster.g,
            b: cluster.b,
            hex: `#${((1 << 24) + (cluster.r << 16) + (cluster.g << 8) + cluster.b).toString(16).slice(1)}`
          }))

        setSuggestedColors(topColors)
      } catch (error) {
        console.error("Failed to extract colors:", error)
      }
    }

    extractTopColors()
  }, [imageUrl])

  const handleScreenClick = useCallback(async (e: React.MouseEvent) => {
    if (!isPicking) return

    e.preventDefault()
    e.stopPropagation()

    try {
      const x = e.clientX
      const y = e.clientY

      // Check if we clicked on the displayed image ref
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect()

        // Check if click is within image bounds
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          const relX = x - rect.left
          const relY = y - rect.top

          const imgX = Math.floor((relX / rect.width) * imageRef.current.naturalWidth)
          const imgY = Math.floor((relY / rect.height) * imageRef.current.naturalHeight)

          // Use the result image if available, otherwise use the original
          const sourceUrl = resultUrl || imageUrl
          if (sourceUrl) {
            const color = await pickColorFromImage(sourceUrl, imgX, imgY)
            setSelectedColors(prev => [...prev, color])
            setIsPicking(false)
            addMessage("success", `Color picked: ${color.hex}`)
            return
          }
        }
      }

      // Fallback: find any image element
      const element = document.elementFromPoint(x, y)
      if (!element) {
        addMessage("error", "Please click on the image")
        setIsPicking(false)
        return
      }

      let currentEl: Element | null = element
      while (currentEl) {
        if (currentEl instanceof HTMLImageElement && currentEl.src) {
          const rect = currentEl.getBoundingClientRect()
          const relX = x - rect.left
          const relY = y - rect.top
          const imgX = Math.floor((relX / rect.width) * currentEl.naturalWidth)
          const imgY = Math.floor((relY / rect.height) * currentEl.naturalHeight)

          const color = await pickColorFromImage(currentEl.src, imgX, imgY)
          setSelectedColors(prev => [...prev, color])
          setIsPicking(false)
          addMessage("success", `Color picked: ${color.hex}`)
          return
        }
        currentEl = currentEl.parentElement
      }

      addMessage("error", "Please click on the image to pick a color")
      setIsPicking(false)
    } catch (error) {
      console.error("Color picking error:", error)
      addMessage("error", "Failed to pick color")
      setIsPicking(false)
    }
  }, [isPicking, imageUrl, resultUrl, addMessage])

  const handleProcess = async () => {
    if (!imageUrl || selectedColors.length === 0) {
      addMessage("warning", "Please select at least one color to knockout")
      return
    }

    setIsProcessing(true)
    addMessage("info", "Processing color knockout...")

    try {
      const blob = await performColorKnockout({
        imageUrl,
        selectedColors,
        settings: {
          tolerance,
          replaceMode,
          feather,
          antiAliasing,
          edgeSmoothing: 0.5,
        },
        onProgress: (progress, message) => {
          console.log(`${progress}%: ${message}`)
        },
      })

      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setResultBlob(blob)
      addMessage("success", "Color knockout complete!")
    } catch (error) {
      console.error("Color knockout error:", error)
      addMessage("error", "Failed to process color knockout")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApply = async () => {
    if (resultUrl && resultBlob) {
      const file = new File([resultBlob], "color-knockout.png", { type: "image/png" })
      setImage(resultUrl, file, "color-knockout.png")

      // Add to history
      const { addToHistory } = useImageStore.getState()
      const colorList = selectedColors.map(c => c.hex).join(', ')
      addToHistory(`Color Knockout: ${colorList}`)

      addMessage("success", "Color knockout applied to canvas")
      onClose()
    }
  }

  const handleDownload = () => {
    if (!resultUrl) return

    const link = document.createElement("a")
    link.href = resultUrl
    link.download = "color-knockout.png"
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
    <>
      {/* Fullscreen color picker overlay */}
      {isPicking && (
        <div
          className="fixed inset-0 z-50 cursor-crosshair"
          onClick={handleScreenClick}
          style={{ backgroundColor: 'transparent', pointerEvents: 'auto' }}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary text-primary-foreground rounded-lg border-2 border-foreground font-bold text-sm pointer-events-none">
            Click anywhere to pick a color
          </div>
        </div>
      )}

      <DraggablePanel
        defaultPosition={{ x: 20, y: 70 }}
        defaultSize={{ width: 360, height: 550 }}
        title="Color Knockout"
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
                    ref={imageRef}
                    src={resultUrl || imageUrl}
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
          {/* Color Picker Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold block">Select Colors</label>

            {/* Top 3 Suggested Colors */}
            {suggestedColors.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {suggestedColors.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (!selectedColors.find(c => c.hex === color.hex)) {
                        setSelectedColors(prev => [...prev, color])
                        addMessage("success", `Color added: ${color.hex}`)
                      }
                    }}
                    className="relative rounded-md border-[2px] border-foreground overflow-hidden
                      hover:shadow-md transition-all hover:scale-105 active:scale-95"
                    title={`Click to select ${color.hex}`}
                  >
                    <div
                      className="h-8 w-full"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 text-[8px] font-mono font-bold
                      bg-card/95 px-0.5 text-center border-t border-foreground">
                      {color.hex.substring(0, 4)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsPicking(true)}
              disabled={!imageUrl || isPicking}
              className={`w-full px-3 py-2 rounded-lg border-[2px] border-foreground font-bold text-xs
                ${
                  isPicking
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-muted"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors flex items-center justify-center gap-2`}
            >
              <Pipette className="w-3.5 h-3.5" />
              {isPicking ? "Click image to pick..." : "Pick Custom Color"}
            </button>

            {selectedColors.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mt-2 p-2 rounded-lg border-[2px] border-foreground bg-muted/50">
                {selectedColors.map((color, index) => (
                  <div
                    key={index}
                    className="relative group rounded-md border-[2px] border-foreground overflow-hidden
                      hover:shadow-md transition-shadow"
                  >
                    <div
                      className="h-10 w-full"
                      style={{ backgroundColor: color.hex }}
                    />
                    <button
                      onClick={() => setSelectedColors(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-card rounded border-[1px] border-foreground
                        opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Remove color"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 text-[8px] font-mono font-bold
                      bg-card/95 px-0.5 text-center border-t border-foreground">
                      {color.hex.substring(0, 7)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="space-y-2.5 pt-2 border-t-[2px] border-foreground">
            {/* Tolerance */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold">Tolerance</label>
                <span className="text-xs font-mono font-bold text-primary">{tolerance}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer
                  bg-muted border-[2px] border-foreground"
              />
            </div>

            {/* Replace Mode */}
            <div className="space-y-1">
              <label className="text-xs font-bold block">Replace Mode</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["transparency", "color", "mask"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setReplaceMode(mode)}
                    className={`px-1.5 py-1.5 rounded-md border-[2px] border-foreground text-[10px] font-bold
                      ${
                        replaceMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "bg-card hover:bg-muted"
                      }
                      transition-all capitalize hover:scale-105 active:scale-95`}
                  >
                    {mode === "transparency" ? "Alpha" : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Feather */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold">Edge Feather</label>
                <span className="text-xs font-mono font-bold text-primary">{feather}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={feather}
                onChange={(e) => setFeather(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer
                  bg-muted border-[2px] border-foreground"
              />
            </div>

            {/* Anti-aliasing */}
            <div className="flex items-center gap-2 p-1.5 rounded-md border-[2px] border-foreground bg-card">
              <input
                type="checkbox"
                id="antialiasing"
                checked={antiAliasing}
                onChange={(e) => setAntiAliasing(e.target.checked)}
                className="w-4 h-4 rounded border-[2px] border-foreground cursor-pointer"
              />
              <label htmlFor="antialiasing" className="text-xs font-bold cursor-pointer flex-1">
                Anti-aliasing
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 mt-3 pt-3 border-t-[2px] border-foreground space-y-1.5">
          {resultUrl && (
            <button
              onClick={handleDownload}
              className="w-full px-3 py-2 rounded-lg border-[2px] border-foreground font-bold text-xs
                bg-card hover:bg-muted transition-all flex items-center justify-center gap-2
                hover:scale-105 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleProcess}
              disabled={isProcessing || selectedColors.length === 0}
              className="px-3 py-2 rounded-lg border-[2px] border-foreground font-bold text-xs
                bg-primary text-primary-foreground hover:bg-primary/90
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all hover:scale-105 active:scale-95"
            >
              {isProcessing ? "Processing..." : "Process"}
            </button>

            <button
              onClick={handleApply}
              disabled={!resultUrl}
              className="px-3 py-2 rounded-lg border-[2px] border-foreground font-bold text-xs
                bg-card hover:bg-muted
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all hover:scale-105 active:scale-95"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </DraggablePanel>
    </>
  )
}
