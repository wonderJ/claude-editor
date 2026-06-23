import { create } from 'zustand'

interface AppState {
  sidebarVisible: boolean
  sidebarWidth: number
  terminalVisible: boolean
  terminalHeight: number
  toggleSidebar: () => void
  toggleTerminal: () => void
  setSidebarWidth: (width: number) => void
  setTerminalHeight: (height: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarVisible: true,
  sidebarWidth: 250,
  terminalVisible: true,
  terminalHeight: 200,
  toggleSidebar: () => {
    set((s) => ({ sidebarVisible: !s.sidebarVisible }))
  },
  toggleTerminal: () => {
    set((s) => ({ terminalVisible: !s.terminalVisible }))
  },
  setSidebarWidth: (width) => {
    set({ sidebarWidth: width })
  },
  setTerminalHeight: (height) => {
    set({ terminalHeight: height })
  },
}))
