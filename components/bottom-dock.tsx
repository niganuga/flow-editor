"use client"

import {
  FileCheck,
  ArrowUpCircle,
  Eraser,
  Crop,
  ArrowDownCircle,
  Droplet,
  Palette,
  Layers,
  Sparkles,
} from "lucide-react"
import type { Tool } from "@/app/page"
import { useState } from "react"

interface BottomDockProps {
  activeTool: Tool | null
  onToolClick: (tool: Tool) => void
}

const tools = [
  { id: "validator" as Tool, icon: FileCheck, label: "File Validator" },
  { id: "upscaler" as Tool, icon: ArrowUpCircle, label: "Upscaler" },
  { id: "bg-remover" as Tool, icon: Eraser, label: "BG Remover" },
  { id: "cropper" as Tool, icon: Crop, label: "Cropper" },
  { id: "downscaler" as Tool, icon: ArrowDownCircle, label: "Downscaler" },
  { id: "color-knockout" as Tool, icon: Droplet, label: "Color Knockout" },
  { id: "recolor" as Tool, icon: Palette, label: "Recolor" },
  { id: "blend" as Tool, icon: Layers, label: "Blend+Texture" },
  { id: "ai-chat" as Tool, icon: Sparkles, label: "AI Chat" },
]

export function BottomDock({ activeTool, onToolClick }: BottomDockProps) {
  const [hoveredTool, setHoveredTool] = useState<Tool | null>(null)

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div
        className="rounded-2xl p-3 bg-card border-[4px] border-foreground"
        style={{ boxShadow: "8px 8px 0px 0px rgba(0, 0, 0, 1)" }}
      >
        <div className="flex gap-3">
          {tools.map((tool) => {
            const Icon = tool.icon
            const isActive = activeTool === tool.id
            const isHovered = hoveredTool === tool.id

            return (
              <div key={tool.id} className="relative">
                {isHovered && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-foreground text-background rounded-lg border-[3px] border-foreground whitespace-nowrap font-bold text-sm"
                    style={{ boxShadow: "4px 4px 0px 0px rgba(0, 0, 0, 1)" }}
                  >
                    {tool.label}
                  </div>
                )}
                <button
                  onClick={() => onToolClick(tool.id)}
                  onMouseEnter={() => setHoveredTool(tool.id)}
                  onMouseLeave={() => setHoveredTool(null)}
                  className={`
                    rounded-xl w-14 h-14 flex items-center justify-center
                    border-[3px] border-foreground transition-all duration-100
                    ${isActive ? "bg-accent text-accent-foreground" : "bg-card"}
                  `}
                  style={{
                    boxShadow: "4px 4px 0px 0px rgba(0, 0, 0, 1)",
                    backgroundColor: isHovered && !isActive ? "#FF8C42" : undefined,
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = "translate(2px, 2px)"
                    e.currentTarget.style.boxShadow = "2px 2px 0px 0px rgba(0, 0, 0, 1)"
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = ""
                    e.currentTarget.style.boxShadow = "4px 4px 0px 0px rgba(0, 0, 0, 1)"
                  }}
                >
                  <Icon
                    className="w-6 h-6"
                    strokeWidth={2.5}
                    style={{ color: isHovered && !isActive ? "white" : undefined }}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
