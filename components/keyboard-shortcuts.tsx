"use client"

import { useEffect } from "react"
import { useImageStore } from "@/lib/image-store"

export function KeyboardShortcuts() {
  const { undo, redo, canUndo, canRedo } = useImageStore()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }

      // Ctrl+Z / Cmd+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo()) {
          console.log('[Keyboard] Undo triggered')
          undo()
        }
      }

      // Ctrl+Y / Cmd+Y / Ctrl+Shift+Z / Cmd+Shift+Z - Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault()
        if (canRedo()) {
          console.log('[Keyboard] Redo triggered')
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, canUndo, canRedo])

  return null // No UI, just keyboard handling
}