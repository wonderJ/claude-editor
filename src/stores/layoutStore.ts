import { create } from 'zustand'

interface LayoutState {
  // Sidebar
  sidebarVisible: boolean
  sidebarWidth: number
  sidebarCollapsed: boolean
  sidebarPanel: 'files' | 'commit' | 'git'
  setSidebarWidth: (width: number) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarPanel: (panel: 'files' | 'commit' | 'git') => void

  // Terminal
  terminalVisible: boolean
  terminalHeight: number
  terminalCollapsed: boolean
  setTerminalHeight: (height: number) => void
  toggleTerminal: () => void
  setTerminalCollapsed: (collapsed: boolean) => void
  setTerminalVisible: (visible: boolean) => void

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

export const useLayoutStore = create<LayoutState>((set, get) => ({
  sidebarVisible: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  sidebarCollapsed: false,
  sidebarPanel: 'files',
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
  setSidebarPanel: (panel) => {
    set({ sidebarPanel: panel })
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
      // Preserve terminalHeight so the PTY/xterm dimensions stay stable while
      // hidden; the panel visually collapses via CSS, without resizing the shell.
      set({ terminalCollapsed: true })
    } else {
      const { terminalHeight } = get()
      const nextHeight = terminalHeight <= TERMINAL_COLLAPSED_HEIGHT ? DEFAULT_TERMINAL_HEIGHT : terminalHeight
      set({ terminalCollapsed: false, terminalHeight: nextHeight })
    }
  },

  setTerminalVisible: (visible) => {
    set({ terminalVisible: visible })
  },

  statusMessage: 'Ready',
  cursorLine: 1,
  cursorColumn: 1,
  encoding: 'UTF-8',
  setStatus: (status) => {
    set((s) => ({ ...s, ...status }))
  },
}))
