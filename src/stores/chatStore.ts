import { create } from 'zustand'
import { useCliStore } from './cliStore'

export type MessageRole = 'user' | 'assistant' | 'thinking'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  images?: string[]
  isStreaming?: boolean
  timestamp: number
}

interface ChatStore {
  messages: ChatMessage[]
  inputValue: string
  isLoading: boolean
  pendingImages: string[]

  setInputValue: (value: string) => void
  setPendingImages: (images: string[]) => void
  addPendingImage: (image: string) => void
  removePendingImage: (index: number) => void
  sendMessage: (content: string) => void
  sendImageMessage: (content: string, images: string[]) => void
  appendStream: (messageId: string, chunk: string) => void
  finishStream: (messageId: string) => void
  clearChat: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am Claude. How can I help you today?',
      timestamp: Date.now(),
    },
  ],
  inputValue: '',
  isLoading: false,
  pendingImages: [],

  setInputValue: (value) => {
    set({ inputValue: value })
  },

  setPendingImages: (images) => {
    set({ pendingImages: images })
  },

  addPendingImage: (image) => {
    set((s) => ({ pendingImages: [...s.pendingImages, image] }))
  },

  removePendingImage: (index) => {
    set((s) => ({ pendingImages: s.pendingImages.filter((_, i) => i !== index) }))
  },

  sendMessage: (content) => {
    get().sendImageMessage(content, [])
  },

  sendImageMessage: (content, images) => {
    const userMsg: ChatMessage = {
      id: 'user-' + String(Date.now()),
      role: 'user',
      content,
      images: images.length > 0 ? images : undefined,
      timestamp: Date.now(),
    }

    const assistantId = 'assistant-' + String(Date.now())

    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    }

    set({
      messages: [...get().messages, userMsg, assistantMsg],
      inputValue: '',
      pendingImages: [],
      isLoading: true,
    })

    // Send to CLI
    const cliStore = useCliStore.getState()
    cliStore.sendMessage({
      id: assistantId,
      type: images.length > 0 ? 'image' : 'message',
      content,
      images: images.length > 0 ? images : undefined,
    }).then((success) => {
      if (!success) {
        // Fallback to simulation if CLI not available
        simulateStream(assistantId, content, set)
      }
    }).catch(() => {
      simulateStream(assistantId, content, set)
    })
  },

  appendStream: (messageId, chunk) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, content: m.content + chunk } : m
      ),
    }))
  },

  finishStream: (messageId) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, isStreaming: false } : m
      ),
      isLoading: false,
    }))
  },

  clearChat: () => {
    set({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I am Claude. How can I help you today?',
          timestamp: Date.now(),
        },
      ],
      inputValue: '',
      isLoading: false,
    })
  },
}))

function simulateStream(
  assistantId: string,
  content: string,
  set: (fn: (s: ChatStore) => Partial<ChatStore>) => void
): void {
  const responseText = simulateResponse(content)
  let idx = 0
  const interval = setInterval(() => {
    if (idx >= responseText.length) {
      clearInterval(interval)
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        ),
        isLoading: false,
      }))
      return
    }
    const chunk = responseText.slice(idx, idx + 3)
    idx += 3
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === assistantId ? { ...m, content: m.content + chunk } : m
      ),
    }))
  }, 50)
}

function simulateResponse(userContent: string): string {
  const lower = userContent.toLowerCase()
  if (lower.includes('code') || lower.includes('function') || lower.includes('bug')) {
    return `I can help you with that code. Let me analyze the issue:\n\n\`\`\`typescript\nfunction analyzeCode(input: string): string {\n  const result = input.trim().toLowerCase();\n  return result || 'empty';\n}\n\`\`\`\n\nThe problem seems to be in the input validation. Make sure you handle edge cases like null or undefined values before processing.`
  }
  if (lower.includes('hello') || lower.includes('hi')) {
    return 'Hello! Nice to meet you. I am Claude, an AI assistant made by Anthropic. How can I help you today?'
  }
  if (lower.includes('image') || lower.includes('picture') || lower.includes('photo')) {
    return 'I can see the image you shared. It looks like a screenshot of code. Let me analyze it for you...\n\nThe code structure looks good overall. There are a few improvements I would suggest:'
  }
  return `I understand your question about "${userContent.slice(0, 30)}...". Let me think through this step by step.\n\nBased on my analysis, here is what I found:\n\n1. First, consider the context and requirements\n2. Then, evaluate possible approaches\n3. Finally, implement the most suitable solution\n\nWould you like me to elaborate on any of these points?`
}
