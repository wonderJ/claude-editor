import { create } from 'zustand'
import type { DiffMode } from '../../electron/preload'

export interface EditorTabDiff {
  mode: DiffMode
  original: string
  modified: string
  filePath: string
}

export interface EditorTab {
  path: string
  name: string
  content: string
  originalContent: string
  language: string
  isModified: boolean
  isReadOnly: boolean
  diff?: EditorTabDiff
}

interface EditorStore {
  tabs: EditorTab[]
  activeTabPath: string | null
  isLoading: boolean

  openTab: (path: string, name: string, content: string) => void
  openDiffTab: (filePath: string, name: string, diff: EditorTabDiff) => void
  closeTab: (path: string) => void
  closeAllTabs: () => void
  closeOtherTabs: (path: string) => void
  switchTab: (path: string) => void
  updateContent: (path: string, content: string) => void
  markSaved: (path: string) => void
  setLoading: (loading: boolean) => void
  getActiveTab: () => EditorTab | undefined
  showWelcome: () => void
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

const MAX_TABS = 30

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
    let nextTabs = [...tabs]
    while (nextTabs.length >= MAX_TABS) {
      const idx = nextTabs.findIndex((t) => !t.isModified)
      const removeIdx = idx >= 0 ? idx : 0
      nextTabs.splice(removeIdx, 1)
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
    set({ tabs: [...nextTabs, newTab], activeTabPath: path })
  },

  openDiffTab: (filePath, name, diff) => {
    const { tabs } = get()
    const tabPath = `diff://${diff.mode}/${filePath}`
    const existing = tabs.find((t) => t.path === tabPath)
    if (existing) {
      // Refresh diff content in case file changed since last open.
      const nextTabs = tabs.map((t) => (t.path === tabPath ? { ...t, diff } : t))
      set({ tabs: nextTabs, activeTabPath: tabPath })
      return
    }
    let nextTabs = [...tabs]
    while (nextTabs.length >= MAX_TABS) {
      const idx = nextTabs.findIndex((t) => !t.isModified)
      const removeIdx = idx >= 0 ? idx : 0
      nextTabs.splice(removeIdx, 1)
    }
    const newTab: EditorTab = {
      path: tabPath,
      name: `${name} (${diff.mode === 'staged' ? 'Staged' : 'Diff'})`,
      content: diff.modified,
      originalContent: diff.modified,
      language: getLanguageFromPath(filePath),
      isModified: false,
      isReadOnly: true,
      diff,
    }
    set({ tabs: [...nextTabs, newTab], activeTabPath: tabPath })
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

  closeAllTabs: () => {
    set({ tabs: [], activeTabPath: null })
  },

  closeOtherTabs: (path) => {
    const { tabs } = get()
    const keep = tabs.find((t) => t.path === path)
    set({ tabs: keep ? [keep] : [], activeTabPath: path })
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

  showWelcome: () => {
    set({ activeTabPath: null })
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
