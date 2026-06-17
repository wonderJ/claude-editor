import { create } from 'zustand'

export type MessageRole = 'user' | 'assistant' | 'thinking'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  isStreaming?: boolean
  timestamp: number
}

interface ChatStore {
  messages: ChatMessage[]
  inputValue: string
  isLoading: boolean

  setInputValue: (value: string) => void
  sendMessage: (content: string) => void
  appendStream: (messageId: string, chunk: string) => void
  finishStream: (messageId: string) => void
  clearChat: () => void
}

let streamInterval: ReturnType<typeof setInterval> | null = null

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

  setInputValue: (value) => {
    set({ inputValue: value })
  },

  sendMessage: (content) => {
    const userMsg: ChatMessage = {
      id: 'user-' + String(Date.now()),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    const thinkingMsg: ChatMessage = {
      id: 'thinking-' + String(Date.now()),
      role: 'thinking',
      content: 'Analyzing your request...',
      isStreaming: true,
      timestamp: Date.now(),
    }

    set({
      messages: [...get().messages, userMsg, thinkingMsg],
      inputValue: '',
      isLoading: true,
    })

    // Simulate thinking delay then stream response
    setTimeout(() => {
      const assistantId = 'assistant-' + String(Date.now())
      const responseText = simulateResponse(content)
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: Date.now(),
      }

      set((s) => ({
        messages: s.messages.filter((m) => m.role !== 'thinking').concat(assistantMsg),
        isLoading: true,
      }))

      let idx = 0
      streamInterval = setInterval(() => {
        if (idx >= responseText.length) {
          if (streamInterval) {
            clearInterval(streamInterval)
            streamInterval = null
          }
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
    }, 800)
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
