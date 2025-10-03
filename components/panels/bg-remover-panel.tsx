"use client"

import { useState } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { Button } from "@/components/ui/button"

interface BgRemoverPanelProps {
  onClose: () => void
  imageUrl: string | null
}

export function BgRemoverPanel({ onClose, imageUrl }: BgRemoverPanelProps) {
  const [mode, setMode] = useState<"object" | "portrait" | "auto">("auto")
  const [feather, setFeather] = useState(50)

  return (
    <DraggablePanel title="Background Remover" onClose={onClose} defaultPosition={{ x: 200, y: 200 }}>
      <div className="p-8 space-y-6">
        <div className="space-y-4">
          <label className="font-bold text-base">Detection Mode</label>
          <div className="space-y-3">
            {[
              { value: "object", label: "Object" },
              { value: "portrait", label: "Portrait" },
              { value: "auto", label: "Auto" },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-4 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                  className="w-6 h-6 border-[3px] border-foreground appearance-none checked:bg-accent cursor-pointer"
                />
                <span className="font-semibold text-base">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="font-bold text-base">Edge Feather</label>
            <span className="font-mono text-base font-bold">{feather}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={feather}
            onChange={(e) => setFeather(Number(e.target.value))}
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
            Remove BG
          </Button>
        </div>
      </div>
    </DraggablePanel>
  )
}
