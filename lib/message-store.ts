"use client"

import { create } from "zustand"
import type { Message, MessageType } from "@/types/message"

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface MessageStore {
  messages: Message[]
  conversationHistory: ConversationMessage[]
  isTyping: boolean
  selectedModel: 'claude-sonnet-4.5' | 'gemini-2.5-pro'
  addMessage: (type: MessageType, content: string, details?: string[], metadata?: Record<string, any>) => void
  addToConversation: (role: 'user' | 'assistant', content: string) => void
  setTyping: (isTyping: boolean) => void
  setSelectedModel: (model: 'claude-sonnet-4.5' | 'gemini-2.5-pro') => void
  clearMessages: () => void
}

let messageIdCounter = 0

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  conversationHistory: [],
  isTyping: false,
  selectedModel: 'claude-sonnet-4.5',

  addMessage: (type, content, details, metadata) => {
    const message: Message = {
      id: Date.now() + messageIdCounter++,
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

  addToConversation: (role, content) => {
    set((state) => ({
      conversationHistory: [...state.conversationHistory, { role, content }],
    }))
  },

  setTyping: (isTyping) => set({ isTyping }),

  setSelectedModel: (model) => set({ selectedModel: model }),

  clearMessages: () => set({ messages: [], conversationHistory: [] }),
}))
