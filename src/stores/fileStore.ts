import { create } from 'zustand'

export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  children?: FileNode[] | undefined
  expanded?: boolean | undefined
  selected?: boolean | undefined
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface FileStore {
  rootPath: string | null
  files: FileNode[]
  selectedPath: string | null
  expandedPaths: Set<string>
  isLoading: boolean
  toasts: Toast[]

  setRootPath: (path: string | null) => void
  setFiles: (files: FileNode[]) => void
  toggleExpanded: (path: string) => void
  setSelected: (path: string | null) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  refresh: () => void
}

let refreshTimeout: ReturnType<typeof setTimeout> | null = null

export const useFileStore = create<FileStore>((set, get) => ({
  rootPath: null,
  files: [],
  selectedPath: null,
  expandedPaths: new Set(),
  isLoading: false,
  toasts: [],

  setRootPath: (path) => {
    set({ rootPath: path, files: [], selectedPath: null, expandedPaths: new Set() })
    if (path) {
      get().refresh()
    }
  },

  setFiles: (files) => {
    set({ files })
  },

  toggleExpanded: (path) => {
    const { expandedPaths } = get()
    const next = new Set(expandedPaths)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
    }
    set({ expandedPaths: next })
  },

  setSelected: (path) => {
    set({ selectedPath: path })
  },

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    const duration = toast.duration ?? (toast.type === 'success' ? 3000 : 5000)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      get().removeToast(id)
    }, duration)
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  refresh: () => {
    const { rootPath } = get()
    if (!rootPath) return

    if (refreshTimeout) {
      clearTimeout(refreshTimeout)
    }
    refreshTimeout = setTimeout(() => {
      void loadDirectory(rootPath, get().setFiles, get().addToast)
    }, 100)
  },
}))

async function loadDirectory(
  dirPath: string,
  setFiles: (files: FileNode[]) => void,
  addToast: (toast: Omit<Toast, 'id'>) => void
): Promise<void> {
  if (!window.electronAPI) {
    addToast({ message: 'Electron API not available', type: 'error' })
    return
  }

  const result = await window.electronAPI.readDir(dirPath)
  if ('error' in result) {
    addToast({ message: `Failed to read directory: ${result.error}`, type: 'error' })
    return
  }

  const entries = Array.isArray(result) ? result : []
  const sorted = entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })

  const nodes: FileNode[] = sorted.map((entry) => ({
    name: entry.name,
    path: entry.path,
    isDirectory: entry.isDirectory,
    isFile: entry.isFile,
    children: entry.isDirectory ? [] : undefined,
    expanded: false,
    selected: false,
  }))

  setFiles(nodes)
}
