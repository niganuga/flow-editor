import { create } from "zustand"

export type OperationType =
  | "upload"
  | "validator"
  | "upscaler"
  | "bg-remover"
  | "downscaler"
  | "color-knockout"
  | "recolor"
  | "blend"
  | "ai-edit"
  | "crop"
  | "manual"

interface HistoryEntry {
  imageUrl: string
  imageFile: File
  fileName: string
  description: string
  timestamp: number
  operation?: OperationType
}

interface ImageState {
  // Existing state
  imageUrl: string | null
  imageFile: File | null
  imageName: string | null

  // History tracking
  history: HistoryEntry[]
  historyIndex: number
  maxHistorySize: number

  // Existing actions
  setImage: (url: string, file: File, name: string, operation?: OperationType) => void
  clearImage: () => void

  // History actions
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  addToHistory: (description: string, operation?: OperationType) => void
  jumpToHistory: (index: number) => void
}

export const useImageStore = create<ImageState>((set, get) => ({
  // Existing state
  imageUrl: null,
  imageFile: null,
  imageName: null,

  // History state
  history: [],
  historyIndex: -1,
  maxHistorySize: 20, // Keep last 20 states

  // Enhanced setImage to track history
  setImage: (url, file, name, operation = 'manual') => {
    const state = get()

    const newEntry = {
      imageUrl: url,
      imageFile: file,
      fileName: name,
      description: name || 'State change',
      timestamp: Date.now(),
      operation,
    }

    if (state.history.length === 0) {
      // First image - initialize history
      console.log('[History] Initializing with first image:', name)
      set({
        imageUrl: url,
        imageFile: file,
        imageName: name,
        history: [newEntry],
        historyIndex: 0,
      })
    } else {
      // Remove any "future" history if we're not at the end (for redo branch pruning)
      const newHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        newEntry
      ]

      // Limit history size
      const trimmedHistory = newHistory.slice(-state.maxHistorySize)

      console.log('[History] Adding new state:', name, '- Total states:', trimmedHistory.length, '- Index:', trimmedHistory.length - 1)

      set({
        imageUrl: url,
        imageFile: file,
        imageName: name,
        history: trimmedHistory,
        historyIndex: trimmedHistory.length - 1,
      })
    }
  },

  // Add to history with custom description
  addToHistory: (description: string, operation = 'manual' as OperationType) => {
    const state = get()

    if (!state.imageUrl || !state.imageFile) return

    const newHistory = [
      ...state.history.slice(0, state.historyIndex + 1),
      {
        imageUrl: state.imageUrl,
        imageFile: state.imageFile,
        fileName: state.imageName || 'image.png',
        description,
        timestamp: Date.now(),
        operation,
      }
    ]

    const trimmedHistory = newHistory.slice(-state.maxHistorySize)

    set({
      history: trimmedHistory,
      historyIndex: trimmedHistory.length - 1,
    })
  },

  // Undo action
  undo: () => {
    const state = get()

    if (!state.canUndo()) return

    const prevIndex = state.historyIndex - 1
    const prevEntry = state.history[prevIndex]

    if (prevEntry) {
      console.log(`[History] Undo to: ${prevEntry.description}`)

      set({
        imageUrl: prevEntry.imageUrl,
        imageFile: prevEntry.imageFile,
        imageName: prevEntry.fileName,
        historyIndex: prevIndex,
      })
    }
  },

  // Redo action
  redo: () => {
    const state = get()

    if (!state.canRedo()) return

    const nextIndex = state.historyIndex + 1
    const nextEntry = state.history[nextIndex]

    if (nextEntry) {
      console.log(`[History] Redo to: ${nextEntry.description}`)

      set({
        imageUrl: nextEntry.imageUrl,
        imageFile: nextEntry.imageFile,
        imageName: nextEntry.fileName,
        historyIndex: nextIndex,
      })
    }
  },

  // Jump to specific history point
  jumpToHistory: (index: number) => {
    const state = get()
    const targetEntry = state.history[index]

    if (targetEntry && index >= 0 && index < state.history.length) {
      console.log(`[History] Jump to: ${targetEntry.description}`)

      set({
        imageUrl: targetEntry.imageUrl,
        imageFile: targetEntry.imageFile,
        imageName: targetEntry.fileName,
        historyIndex: index,
      })
    }
  },

  // Check if undo is available
  canUndo: () => {
    const state = get()
    return state.historyIndex > 0
  },

  // Check if redo is available
  canRedo: () => {
    const state = get()
    return state.historyIndex < state.history.length - 1
  },

  // Clear image and history
  clearImage: () => set({
    imageUrl: null,
    imageFile: null,
    imageName: null,
    history: [],
    historyIndex: -1,
  }),
}))