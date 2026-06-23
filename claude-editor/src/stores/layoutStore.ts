import { create } from 'zustand'

interface LayoutState {
  // Sidebar
  sidebarVisible: boolean
  sidebarWidth: number
  sidebarCollapsed: boolean
  setSidebarWidth: (width: number) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Terminal
  terminalVisible: boolean
  terminalHeight: number
  terminalCollapsed: boolean
  setTerminalHeight: (height: number) => void
  toggleTerminal: () => void
  setTerminalCollapsed: (collapsed: boolean) => void

  // Chat panel
  chatVisible: boolean
  chatWidth: number
  setChatWidth: (width: number) => void
  toggleChat: () => void

  // Status bar
  statusMessage: string
  cursorLine: number
  cursorColumn: number
  encoding: string
  setStatus: (status: { message?: string; line?: number; column?: number; encoding?: string }) => void
}

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 400
const SIDEBAR_COLLAPSED_WIDTH = 40
const DEFAULT_SIDEBAR_WIDTH = 250

const MIN_TERMINAL_HEIGHT = 150
const DEFAULT_TERMINAL_HEIGHT = 200
const TERMINAL_COLLAPSED_HEIGHT = 32

const MIN_CHAT_WIDTH = 300
const MAX_CHAT_WIDTH = 500
const DEFAULT_CHAT_WIDTH = 350

export const useLayoutStore = create<LayoutState>((set, get) => ({
  sidebarVisible: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  sidebarCollapsed: false,
  setSidebarWidth: (width) => {
    const w = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width))
    set({ sidebarWidth: w, sidebarCollapsed: false })
  },
  toggleSidebar: () => {
    const { sidebarVisible } = get()
    set({ sidebarVisible: !sidebarVisible })
  },
  setSidebarCollapsed: (collapsed) => {
    if (collapsed) {
      set({ sidebarCollapsed: true, sidebarWidth: SIDEBAR_COLLAPSED_WIDTH })
    } else {
      set({ sidebarCollapsed: false, sidebarWidth: DEFAULT_SIDEBAR_WIDTH })
    }
  },

  terminalVisible: true,
  terminalHeight: DEFAULT_TERMINAL_HEIGHT,
  terminalCollapsed: false,
  setTerminalHeight: (height) => {
    const h = Math.max(MIN_TERMINAL_HEIGHT, height)
    set({ terminalHeight: h, terminalCollapsed: false })
  },
  toggleTerminal: () => {
    const { terminalVisible } = get()
    set({ terminalVisible: !terminalVisible })
  },
  setTerminalCollapsed: (collapsed) => {
    if (collapsed) {
      set({ terminalCollapsed: true, terminalHeight: TERMINAL_COLLAPSED_HEIGHT })
    } else {
      set({ terminalCollapsed: false, terminalHeight: DEFAULT_TERMINAL_HEIGHT })
    }
  },

  chatVisible: false,
  chatWidth: DEFAULT_CHAT_WIDTH,
  setChatWidth: (width) => {
    const w = Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, width))
    set({ chatWidth: w })
  },
  toggleChat: () => {
    const { chatVisible } = get()
    set({ chatVisible: !chatVisible })
  },

  statusMessage: 'Ready',
  cursorLine: 1,
  cursorColumn: 1,
  encoding: 'UTF-8',
  setStatus: (status) => {
    set((s) => ({ ...s, ...status }))
  },
}))
