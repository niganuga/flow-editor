"use client"

import { useState, useCallback, useEffect } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { useImageStore } from "@/lib/image-store"
import { useMessageStore } from "@/lib/message-store"
import { recolorImage, detectColorRegion, type BlendMode, type ColorRegion } from "@/lib/tools/recolor"
import { rgbToHex, rgbToHsl } from "@/lib/color-utils"
import { Download, ZoomIn, ZoomOut, Grid3x3, Square, Pipette, ArrowRight } from "lucide-react"
import { pickColorFromImage } from "@/lib/tools/color-knockout"

interface RecolorPanelProps {
  onClose: () => void
  zIndex?: number
  isActive?: boolean
  onFocus?: () => void
}

type BackgroundMode = "transparent" | "black" | "white"

export function RecolorPanel({ onClose, zIndex, isActive, onFocus }: RecolorPanelProps) {
  const { imageUrl, setImage } = useImageStore()
  const { addMessage } = useMessageStore()

  // Simplified state: single region instead of multiple mappings
  const [selectedRegion, setSelectedRegion] = useState<ColorRegion | null>(null)
  const [currentSourceColor, setCurrentSourceColor] = useState<{ r: number; g: number; b: number; hex: string } | null>(null)
  const [replacementColor, setReplacementColor] = useState<string>("#ffffff")
  const [blendMode, setBlendMode] = useState<BlendMode>("replace")
  const [tolerance, setTolerance] = useState<number>(30)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPicking, setIsPicking] = useState<'source' | 'target' | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [zoom, setZoom] = useState(100)
  const [background, setBackground] = useState<BackgroundMode>("transparent")
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number } | null>(null)
  const [magnifierColor, setMagnifierColor] = useState<string>("#000000")
  const [magnifierCoords, setMagnifierCoords] = useState<{ x: number; y: number } | null>(null)
  const [magnifierCanvas, setMagnifierCanvas] = useState<string | null>(null)
  const [imageDataCache, setImageDataCache] = useState<ImageData | null>(null)
  const [canvasForMagnifier, setCanvasForMagnifier] = useState<HTMLCanvasElement | null>(null)

  // No longer using EyeDropper API - using click-based color picking instead

  // Pre-load image data when picking starts
  useEffect(() => {
    if (isPicking && imageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      // Always use the original imageUrl for the main preview, not resultUrl
      // The recolor preview will use resultUrl if available
      img.src = imageUrl

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return

        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        setImageDataCache(imageData)
        setCanvasForMagnifier(canvas)
      }
    } else {
      setImageDataCache(null)
      setCanvasForMagnifier(null)
    }
  }, [isPicking, imageUrl])

  const handleScreenClick = useCallback(async (e: React.MouseEvent) => {
    if (!isPicking) return

    e.preventDefault()
    e.stopPropagation()

    const pickMode = isPicking
    console.log(`=== RECOLOR: Picking ${pickMode} color ===`)

    try {
      const x = e.clientX
      const y = e.clientY

      console.log("RECOLOR: Click position:", { x, y })

      // Use imageUrl directly since we have it in state
      if (!imageUrl) {
        addMessage("error", "No image loaded")
        setIsPicking(null)
        return
      }

      console.log("RECOLOR: Using image from state:", imageUrl)

      // Find the preview container to calculate relative position
      const element = document.elementFromPoint(x, y)
      console.log("RECOLOR: Element at point:", element?.tagName)

      if (!element) {
        addMessage("error", "Please click on the preview area")
        setIsPicking(null)
        return
      }

      // Find the preview image element - check both main preview and recolor panel preview
      let imgElement = document.querySelector('img[alt="Preview"]') as HTMLImageElement

      // If not found or click not on main preview, try recolor panel preview
      const recolorPreview = document.querySelector('.recolor-preview-image') as HTMLImageElement

      if (!imgElement && !recolorPreview) {
        addMessage("error", "Preview image not found")
        setIsPicking(null)
        return
      }

      // Determine which image was clicked
      let rect: DOMRect
      let clickedElement: HTMLImageElement

      if (imgElement) {
        const mainRect = imgElement.getBoundingClientRect()
        const relX = x - mainRect.left
        const relY = y - mainRect.top

        // Check if click is within main preview bounds
        if (relX >= 0 && relY >= 0 && relX <= mainRect.width && relY <= mainRect.height) {
          clickedElement = imgElement
          rect = mainRect
        } else if (recolorPreview) {
          // Try recolor preview
          const recolorRect = recolorPreview.getBoundingClientRect()
          const relXRecolor = x - recolorRect.left
          const relYRecolor = y - recolorRect.top

          if (relXRecolor >= 0 && relYRecolor >= 0 && relXRecolor <= recolorRect.width && relYRecolor <= recolorRect.height) {
            clickedElement = recolorPreview
            rect = recolorRect
          } else {
            addMessage("error", "Please click on the image")
            setIsPicking(null)
            return
          }
        } else {
          addMessage("error", "Please click on the image")
          setIsPicking(null)
          return
        }
      } else {
        // Only recolor preview exists
        clickedElement = recolorPreview!
        rect = recolorPreview!.getBoundingClientRect()
        const relX = x - rect.left
        const relY = y - rect.top

        if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) {
          addMessage("error", "Please click on the image")
          setIsPicking(null)
          return
        }
      }

      console.log("RECOLOR: Found preview image element")

      const relX = x - rect.left
      const relY = y - rect.top

      // Calculate the actual displayed dimensions (accounting for object-contain)
      const imgAspect = clickedElement.naturalWidth / clickedElement.naturalHeight
      const containerAspect = rect.width / rect.height

      let displayWidth = rect.width
      let displayHeight = rect.height
      let offsetX = 0
      let offsetY = 0

      if (imgAspect > containerAspect) {
        // Image is wider - fit to width, add top/bottom padding
        displayHeight = rect.width / imgAspect
        offsetY = (rect.height - displayHeight) / 2
      } else {
        // Image is taller - fit to height, add left/right padding
        displayWidth = rect.height * imgAspect
        offsetX = (rect.width - displayWidth) / 2
      }

      // Adjust for the offset caused by object-contain
      const adjustedX = relX - offsetX
      const adjustedY = relY - offsetY

      // Check if we're within the actual image bounds
      if (adjustedX < 0 || adjustedY < 0 || adjustedX > displayWidth || adjustedY > displayHeight) {
        addMessage("error", "Please click on the image area")
        setIsPicking(null)
        return
      }

      // Map to image coordinates
      const imgX = Math.floor((adjustedX / displayWidth) * clickedElement.naturalWidth)
      const imgY = Math.floor((adjustedY / displayHeight) * clickedElement.naturalHeight)

      console.log("RECOLOR: Detecting region at pixel:", { imgX, imgY, adjustedX, adjustedY, offsetX, offsetY })

      // Create canvas to get ImageData for region detection
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = imageUrl

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Failed to get canvas context')

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Detect color region with user-specified tolerance
      const region = detectColorRegion(imageData, imgX, imgY, tolerance)
      console.log("RECOLOR: Detected region:", region)

      const pickedColor = {
        ...region.averageColor,
        hex: rgbToHex(region.averageColor)
      }

      if (pickMode === 'source') {
        // Picking the color to change
        setSelectedRegion(region)
        setCurrentSourceColor(pickedColor)
        addMessage("success", `Source color picked: ${pickedColor.hex} (${region.pixelCount.toLocaleString()} pixels)`)
      } else if (pickMode === 'target') {
        // Picking the color to change to
        setReplacementColor(pickedColor.hex)
        addMessage("success", `Target color picked: ${pickedColor.hex}`)
      }

      setIsPicking(null)
    } catch (error) {
      console.error("RECOLOR: Region detection error:", error)
      addMessage("error", error instanceof Error ? error.message : "Failed to detect region")
      setIsPicking(null)
    }
  }, [isPicking, addMessage, imageUrl, tolerance])

  // Handle mouse move to update magnifier
  const handleMouseMoveForMagnifier = useCallback((e: MouseEvent) => {
    if (!isPicking || !imageUrl || !imageDataCache || !canvasForMagnifier) return

    setMagnifierPos({ x: e.clientX, y: e.clientY })

    // Sample color at cursor position
    const element = document.elementFromPoint(e.clientX, e.clientY)
    if (!element) return

    // Check if hovering over an image
    let imgElement = document.querySelector('img[alt="Preview"]') as HTMLImageElement
    const recolorPreview = document.querySelector('.recolor-preview-image') as HTMLImageElement

    let targetImg: HTMLImageElement | null = null
    let rect: DOMRect | null = null
    let isMainPreview = false

    if (imgElement) {
      const imgRect = imgElement.getBoundingClientRect()
      const relX = e.clientX - imgRect.left
      const relY = e.clientY - imgRect.top
      if (relX >= 0 && relY >= 0 && relX <= imgRect.width && relY <= imgRect.height) {
        targetImg = imgElement
        rect = imgRect
        isMainPreview = true
      }
    }

    if (!targetImg && recolorPreview) {
      const recolorRect = recolorPreview.getBoundingClientRect()
      const relX = e.clientX - recolorRect.left
      const relY = e.clientY - recolorRect.top
      if (relX >= 0 && relY >= 0 && relX <= recolorRect.width && relY <= recolorRect.height) {
        targetImg = recolorPreview
        rect = recolorRect
        isMainPreview = false
      }
    }

    if (targetImg && rect && imageDataCache) {
      // Sample color from cached image data
      try {
        const relX = e.clientX - rect.left
        const relY = e.clientY - rect.top

        // Calculate the actual displayed dimensions (accounting for object-contain)
        const imgAspect = targetImg.naturalWidth / targetImg.naturalHeight
        const containerAspect = rect.width / rect.height

        let displayWidth = rect.width
        let displayHeight = rect.height
        let offsetX = 0
        let offsetY = 0

        if (imgAspect > containerAspect) {
          // Image is wider - fit to width, add top/bottom padding
          displayHeight = rect.width / imgAspect
          offsetY = (rect.height - displayHeight) / 2
        } else {
          // Image is taller - fit to height, add left/right padding
          displayWidth = rect.height * imgAspect
          offsetX = (rect.width - displayWidth) / 2
        }

        // Adjust for the offset caused by object-contain
        const adjustedX = relX - offsetX
        const adjustedY = relY - offsetY

        // Check if we're within the actual image bounds
        if (adjustedX < 0 || adjustedY < 0 || adjustedX > displayWidth || adjustedY > displayHeight) {
          // Outside image bounds (in the padding area)
          setMagnifierCoords(null)
          setMagnifierCanvas(null)
          return
        }

        // Map to image coordinates
        const imgX = Math.floor((adjustedX / displayWidth) * targetImg.naturalWidth)
        const imgY = Math.floor((adjustedY / displayHeight) * targetImg.naturalHeight)

        // Clamp to image bounds
        const clampedX = Math.max(0, Math.min(imgX, imageDataCache.width - 1))
        const clampedY = Math.max(0, Math.min(imgY, imageDataCache.height - 1))

        // Store coordinates
        setMagnifierCoords({ x: clampedX, y: clampedY })

        // Sample from cached image data
        const index = (clampedY * imageDataCache.width + clampedX) * 4
        const r = imageDataCache.data[index]
        const g = imageDataCache.data[index + 1]
        const b = imageDataCache.data[index + 2]
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        setMagnifierColor(hex)

        // Create magnified view (15x15 pixels area, magnified 6x to fill ~90px circle)
        const magnifierSize = 96 // Size of the magnifier circle
        const sampleSize = 15 // Number of pixels to sample (15x15 area)
        const magnification = magnifierSize / sampleSize

        // Create a temporary canvas for the magnified view
        const magCanvas = document.createElement('canvas')
        magCanvas.width = magnifierSize
        magCanvas.height = magnifierSize
        const magCtx = magCanvas.getContext('2d', { willReadFrequently: true })
        if (!magCtx) return

        // Calculate the area to extract (centered on cursor)
        const halfSample = Math.floor(sampleSize / 2)
        const srcX = Math.max(0, clampedX - halfSample)
        const srcY = Math.max(0, clampedY - halfSample)
        const srcWidth = Math.min(sampleSize, imageDataCache.width - srcX)
        const srcHeight = Math.min(sampleSize, imageDataCache.height - srcY)

        // Draw magnified pixels
        magCtx.imageSmoothingEnabled = false // Pixelated look
        magCtx.drawImage(
          canvasForMagnifier,
          srcX, srcY, srcWidth, srcHeight,
          0, 0, magnifierSize, magnifierSize
        )

        setMagnifierCanvas(magCanvas.toDataURL())
      } catch (error) {
        console.error('Failed to sample color:', error)
      }
    }
  }, [isPicking, imageUrl, imageDataCache, canvasForMagnifier])

  // Attach global click and mousemove listeners when picking
  useEffect(() => {
    if (isPicking) {
      document.addEventListener('click', handleScreenClick as any)
      document.addEventListener('mousemove', handleMouseMoveForMagnifier)
      document.body.style.cursor = 'none' // Hide default cursor

      return () => {
        document.removeEventListener('click', handleScreenClick as any)
        document.removeEventListener('mousemove', handleMouseMoveForMagnifier)
        document.body.style.cursor = 'default'
        setMagnifierPos(null)
        setMagnifierCanvas(null)
        setMagnifierCoords(null)
      }
    }
    return undefined
  }, [isPicking, handleScreenClick, handleMouseMoveForMagnifier])

  const handleStartPicking = (mode: 'source' | 'target') => {
    setIsPicking(mode)
  }

  const handleApplyToCanvas = async () => {
    if (!imageUrl || !selectedRegion) {
      addMessage("warning", "Please select a color region first")
      return
    }

    setIsProcessing(true)
    addMessage("info", "Recoloring image...")

    try {
      // Create single mapping for the detected region
      const mappingsMap = new Map<number, string>()
      mappingsMap.set(0, replacementColor)

      const hsl = rgbToHsl(selectedRegion.averageColor.r, selectedRegion.averageColor.g, selectedRegion.averageColor.b)
      const category: "light" | "mid" | "dark" = hsl.l > 70 ? "light" : hsl.l < 30 ? "dark" : "mid"
      const palette = [{
        hex: rgbToHex(selectedRegion.averageColor),
        rgb: selectedRegion.averageColor,
        hsl,
        percentage: selectedRegion.coverage,
        name: "",
        category,
        prominence: selectedRegion.coverage / 100,
        pixelCount: selectedRegion.pixelCount
      }]

      const blob = await recolorImage(
        imageUrl,
        palette,
        {
          colorMappings: mappingsMap,
          blendMode,
          tolerance, // Use user-specified tolerance for consistent coverage
          preserveTransparency: true,
        },
        (progress, message) => {
          console.log(`${progress}%: ${message}`)
        }
      )

      // Apply directly to canvas
      const url = URL.createObjectURL(blob)
      const file = new File([blob], "recolored.png", { type: "image/png" })
      setImage(url, file, "recolored.png")

      // Update preview
      setResultUrl(url)
      setResultBlob(blob)

      addMessage("success", "Recolor applied to canvas!")

      // Close panel after successful application
      onClose()
    } catch (error) {
      console.error("Recolor error:", error)
      addMessage("error", "Failed to recolor image")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!resultUrl) return

    const link = document.createElement("a")
    link.href = resultUrl
    link.download = "recolored.png"
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
      {/* Fullscreen color picker message */}
      {isPicking && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary text-primary-foreground rounded-lg border-2 border-foreground font-bold text-sm pointer-events-none z-50">
          {isPicking === 'source' ? 'Click to pick color to change' : 'Click to pick replacement color'}
        </div>
      )}

      {/* Magnifier cursor */}
      {isPicking && magnifierPos && (
        <div
          className="fixed pointer-events-none z-[60]"
          style={{
            left: magnifierPos.x,
            top: magnifierPos.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Outer circle with crosshairs */}
          <div className="relative">
            {/* Main magnifier circle */}
            <div
              className="w-24 h-24 rounded-full border-4 border-foreground shadow-2xl relative overflow-hidden bg-muted"
            >
              {/* Magnified image */}
              {magnifierCanvas ? (
                <img
                  src={magnifierCanvas}
                  alt="Magnified view"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="absolute inset-0" style={{ backgroundColor: magnifierColor }} />
              )}

              {/* Crosshair lines */}
              <div className="absolute left-1/2 top-0 w-[2px] h-full bg-white/90 -translate-x-1/2 shadow-sm" style={{ mixBlendMode: 'difference' }} />
              <div className="absolute top-1/2 left-0 h-[2px] w-full bg-white/90 -translate-y-1/2 shadow-sm" style={{ mixBlendMode: 'difference' }} />

              {/* Center dot */}
              <div className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg" style={{ mixBlendMode: 'difference' }} />
            </div>

            {/* Color info label */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-foreground text-background rounded text-xs font-mono font-bold whitespace-nowrap space-y-0.5">
              <div>{magnifierColor}</div>
              {magnifierCoords && (
                <div className="text-[10px] text-background/70">
                  x:{magnifierCoords.x} y:{magnifierCoords.y}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DraggablePanel
        defaultPosition={{ x: 420, y: 70 }}
        defaultSize={{ width: 360, height: 550 }}
        title="Recolor"
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
                    src={resultUrl || imageUrl}
                    alt="Preview"
                    className="object-contain pointer-events-none recolor-preview-image"
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

          {/* Content */}
          <div className="flex-shrink-0 space-y-3">
            {/* Pick Color Button */}
            <button
              onClick={() => handleStartPicking('source')}
              disabled={!imageUrl || isPicking === 'source'}
              className={`w-full px-3 py-2 rounded-lg border-[2px] border-foreground font-bold text-xs
                ${isPicking === 'source' ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}
                disabled:opacity-50 disabled:cursor-not-allowed transition-all
                flex items-center justify-center gap-2 hover:scale-105 active:scale-95`}
            >
              <Pipette className="w-3.5 h-3.5" />
              {isPicking === 'source' ? "Picking color..." : "Pick Color to Change"}
            </button>

            {/* Current Color Selection with Region Info */}
            {currentSourceColor && selectedRegion && (
              <div className="p-2 rounded-lg border-[2px] border-foreground bg-card space-y-2">
                {/* Color swatches side by side */}
                <div className="flex items-stretch gap-2">
                  {/* Source color */}
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-muted-foreground mb-1 block uppercase tracking-wide">
                      Original
                    </label>
                    <div
                      className="w-full h-14 rounded border-[2px] border-foreground shadow-sm"
                      style={{
                        backgroundColor: currentSourceColor.hex,
                        minHeight: '3.5rem',
                        width: '100%'
                      }}
                      title={currentSourceColor.hex}
                    />
                    <div className="text-[9px] font-mono font-bold text-center mt-0.5 text-muted-foreground">
                      {currentSourceColor.hex}
                    </div>
                  </div>

                  <div className="flex items-center justify-center px-1 pt-5">
                    <ArrowRight className="w-4 h-4 text-primary" strokeWidth={3} />
                  </div>

                  {/* Replacement color */}
                  <div className="flex-1 relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                        Change to
                      </label>
                      <button
                        onClick={() => handleStartPicking('target')}
                        disabled={isPicking === 'target'}
                        className={`p-0.5 rounded border border-foreground ${isPicking === 'target' ? "bg-primary text-primary-foreground" : "hover:bg-muted"} disabled:opacity-50 transition-all`}
                        title="Pick color from image"
                      >
                        <Pipette className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="relative">
                      <div
                        className="w-full h-14 rounded border-[2px] border-foreground shadow-sm cursor-pointer"
                        style={{
                          backgroundColor: replacementColor,
                          minHeight: '3.5rem',
                          width: '100%'
                        }}
                        title="Click to choose color"
                      />
                      <input
                        type="color"
                        value={replacementColor}
                        onChange={(e) => setReplacementColor(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Click to choose color"
                      />
                    </div>
                    <div className="text-[9px] font-mono font-bold text-center mt-0.5 text-primary">
                      {replacementColor}
                    </div>
                  </div>
                </div>

                {/* Region Info */}
                <div className="pt-1.5 border-t border-foreground/20">
                  <div className="text-[10px] font-bold text-center text-muted-foreground">
                    <span className="inline-block mr-1">Region:</span>
                    <span className="text-primary">{selectedRegion.pixelCount.toLocaleString()}</span>
                    <span className="mx-1">pixels</span>
                    <span className="mx-1">•</span>
                    <span className="text-primary">{selectedRegion.coverage.toFixed(1)}%</span>
                    <span className="mx-1">coverage</span>
                    <span className="mx-1">•</span>
                    <span className="text-primary">{selectedRegion.confidence}%</span>
                    <span className="mx-1">confidence</span>
                  </div>
                </div>
              </div>
            )}

            {/* Settings - Tolerance and Blend mode */}
            {selectedRegion && (
              <div className="space-y-2.5 pt-2 border-t-[2px] border-foreground">
                {/* Tolerance slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold">Tolerance</label>
                    <span className="text-[10px] font-mono font-bold text-primary">{tolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground font-bold">
                    <span>Precise</span>
                    <span>Aggressive</span>
                  </div>
                </div>

                {/* Blend mode */}
                <div className="space-y-1">
                  <label className="text-xs font-bold">Blend Mode</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["replace", "overlay", "multiply"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setBlendMode(mode)}
                        className={`px-2 py-1.5 rounded-md border-[2px] border-foreground text-[10px] font-bold
                          ${blendMode === mode ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}
                          transition-all capitalize hover:scale-105 active:scale-95`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 mt-3 pt-3 border-t-[2px] border-foreground space-y-1.5 pb-3">
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

            <button
              onClick={handleApplyToCanvas}
              disabled={isProcessing || !selectedRegion}
              className="w-full px-3 py-2 rounded-lg border-[2px] border-foreground font-bold text-xs
                bg-primary text-primary-foreground hover:bg-primary/90
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all hover:scale-105 active:scale-95"
            >
              {isProcessing ? "Processing..." : "Apply to Canvas"}
            </button>
          </div>
        </div>
      </DraggablePanel>
    </>
  )
}
