"use client"

import { useState } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { Button } from "@/components/ui/button"

interface UpscalerPanelProps {
  onClose: () => void
  imageUrl: string | null
}

export function UpscalerPanel({ onClose, imageUrl }: UpscalerPanelProps) {
  const [scale, setScale] = useState<2 | 4 | 8>(2)
  const [fidelity, setFidelity] = useState(70)

  return (
    <DraggablePanel title="Upscaler" onClose={onClose} defaultPosition={{ x: 150, y: 150 }}>
      <div className="p-8 space-y-6">
        <div className="space-y-4">
          <label className="font-bold text-base">Scale Factor</label>
          <div className="flex gap-3">
            {[2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => setScale(s as 2 | 4 | 8)}
                className={`
                  brutalist-button flex-1 py-4 font-bold text-lg
                  ${scale === s ? "brutalist-button-active" : "bg-card hover:bg-secondary"}
                `}
              >
                ×{s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="font-bold text-base">Fidelity</label>
            <span className="font-mono text-base font-bold">{fidelity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={fidelity}
            onChange={(e) => setFidelity(Number(e.target.value))}
            className="w-full h-4 border-[3px] border-foreground bg-secondary appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 
              [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-foreground
              [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:bg-accent 
              [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-foreground [&::-moz-range-thumb]:rounded-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="brutalist-button flex-1 py-4 font-bold bg-card hover:bg-secondary"
            disabled={!imageUrl}
          >
            Preview
          </Button>
          <Button className="brutalist-button flex-1 py-4 font-bold brutalist-button-active" disabled={!imageUrl}>
            Apply
          </Button>
        </div>
      </div>
    </DraggablePanel>
  )
}
