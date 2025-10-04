export type MessageType = "info" | "success" | "warning" | "error" | "processing"

export interface Message {
  id: number
  type: MessageType
  content: string
  timestamp: Date
  metadata?: Record<string, any>
  details?: string[]
}
