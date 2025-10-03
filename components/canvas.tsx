"use client"

import type React from "react"

import { useRef } from "react"
import { Upload } from "lucide-react"

interface CanvasProps {
  uploadedImage: string | null
  onImageUpload: (imageUrl: string) => void
}

export function Canvas({ uploadedImage, onImageUpload }: CanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string
        onImageUpload(imageUrl)
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
        const imageUrl = event.target?.result as string
        onImageUpload(imageUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <main className="flex-1 grid-background p-8 overflow-hidden">
      <div className="h-full flex items-center justify-center">
        {uploadedImage ? (
          <div className="brutalist-window max-w-4xl max-h-full">
            <div className="bg-secondary border-b-[3px] border-foreground px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-foreground"></div>
                <div className="w-2 h-2 bg-foreground"></div>
                <div className="w-2 h-2 bg-foreground"></div>
                <span className="font-semibold ml-2">Image: uploaded.jpg</span>
              </div>
              <button
                onClick={() => onImageUpload("")}
                className="w-6 h-6 border-[2px] border-foreground flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 bg-card">
              <img
                src={uploadedImage || "/placeholder.svg"}
                alt="Uploaded"
                className="max-w-full max-h-[60vh] object-contain border-[2px] border-foreground"
              />
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="brutalist-window w-96 h-64 cursor-pointer hover:border-accent transition-colors"
          >
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
              <Upload className="w-16 h-16" strokeWidth={2} />
              <div className="text-center">
                <p className="font-bold text-lg mb-2">Upload Image</p>
                <p className="text-sm text-muted-foreground">Click or drag and drop to upload</p>
              </div>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>
    </main>
  )
}
