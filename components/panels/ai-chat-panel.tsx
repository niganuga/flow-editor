"use client"

import { useEffect, useRef } from "react"
import { DraggablePanel } from "@/components/draggable-panel"
import { useMessageStore } from "@/lib/message-store"
import type { MessageType } from "@/types/message"
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react"

interface AIChatPanelProps {
  onClose: () => void
}

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  const { messages, isTyping, addMessage } = useMessageStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // Welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      addMessage(
        "info",
        "Hey! I'm your AI Design Partner. I'll help explain what's happening as you edit your images.",
        ["Upload an image to get started", "I'll provide real-time feedback on your edits"],
      )
    }
  }, [])

  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      case "processing":
        return <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      case "error":
        return <XCircle className="w-4 h-4 flex-shrink-0" />
      default:
        return <Sparkles className="w-4 h-4 flex-shrink-0" />
    }
  }

  const getMessageStyles = (type: MessageType) => {
    switch (type) {
      case "success":
        return "bg-[#4ADE80] text-black"
      case "processing":
        return "bg-[#FF8C42] text-white"
      case "warning":
        return "bg-[#FCD34D] text-black"
      case "error":
        return "bg-[#EF4444] text-white"
      default:
        return "bg-card text-foreground"
    }
  }

  return (
    <DraggablePanel
      title="AI Design Partner"
      icon={<Sparkles className="w-5 h-5" />}
      onClose={onClose}
      defaultPosition={{ x: 50, y: 100 }}
      defaultSize={{ width: 350, height: 600 }}
    >
      <div className="flex flex-col h-full">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3 animate-in slide-in-from-left duration-300">
              <div
                className={`flex-1 rounded-lg p-3 border-[3px] border-foreground ${getMessageStyles(message.type)}`}
                style={{
                  boxShadow: "4px 4px 0px 0px hsl(var(--foreground))",
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  {getMessageIcon(message.type)}
                  <p className="font-semibold text-sm leading-relaxed flex-1">{message.content}</p>
                </div>

                {message.details && message.details.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm opacity-90 pl-6">
                    {message.details.map((detail, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 animate-in slide-in-from-left duration-300">
              <div
                className="flex-1 rounded-lg p-3 border-[3px] border-foreground bg-card"
                style={{
                  boxShadow: "4px 4px 0px 0px hsl(var(--foreground))",
                }}
              >
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm opacity-70">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </DraggablePanel>
  )
}
