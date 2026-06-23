import { create } from 'zustand'

export interface EditorTab {
  path: string
  name: string
  content: string
  originalContent: string
  language: string
  isModified: boolean
  isReadOnly: boolean
}

interface EditorStore {
  tabs: EditorTab[]
  activeTabPath: string | null
  isLoading: boolean

  openTab: (path: string, name: string, content: string) => void
  closeTab: (path: string) => void
  switchTab: (path: string) => void
  updateContent: (path: string, content: string) => void
  markSaved: (path: string) => void
  setLoading: (loading: boolean) => void
  getActiveTab: () => EditorTab | undefined
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    json: 'json',
    html: 'html',
    css: 'css',
    py: 'python',
    java: 'java',
    md: 'markdown',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    dockerfile: 'dockerfile',
  }
  return (map[ext] ?? ext) || 'plaintext'
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  tabs: [],
  activeTabPath: null,
  isLoading: false,

  openTab: (path, name, content) => {
    const { tabs } = get()
    const existing = tabs.find((t) => t.path === path)
    if (existing) {
      set({ activeTabPath: path })
      return
    }
    const newTab: EditorTab = {
      path,
      name,
      content,
      originalContent: content,
      language: getLanguageFromPath(path),
      isModified: false,
      isReadOnly: false,
    }
    set({ tabs: [...tabs, newTab], activeTabPath: path })
  },

  closeTab: (path) => {
    const { tabs, activeTabPath } = get()
    const nextTabs = tabs.filter((t) => t.path !== path)
    let nextActive = activeTabPath
    if (activeTabPath === path) {
      const idx = tabs.findIndex((t) => t.path === path)
      nextActive = nextTabs[idx]?.path ?? nextTabs[idx - 1]?.path ?? null
    }
    set({ tabs: nextTabs, activeTabPath: nextActive })
  },

  switchTab: (path) => {
    set({ activeTabPath: path })
  },

  updateContent: (path, content) => {
    const { tabs } = get()
    const nextTabs = tabs.map((t) =>
      t.path === path
        ? { ...t, content, isModified: content !== t.originalContent }
        : t
    )
    set({ tabs: nextTabs })
  },

  markSaved: (path) => {
    const { tabs } = get()
    const nextTabs = tabs.map((t) =>
      t.path === path ? { ...t, originalContent: t.content, isModified: false } : t
    )
    set({ tabs: nextTabs })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  getActiveTab: () => {
    const { tabs, activeTabPath } = get()
    return tabs.find((t) => t.path === activeTabPath)
  },
}))

const saveTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

export function scheduleAutoSave(
  path: string,
  content: string,
  onSaved: () => void,
  onError: (msg: string) => void
): void {
  const existing = saveTimeouts.get(path)
  if (existing) {
    clearTimeout(existing)
  }
  const timeout = setTimeout(() => {
    saveTimeouts.delete(path)
    if (!window.electronAPI) {
      onError('Electron API not available')
      return
    }
    void window.electronAPI.writeFile(path, content).then((result) => {
      if ('error' in result) {
        onError(result.error)
      } else {
        onSaved()
      }
    })
  }, 2000)
  saveTimeouts.set(path, timeout)
}
