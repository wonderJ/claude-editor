import { create } from 'zustand'

export type CliStatus = 'offline' | 'online' | 'thinking' | 'error'

export interface CliMessage {
  id: string
  type: 'message' | 'image'
  content: string
  images?: string[] | undefined
}

export interface CliResponse {
  type: 'text' | 'thinking' | 'error'
  content: string
  done: boolean
  messageId: string
}

interface CliStore {
  status: CliStatus
  lastError: string | null

  setStatus: (status: CliStatus) => void
  setError: (error: string) => void
  clearError: () => void

  startCli: () => Promise<boolean>
  stopCli: () => Promise<boolean>
  restartCli: () => Promise<boolean>
  sendMessage: (message: CliMessage) => Promise<boolean>
  getStatus: () => Promise<CliStatus>
}

export const useCliStore = create<CliStore>((set) => ({
  status: 'offline',
  lastError: null,

  setStatus: (status) => {
    set({ status })
  },

  setError: (error) => {
    set({ status: 'error', lastError: error })
  },

  clearError: () => {
    set({ lastError: null })
  },

  startCli: async () => {
    try {
      const result = await window.electronAPI?.cliStart()
      return result?.success ?? false
    } catch (err) {
      set({ status: 'error', lastError: String(err) })
      return false
    }
  },

  stopCli: async () => {
    try {
      const result = await window.electronAPI?.cliStop()
      return result?.success ?? false
    } catch (err) {
      set({ status: 'error', lastError: String(err) })
      return false
    }
  },

  restartCli: async () => {
    try {
      const result = await window.electronAPI?.cliRestart()
      return result?.success ?? false
    } catch (err) {
      set({ status: 'error', lastError: String(err) })
      return false
    }
  },

  sendMessage: async (message) => {
    try {
      const result = await window.electronAPI?.cliSend(message)
      return result?.success ?? false
    } catch (err) {
      set({ status: 'error', lastError: String(err) })
      return false
    }
  },

  getStatus: async () => {
    try {
      const result = await window.electronAPI?.cliStatus()
      const status = (result?.status as CliStatus | undefined) ?? 'offline'
      set({ status })
      return status
    } catch (err) {
      set({ status: 'error', lastError: String(err) })
      return 'error'
    }
  },
}))
