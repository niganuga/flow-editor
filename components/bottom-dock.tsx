"use client"

import {
  FileCheck,
  ArrowUpCircle,
  Eraser,
  ArrowDownCircle,
  Droplet,
  Palette,
  Layers,
  Sparkles,
  History,
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
  { id: "downscaler" as Tool, icon: ArrowDownCircle, label: "Downscaler" },
  { id: "color-knockout" as Tool, icon: Droplet, label: "Color Knockout" },
  { id: "recolor" as Tool, icon: Palette, label: "Recolor" },
  { id: "blend" as Tool, icon: Layers, label: "Texture+Cut" },
  { id: "ai-chat" as Tool, icon: Sparkles, label: "AI Chat" },
  { id: "history" as Tool, icon: History, label: "History" },
]

export function BottomDock({ activeTool, onToolClick }: BottomDockProps) {
  const [hoveredTool, setHoveredTool] = useState<Tool | null>(null)

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-2">
      <div
        className="rounded-xl p-1.5 md:p-2 bg-card border-[2px] md:border-[3px] border-foreground mx-auto"
        style={{ boxShadow: "3px 3px 0px 0px rgba(0, 0, 0, 1)" }}
      >
        <div className="flex gap-1 md:gap-1.5 flex-wrap justify-center">
          {tools.map((tool) => {
            const Icon = tool.icon
            const isActive = activeTool === tool.id
            const isHovered = hoveredTool === tool.id

            return (
              <div key={tool.id} className="relative">
                {isHovered && (
                  <div
                    className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background rounded-md border-[2px] border-foreground whitespace-nowrap font-semibold text-xs"
                    style={{ boxShadow: "2px 2px 0px 0px rgba(0, 0, 0, 1)" }}
                  >
                    {tool.label}
                  </div>
                )}
                <button
                  onClick={() => onToolClick(tool.id)}
                  onMouseEnter={() => setHoveredTool(tool.id)}
                  onMouseLeave={() => setHoveredTool(null)}
                  className={`
                    rounded-lg w-9 h-9 md:w-10 md:h-10 flex items-center justify-center
                    border-[2px] border-foreground transition-all duration-100
                    ${isActive ? "bg-accent text-accent-foreground" : "bg-card"}
                  `}
                  style={{
                    boxShadow: "2px 2px 0px 0px rgba(0, 0, 0, 1)",
                    backgroundColor: isHovered && !isActive ? "#9333ea" : undefined,
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = "translate(1px, 1px)"
                    e.currentTarget.style.boxShadow = "1px 1px 0px 0px rgba(0, 0, 0, 1)"
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = ""
                    e.currentTarget.style.boxShadow = "2px 2px 0px 0px rgba(0, 0, 0, 1)"
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = "translate(1px, 1px)"
                    e.currentTarget.style.boxShadow = "1px 1px 0px 0px rgba(0, 0, 0, 1)"
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = ""
                    e.currentTarget.style.boxShadow = "2px 2px 0px 0px rgba(0, 0, 0, 1)"
                  }}
                >
                  <Icon
                    className="w-4 h-4 md:w-5 md:h-5"
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
