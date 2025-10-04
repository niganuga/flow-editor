"use client"

import { create } from "zustand"
import type { Message, MessageType } from "@/types/message"

interface MessageStore {
  messages: Message[]
  isTyping: boolean
  addMessage: (type: MessageType, content: string, details?: string[], metadata?: Record<string, any>) => void
  setTyping: (isTyping: boolean) => void
  clearMessages: () => void
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  isTyping: false,

  addMessage: (type, content, details, metadata) => {
    const message: Message = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date(),
      details,
      metadata,
    }

    set((state) => ({
      messages: [...state.messages, message],
      isTyping: false,
    }))
  },

  setTyping: (isTyping) => set({ isTyping }),

  clearMessages: () => set({ messages: [] }),
}))
