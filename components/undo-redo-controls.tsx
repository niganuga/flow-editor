"use client"

import { useImageStore } from "@/lib/image-store"
import { Undo2, Redo2, History } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export function UndoRedoControls() {
  const { undo, redo, canUndo, canRedo, history, historyIndex, jumpToHistory } = useImageStore()
  const [showHistory, setShowHistory] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowHistory(false)
      }
    }

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showHistory])

  const hasHistory = history.length > 0

  return (
    <div className="flex items-center gap-2">
      {/* Undo Button */}
      <button
        onClick={undo}
        disabled={!canUndo()}
        className="flex items-center gap-1 px-3 py-2 bg-background border-2 border-foreground/20 rounded-xl hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        style={{
          boxShadow: canUndo() ? "2px 2px 0px 0px hsl(var(--foreground) / 0.2)" : "none",
        }}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">Undo</span>
      </button>

      {/* Redo Button */}
      <button
        onClick={redo}
        disabled={!canRedo()}
        className="flex items-center gap-1 px-3 py-2 bg-background border-2 border-foreground/20 rounded-xl hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        style={{
          boxShadow: canRedo() ? "2px 2px 0px 0px hsl(var(--foreground) / 0.2)" : "none",
        }}
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">Redo</span>
      </button>

      {/* History Dropdown */}
      {hasHistory && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 px-3 py-2 bg-background border-2 border-foreground/20 rounded-xl hover:bg-foreground/5 transition-all"
            style={{
              boxShadow: "2px 2px 0px 0px hsl(var(--foreground) / 0.2)",
            }}
            title="History"
          >
            <History className="w-4 h-4" />
            <span className="text-xs text-foreground/60">
              {historyIndex + 1}/{history.length}
            </span>
          </button>

          {showHistory && (
            <div className="absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto bg-background border-2 border-foreground/20 rounded-xl shadow-lg z-50">
              <div className="p-2">
                <div className="text-xs font-semibold text-foreground/70 mb-2 px-2">
                  History ({history.length} states)
                </div>
                <div className="space-y-1">
                  {history.map((entry, index) => (
                    <div
                      key={`${index}-${entry.timestamp}`}
                      className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-all ${
                        index === historyIndex
                          ? 'bg-foreground text-background font-semibold'
                          : 'hover:bg-foreground/10 text-foreground'
                      }`}
                      onClick={() => {
                        jumpToHistory(index)
                        setShowHistory(false)
                      }}
                    >
                      <div className="font-medium">{entry.description}</div>
                      <div className={index === historyIndex ? 'text-background/70' : 'text-foreground/50'}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}