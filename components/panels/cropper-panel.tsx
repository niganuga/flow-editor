"use client"

import { useState } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { Button } from "@/components/ui/button"

interface CropperPanelProps {
  onClose: () => void
  imageUrl: string | null
  zIndex?: number
  isActive?: boolean
  onFocus?: () => void
}

export function CropperPanel({ onClose, imageUrl, zIndex, isActive, onFocus }: CropperPanelProps) {
  const [aspectRatio, setAspectRatio] = useState<string>("free")

  const ratios = [
    { value: "free", label: "Free" },
    { value: "1:1", label: "1:1" },
    { value: "4:3", label: "4:3" },
    { value: "16:9", label: "16:9" },
  ]

  return (
    <DraggablePanel title="Cropper" onClose={onClose} defaultPosition={{ x: 250, y: 250 }} zIndex={zIndex} isActive={isActive} onFocus={onFocus}>
      <div className="p-8 space-y-6">
        <div className="space-y-4">
          <label className="font-bold text-base">Aspect Ratio</label>
          <div className="grid grid-cols-2 gap-3">
            {ratios.map((ratio) => (
              <button
                key={ratio.value}
                onClick={() => setAspectRatio(ratio.value)}
                className={`
                  brutalist-button py-4 font-bold text-base
                  ${aspectRatio === ratio.value ? "brutalist-button-active" : "bg-card hover:bg-secondary"}
                `}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-[3px] border-foreground p-6 bg-secondary/30">
          <p className="text-base text-center text-muted-foreground font-semibold">Crop preview area</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="brutalist-button flex-1 py-4 font-bold bg-card hover:bg-secondary"
            disabled={!imageUrl}
          >
            Reset
          </Button>
          <Button className="brutalist-button flex-1 py-4 font-bold brutalist-button-active" disabled={!imageUrl}>
            Apply Crop
          </Button>
        </div>
      </div>
    </DraggablePanel>
  )
}
