"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Upload, ZoomIn, ZoomOut, Grid3x3, Square, Maximize2, Download } from "lucide-react"
import { DraggablePanel } from "./draggable-panel"
import { useImageStore } from "@/lib/image-store"
import { Button } from "@/components/ui/button"

interface CanvasProps {
  onClose: () => void
  zIndex?: number
  isActive?: boolean
  onFocus?: () => void
}

type BackgroundMode = "transparent" | "black" | "white"

export function Canvas({ onClose, zIndex = 30, isActive = true, onFocus }: CanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { imageUrl, imageName, setImage } = useImageStore()
  const [zoom, setZoom] = useState(100)
  const [background, setBackground] = useState<BackgroundMode>("transparent")
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const url = event.target?.result as string
        setImage(url, file, file.name, "upload")
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const url = event.target?.result as string
        setImage(url, file, file.name, "upload")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleReplaceClick = () => {
    fileInputRef.current?.click()
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 400))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25))
  }

  const handleResetView = () => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 100) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing'
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && zoom > 100) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    if (containerRef.current) {
      containerRef.current.style.cursor = zoom > 100 ? 'grab' : 'default'
    }
  }

  const handleMouseLeave = () => {
    if (isPanning) {
      setIsPanning(false)
      if (containerRef.current) {
        containerRef.current.style.cursor = zoom > 100 ? 'grab' : 'default'
      }
    }
  }

  const handleDownload = () => {
    if (!imageUrl || !imageName) return

    const link = document.createElement('a')
    link.href = imageUrl
    link.download = imageName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
      title={imageUrl ? `Image: ${imageName}` : "Canvas"}
      onClose={onClose}
      defaultPosition={{ x: 100, y: 100 }}
      defaultSize={{ width: 700, height: 500 }}
      zIndex={zIndex}
      isActive={isActive}
      onFocus={onFocus}
      className="border-[4px]"
      shadowStyle="10px 10px 0px 0px rgba(0, 0, 0, 1)"
    >
      {imageUrl ? (
        <div className="relative h-full">
          <div
            ref={containerRef}
            className="h-full flex items-center justify-center p-6 pb-24 overflow-hidden"
            style={{
              ...getBackgroundStyle(),
              cursor: zoom > 100 ? (isPanning ? 'grabbing' : 'grab') : 'default',
              userSelect: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <img
              src={imageUrl || "/placeholder.svg"}
              alt="Uploaded"
              className="object-contain pointer-events-none"
              style={{
                width: `${zoom}%`,
                height: `${zoom}%`,
                maxWidth: "none",
                maxHeight: "none",
                transform: `translate(${pan.x}px, ${pan.y}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out'
              }}
            />
          </div>

          {/* Bottom Controls - Centered */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-card border-2 border-foreground rounded-lg p-1 h-9">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomOut}
                disabled={zoom <= 25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-bold px-2 min-w-[3rem] text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomIn}
                disabled={zoom >= 400}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Reset View Button */}
            {(zoom !== 100 || pan.x !== 0 || pan.y !== 0) && (
              <div className="flex items-center gap-1 bg-card border-2 border-foreground rounded-lg p-1 h-9">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleResetView}
                  title="Reset View (100%)"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Background Toggle */}
            <div className="flex items-center gap-1 bg-card border-2 border-foreground rounded-lg p-1 h-9">
              <Button
                variant={background === "transparent" ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setBackground("transparent")}
                title="Transparent Grid"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={background === "white" ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setBackground("white")}
                title="White Background"
              >
                <Square className="h-4 w-4 fill-white stroke-foreground" />
              </Button>
              <Button
                variant={background === "black" ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setBackground("black")}
                title="Black Background"
              >
                <Square className="h-4 w-4 fill-black stroke-foreground" />
              </Button>
            </div>

            {/* Download Button */}
            <div className="flex items-center gap-1 bg-card border-2 border-foreground rounded-lg p-1 h-9">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDownload}
                title="Download Image"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {/* Replace File Button */}
            <div className="h-9 flex items-center">
              <Button variant="outline" className="brutalist-button h-full" onClick={handleReplaceClick}>
                Replace File
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          className="h-full flex flex-col items-center justify-center gap-4 p-8 cursor-pointer hover:bg-accent/10 transition-colors"
        >
          <Upload className="w-16 h-16" strokeWidth={2} />
          <div className="text-center">
            <p className="font-bold text-lg mb-2">Upload Image</p>
            <p className="text-sm text-muted-foreground mb-1">Click or drag and drop to upload</p>
            <p className="text-xs text-muted-foreground">PNG, JPEG, JPG, WEBP • Max 10MB</p>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </DraggablePanel>
  )
}
