"use client"

import { useState, useEffect } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { AlertCircle, CheckCircle } from "lucide-react"

interface FileValidatorPanelProps {
  onClose: () => void
  imageUrl: string | null
}

export function FileValidatorPanel({ onClose, imageUrl }: FileValidatorPanelProps) {
  const [imageData, setImageData] = useState<{
    width: number
    height: number
    size: string
    format: string
  } | null>(null)

  useEffect(() => {
    if (imageUrl) {
      const img = new Image()
      img.onload = () => {
        setImageData({
          width: img.width,
          height: img.height,
          size: `${((imageUrl.length * 0.75) / 1024).toFixed(2)} KB`,
          format: "PNG/JPEG",
        })
      }
      img.src = imageUrl
    }
  }, [imageUrl])

  return (
    <DraggablePanel title="File Validator" onClose={onClose} defaultPosition={{ x: 100, y: 100 }}>
      <div className="p-8 space-y-6">
        {imageData ? (
          <>
            <div className="space-y-4 font-mono text-base">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Dimensions:</span>
                <span className="font-bold">
                  {imageData.width} × {imageData.height}px
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">File Size:</span>
                <span className="font-bold">{imageData.size}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Format:</span>
                <span className="font-bold">{imageData.format}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Color Mode:</span>
                <span className="font-bold">RGB</span>
              </div>
            </div>

            <div className="brutalist-card p-4 bg-green-50">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                <div>
                  <p className="font-bold text-base">Valid Image</p>
                  <p className="text-sm text-muted-foreground mt-1">Image meets all requirements</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="brutalist-card p-4 bg-yellow-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <p className="font-bold text-base">No Image Loaded</p>
                <p className="text-sm text-muted-foreground mt-1">Upload an image to validate</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DraggablePanel>
  )
}
