"use client"

import { DraggablePanel } from "@/components/draggable-panel"
import { useImageStore, type OperationType } from "@/lib/image-store"
import {
  History,
  Check,
  Clock,
  Upload,
  FileCheck,
  ArrowUpCircle,
  Eraser,
  ArrowDownCircle,
  Droplet,
  Palette,
  Layers,
  Sparkles,
  Crop,
  ImageIcon,
} from "lucide-react"
import { useState } from "react"

interface HistoryPanelProps {
  onClose: () => void
  zIndex?: number
  isActive?: boolean
  onFocus?: () => void
}

export function HistoryPanel({ onClose, zIndex, isActive, onFocus }: HistoryPanelProps) {
  const { history, historyIndex, jumpToHistory, undo, redo, canUndo, canRedo } = useImageStore()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const handleJumpToState = (index: number) => {
    jumpToHistory(index)
  }

  const getOperationIcon = (operation?: OperationType) => {
    switch (operation) {
      case "upload":
        return Upload
      case "validator":
        return FileCheck
      case "upscaler":
        return ArrowUpCircle
      case "bg-remover":
        return Eraser
      case "downscaler":
        return ArrowDownCircle
      case "color-knockout":
        return Droplet
      case "recolor":
        return Palette
      case "blend":
        return Layers
      case "ai-edit":
        return Sparkles
      case "crop":
        return Crop
      default:
        return ImageIcon
    }
  }

  const getOperationColor = (operation?: OperationType) => {
    switch (operation) {
      case "upload":
        return "text-blue-500"
      case "upscaler":
        return "text-green-500"
      case "bg-remover":
        return "text-purple-500"
      case "recolor":
        return "text-pink-500"
      case "ai-edit":
        return "text-amber-500"
      default:
        return "text-foreground/60"
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    return `${hours}h ago`
  }

  return (
    <DraggablePanel
      title="History"
      onClose={onClose}
      icon={<History className="w-4 h-4" />}
      defaultPosition={{ x: window.innerWidth - 420, y: 80 }}
      defaultSize={{ width: 380, height: 600 }}
      zIndex={zIndex}
      isActive={isActive}
      onFocus={onFocus}
    >
      <div className="flex flex-col h-full p-3">
        {/* Quick Actions */}
        <div className="flex gap-2 mb-3 pb-3 border-b-[2px] border-foreground flex-shrink-0">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-card border-[2px] border-foreground rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-bold"
            style={{
              boxShadow: canUndo() ? "2px 2px 0px 0px hsl(var(--foreground) / 0.2)" : "none",
            }}
          >
            <span>← Undo</span>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-card border-[2px] border-foreground rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-bold"
            style={{
              boxShadow: canRedo() ? "2px 2px 0px 0px hsl(var(--foreground) / 0.2)" : "none",
            }}
          >
            <span>Redo →</span>
          </button>
        </div>

        {/* History Info */}
        <div className="mb-3 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-foreground/70 font-medium">
            {history.length} {history.length === 1 ? 'state' : 'states'}
          </div>
          <div className="text-xs text-foreground/50">
            Current: {historyIndex + 1}/{history.length}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-2 px-0.5">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-foreground/40 gap-3">
              <History className="w-12 h-12" />
              <p className="text-sm">No history yet</p>
              <p className="text-xs">Upload an image to start</p>
            </div>
          ) : (
            history.map((entry, index) => {
              const isCurrent = index === historyIndex
              const isPast = index < historyIndex
              const isFuture = index > historyIndex
              const isHovered = hoveredIndex === index

              return (
                <div
                  key={`${index}-${entry.timestamp}`}
                  className={`
                    relative group cursor-pointer rounded-lg border-[2px] transition-all
                    ${isCurrent
                      ? 'border-accent bg-accent/10'
                      : isPast
                        ? 'border-foreground/20 bg-background hover:border-accent/50 hover:bg-accent/5'
                        : 'border-foreground/10 bg-foreground/5 opacity-60 hover:opacity-100 hover:border-accent/30'
                    }
                  `}
                  style={{
                    boxShadow: isCurrent || isHovered ? "3px 3px 0px 0px hsl(var(--accent))" : "2px 2px 0px 0px hsl(var(--foreground) / 0.1)",
                  }}
                  onClick={() => handleJumpToState(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="p-1.5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-0.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Operation icon */}
                        {(() => {
                          const OperationIcon = getOperationIcon(entry.operation)
                          const colorClass = getOperationColor(entry.operation)
                          return (
                            <div className={`flex-shrink-0 ${isCurrent ? 'text-accent' : colorClass}`}>
                              <OperationIcon className="w-4 h-4" />
                            </div>
                          )
                        })()}

                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <div className={`
                            text-xs font-bold truncate
                            ${isCurrent ? 'text-accent' : 'text-foreground'}
                          `}>
                            {entry.description}
                          </div>
                          {entry.operation && (
                            <div className="text-[0.65rem] text-foreground/40 capitalize">
                              {entry.operation.replace('-', ' ')}
                            </div>
                          )}
                        </div>

                        {/* State indicator */}
                        {isCurrent && (
                          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-background" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image preview */}
                    {entry.imageUrl && (
                      <div className="mb-0.5 rounded-md overflow-hidden border-[2px] border-foreground relative">
                        <img
                          src={entry.imageUrl}
                          alt={entry.description}
                          className="w-full h-16 object-cover bg-foreground/5"
                        />
                        {/* Status badge overlay on image */}
                        {isCurrent && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-accent text-background text-[0.6rem] font-bold rounded-md shadow-lg">
                            CURRENT
                          </div>
                        )}
                        {isFuture && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-foreground/80 text-background text-[0.6rem] font-medium rounded-md shadow-lg">
                            FUTURE
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[0.65rem]">
                      <div className="flex items-center gap-0.5 text-foreground/50">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatTime(entry.timestamp)}</span>
                      </div>
                      <div className="text-foreground/40">
                        {formatRelativeTime(entry.timestamp)}
                      </div>
                    </div>

                    {/* Status badge - positioned to avoid image overlap */}
                    {isCurrent && !entry.imageUrl && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-accent text-background text-[0.6rem] font-bold rounded-md">
                        CURRENT
                      </div>
                    )}
                    {isFuture && !entry.imageUrl && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-foreground/20 text-foreground/60 text-[0.6rem] font-medium rounded-md">
                        FUTURE
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Info */}
        {history.length > 0 && (
          <div className="flex-shrink-0 mt-3 pt-3 border-t-[2px] border-foreground">
            <div className="text-xs text-foreground/50 text-center">
              Click any state to jump to it
            </div>
          </div>
        )}
      </div>
    </DraggablePanel>
  )
}
