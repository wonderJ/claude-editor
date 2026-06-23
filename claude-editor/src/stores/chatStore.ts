import { create } from 'zustand'

export type MessageRole = 'user' | 'assistant' | 'thinking'
export type AiModel = 'opus' | 'sonnet' | 'haiku'
export type AiProvider = 'claude' | 'codex'
export type ThinkingMode = 'off' | 'on' | 'extended'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  images?: string[] | undefined
  isStreaming?: boolean | undefined
  timestamp: number
  thinking?: string
  toolCalls?: ToolCall[]
  diffBlocks?: DiffBlock[]
}

export interface ToolCall {
  id: string
  type: 'read' | 'write' | 'edit' | 'bash' | 'search'
  status: 'pending' | 'running' | 'success' | 'error'
  description: string
  result?: string
}

export interface DiffBlock {
  id: string
  filePath: string
  oldCode: string
  newCode: string
  language: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  isFavorite?: boolean
}

interface ChatStore {
  // Current session
  messages: ChatMessage[]
  inputValue: string
  isLoading: boolean
  pendingImages: string[]
  mentionedFiles: string[]

  // Settings
  model: AiModel
  provider: AiProvider
  streamingEnabled: boolean
  thinkingMode: ThinkingMode

  // Session management
  sessions: ChatSession[]
  currentSessionId: string | null

  // Actions
  setInputValue: (value: string) => void
  setPendingImages: (images: string[]) => void
  addPendingImage: (image: string) => void
  removePendingImage: (index: number) => void
  addMentionedFile: (filePath: string) => void
  removeMentionedFile: (index: number) => void
  sendMessage: (content: string) => void
  sendImageMessage: (content: string, images: string[]) => void
  appendStream: (messageId: string, chunk: string) => void
  finishStream: (messageId: string) => void
  clearChat: () => void

  // Settings actions
  setModel: (model: AiModel) => void
  setProvider: (provider: AiProvider) => void
  setStreamingEnabled: (enabled: boolean) => void
  setThinkingMode: (mode: ThinkingMode) => void

  // Session actions
  createSession: () => string
  switchSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  toggleFavorite: (sessionId: string) => void
  exportSession: (sessionId: string, format: 'markdown' | 'json') => string
}

const generateId = () => 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
const generateSessionId = () => 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)

const createWelcomeMessage = (): ChatMessage => ({
  id: generateId(),
  role: 'assistant',
  content: 'Hello! I am Claude. How can I help you today?',
  timestamp: Date.now(),
})

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [createWelcomeMessage()],
  inputValue: '',
  isLoading: false,
  pendingImages: [],
  mentionedFiles: [],

  model: 'sonnet',
  provider: 'claude',
  streamingEnabled: true,
  thinkingMode: 'on',

  sessions: [],
  currentSessionId: null,

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

  addMentionedFile: (filePath) => {
    set((s) => {
      if (s.mentionedFiles.includes(filePath)) return s
      return { mentionedFiles: [...s.mentionedFiles, filePath] }
    })
  },

  removeMentionedFile: (index) => {
    set((s) => ({ mentionedFiles: s.mentionedFiles.filter((_, i) => i !== index) }))
  },

  sendMessage: (content) => {
    get().sendImageMessage(content, [])
  },

  sendImageMessage: (content, images) => {
    const { mentionedFiles, model, provider, streamingEnabled, thinkingMode } = get()

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      images: images.length > 0 ? images : undefined,
      timestamp: Date.now(),
    }

    const assistantId = generateId()
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
      mentionedFiles: [],
      isLoading: true,
    })

    // Send to CLI
    const { sendMessage: cliSend } = useCliStore.getState()
    cliSend({
      id: assistantId,
      type: images.length > 0 ? 'image' : 'message',
      content,
      images: images.length > 0 ? images : undefined,
      model,
      provider,
      streamingEnabled,
      thinkingMode,
      mentionedFiles,
    }).then((success) => {
      if (!success) {
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
      messages: [createWelcomeMessage()],
      inputValue: '',
      isLoading: false,
    })
  },

  setModel: (model) => set({ model }),
  setProvider: (provider) => set({ provider }),
  setStreamingEnabled: (enabled) => set({ streamingEnabled: enabled }),
  setThinkingMode: (mode) => set({ thinkingMode: mode }),

  createSession: () => {
    const id = generateSessionId()
    const session: ChatSession = {
      id,
      title: 'New Chat',
      messages: [createWelcomeMessage()],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set((s) => ({
      sessions: [...s.sessions, session],
      currentSessionId: id,
      messages: session.messages,
    }))
    return id
  },

  switchSession: (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId)
    if (session) {
      set({
        currentSessionId: sessionId,
        messages: session.messages,
      })
    }
  },

  deleteSession: (sessionId) => {
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== sessionId),
      currentSessionId: s.currentSessionId === sessionId ? null : s.currentSessionId,
    }))
  },

  toggleFavorite: (sessionId) => {
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === sessionId ? { ...sess, isFavorite: !sess.isFavorite } : sess
      ),
    }))
  },

  exportSession: (sessionId, format) => {
    const session = get().sessions.find((s) => s.id === sessionId)
    if (!session) return ''

    if (format === 'json') {
      return JSON.stringify(session, null, 2)
    }

    // Markdown format
    let md = `# ${session.title}\n\n`
    md += `Created: ${new Date(session.createdAt).toLocaleString()}\n\n`
    for (const msg of session.messages) {
      const role = msg.role === 'user' ? 'User' : 'Assistant'
      md += `## ${role}\n\n${msg.content}\n\n`
    }
    return md
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

// Import at bottom to avoid circular dependency
import { useCliStore } from './cliStore'
