import { create } from 'zustand'

interface HistoryStore {
  openPath: string | null
  openName: string | null
  open: (path: string, name: string) => void
  close: () => void
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  openPath: null,
  openName: null,
  open: (path, name) => { set({ openPath: path, openName: name }) },
  close: () => { set({ openPath: null, openName: null }) },
}))
