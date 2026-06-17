import { create } from 'zustand'

export interface TerminalTab {
  id: string
  name: string
  cwd: string
  history: string[]
  historyIndex: number
}

export interface TerminalSettings {
  fontSize: number
  fontFamily: string
  cursorStyle: 'block' | 'bar' | 'underline'
  cursorBlink: boolean
  theme: 'dark' | 'light'
}

interface TerminalStore {
  tabs: TerminalTab[]
  activeTabId: string | null
  settings: TerminalSettings

  addTab: (cwd?: string) => string
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  renameTab: (id: string, name: string) => void
  updateTabCwd: (id: string, cwd: string) => void
  addHistory: (id: string, command: string) => void
  cycleHistory: (id: string, direction: 'up' | 'down') => string | null
  updateSettings: (settings: Partial<TerminalSettings>) => void
}

const DEFAULT_SETTINGS: TerminalSettings = {
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  cursorStyle: 'block',
  cursorBlink: true,
  theme: 'dark',
}

function generateId(): string {
  return 'term-' + String(Date.now()) + '-' + String(Math.random()).slice(2, 6)
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  settings: DEFAULT_SETTINGS,

  addTab: (cwd) => {
    const id = generateId()
    const tab: TerminalTab = {
      id,
      name: 'Terminal ' + String(get().tabs.length + 1),
      cwd: cwd || '',
      history: [],
      historyIndex: -1,
    }
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }))
    return id
  },

  removeTab: (id) => {
    set((s) => {
      const newTabs = s.tabs.filter((t) => t.id !== id)
      let newActiveId = s.activeTabId
      if (s.activeTabId === id) {
        newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1]!.id : null
      }
      return { tabs: newTabs, activeTabId: newActiveId }
    })
  },

  setActiveTab: (id) => {
    set({ activeTabId: id })
  },

  renameTab: (id, name) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, name } : t)),
    }))
  },

  updateTabCwd: (id, cwd) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, cwd } : t)),
    }))
  },

  addHistory: (id, command) => {
    if (!command.trim()) return
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? { ...t, history: [...t.history, command.trim()], historyIndex: -1 }
          : t
      ),
    }))
  },

  cycleHistory: (id, direction) => {
    const tab = get().tabs.find((t) => t.id === id)
    if (!tab || tab.history.length === 0) return null

    let newIndex = tab.historyIndex
    if (direction === 'up') {
      newIndex = newIndex === -1 ? tab.history.length - 1 : Math.max(0, newIndex - 1)
    } else {
      newIndex = newIndex === -1 ? -1 : Math.min(tab.history.length - 1, newIndex + 1)
      if (newIndex === tab.history.length - 1) newIndex = -1
    }

    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, historyIndex: newIndex } : t)),
    }))

    return newIndex === -1 ? '' : tab.history[newIndex] ?? ''
  },

  updateSettings: (settings) => {
    set((s) => ({ settings: { ...s.settings, ...settings } }))
  },
}))
