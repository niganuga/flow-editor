/**
 * Image Preview Modal Component
 *
 * Full-screen modal for previewing images with zoom, pan, and download capabilities.
 * Used for viewing AI-generated edits and mockups in detail.
 *
 * @module components/image-preview-modal
 */

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  X,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Move,
  RotateCw,
  Info,
} from "lucide-react"

// ============================================================
// INTERFACES
// ============================================================

interface ImagePreviewModalProps {
  /** Image URL to preview */
  imageUrl: string

  /** Modal title */
  title?: string

  /** Image metadata to display */
  metadata?: {
    width?: number
    height?: number
    format?: string
    size?: number
    type?: 'edit' | 'mockup'
    product?: string
  }

  /** Whether modal is open */
  isOpen: boolean

  /** Close handler */
  onClose: () => void

  /** Optional apply handler (for edits) */
  onApply?: () => void

  /** Whether to show apply button */
  showApply?: boolean

  /** Custom class name */
  className?: string
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ImagePreviewModal({
  imageUrl,
  title = "Image Preview",
  metadata,
  isOpen,
  onClose,
  onApply,
  showApply = false,
  className = "",
}: ImagePreviewModalProps) {
  // State
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1)
      setRotation(0)
      setPosition({ x: 0, y: 0 })
      setImageLoaded(false)
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
        case '_':
          handleZoomOut()
          break
        case 'r':
          handleRotate()
          break
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleDownload()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.5))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  // Rotation handler
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
  }, [])

  // Download handler
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `${metadata?.type || 'image'}_${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }, [imageUrl, metadata])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5))
  }, [])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left click
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }, [position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Image load handler
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    })
    setImageLoaded(true)
  }, [])

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm ${className}`}
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-background/95 border-b border-foreground/10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            {metadata && (
              <div className="flex items-center gap-3 text-sm text-foreground/60">
                {metadata.type && (
                  <span className="px-2 py-1 bg-foreground/10 rounded">
                    {metadata.type === 'edit' ? '✏️ Edit' : '🎨 Mockup'}
                  </span>
                )}
                {metadata.product && (
                  <span className="px-2 py-1 bg-foreground/10 rounded">
                    {metadata.product}
                  </span>
                )}
                {imageDimensions.width > 0 && (
                  <span>{imageDimensions.width} × {imageDimensions.height}px</span>
                )}
                {metadata.size && (
                  <span>{(metadata.size / 1024).toFixed(1)} KB</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {showApply && onApply && (
              <button
                onClick={onApply}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>Apply to Canvas</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div
          className="flex-1 relative overflow-hidden bg-checkered"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* Loading State */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                <span className="text-sm text-foreground/60">Loading image...</span>
              </div>
            </div>
          )}

          {/* Image */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt={title}
            onLoad={handleImageLoad}
            className="absolute top-1/2 left-1/2 max-w-none select-none"
            style={{
              transform: `
                translate(-50%, -50%)
                translate(${position.x}px, ${position.y}px)
                scale(${zoom})
                rotate(${rotation}deg)
              `,
              transition: isDragging ? 'none' : 'transform 0.2s',
              opacity: imageLoaded ? 1 : 0,
            }}
            draggable={false}
          />
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between p-4 bg-background/95 border-t border-foreground/10">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-3 py-1 hover:bg-foreground/10 rounded-lg transition-colors text-sm font-medium"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Center Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
              title="Rotate (R)"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
              title="Fit to Screen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
              title="Download (Ctrl+D)"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          {/* Info */}
          <div className="flex items-center gap-2 text-xs text-foreground/60">
            <Info className="w-4 h-4" />
            <span>Scroll to zoom • Drag to pan • R to rotate</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STYLES
// ============================================================

// Add checkered background pattern CSS
const checkeredStyles = `
  .bg-checkered {
    background-image:
      linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
      linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
      linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  }

  @media (prefers-color-scheme: dark) {
    .bg-checkered {
      background-image:
        linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
        linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
        linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
    }
  }
`

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('image-preview-modal-styles')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'image-preview-modal-styles'
  styleSheet.textContent = checkeredStyles
  document.head.appendChild(styleSheet)
}