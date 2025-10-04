"use client"

import type React from "react"
import { useRef } from "react"
import { Upload } from "lucide-react"
import { DraggablePanel } from "./draggable-panel"
import { useImageStore } from "@/lib/image-store"

interface CanvasProps {
  onClose: () => void
}

export function Canvas({ onClose }: CanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { imageUrl, imageName, setImage } = useImageStore()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const url = event.target?.result as string
        setImage(url, file, file.name)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const url = event.target?.result as string
        setImage(url, file, file.name)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <DraggablePanel
      title={imageUrl ? `Image: ${imageName}` : "Canvas"}
      onClose={onClose}
      defaultPosition={{ x: 100, y: 100 }}
      defaultSize={{ width: 700, height: 600 }}
    >
      {imageUrl ? (
        <div className="h-full flex items-center justify-center p-6 bg-card overflow-auto">
          <img
            src={imageUrl || "/placeholder.svg"}
            alt="Uploaded"
            className="max-w-full max-h-full object-contain border-[3px] border-foreground"
            style={{
              boxShadow: "4px 4px 0 rgba(0, 0, 0, 1)",
            }}
          />
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="h-full flex flex-col items-center justify-center gap-4 p-8 cursor-pointer hover:bg-accent/10 transition-colors"
        >
          <Upload className="w-16 h-16" strokeWidth={2} />
          <div className="text-center">
            <p className="font-bold text-lg mb-2">Upload Image</p>
            <p className="text-sm text-muted-foreground">Click or drag and drop to upload</p>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </DraggablePanel>
  )
}
