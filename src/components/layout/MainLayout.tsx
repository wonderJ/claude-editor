import type { JSX } from 'react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLayoutStore } from '../../stores/layoutStore'
import { useFileStore } from '../../stores/fileStore'
import { useTerminalStore } from '../../stores/terminalStore'
import { useEditorStore } from '../../stores/editorStore'
import { useGitStore } from '../../stores/gitStore'
import { useRecentProjectsStore } from '../../stores/recentProjectsStore'
import { Sidebar } from './Sidebar'
import { EditorArea } from './EditorArea'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { StatusBar } from './StatusBar'
import { ResizableSplitter } from './ResizableSplitter'
import { MenuBar, type MenuItemDef } from '../menu/MenuBar'
import { CommandPalette, type CommandPaletteItem } from '../menu/CommandPalette'
import { FileQuickOpen } from '../menu/FileQuickOpen'
import { SearchPanel } from '../search/SearchPanel'
import { PromptDialog } from '../common/PromptDialog'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ManageRemotesDialog } from '../git/ManageRemotesDialog'
import { useGitMenuActions } from '../git/useGitMenuActions'

const SettingsDialog = lazy(() => import('../settings/SettingsDialog').then((m) => ({ default: m.SettingsDialog })))
const KeyboardShortcutsReference = lazy(() => import('../help/KeyboardShortcutsReference').then((m) => ({ default: m.KeyboardShortcutsReference })))
const AboutDialog = lazy(() => import('../help/AboutDialog').then((m) => ({ default: m.AboutDialog })))
const ReleaseNotesDialog = lazy(() => import('../help/ReleaseNotesDialog').then((m) => ({ default: m.ReleaseNotesDialog })))

import { findNode, getParentPath, getBaseName, generateUniquePath } from '../../lib/fileTreeActions'

// ── WindowControls ────────────────────────────────────────

function WindowControls(): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const cleanup = window.electronAPI?.onWindowMaximized((maximized) => {
      setIsMaximized(maximized)
    })
    return () => { cleanup?.() }
  }, [])

  return (
    <div className="flex items-center app-no-drag">
      <button
        type={'button'}
        className={'app-no-drag flex h-[42px] w-[42px] items-center justify-center text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]'}
        onClick={() => { window.electronAPI?.windowMinimize() }}
        title={'Minimize'}
      >
        <svg width={12} height={12} viewBox={'0 0 12 12'} fill={'currentColor'}>
          <rect y={5} width={12} height={2} />
        </svg>
      </button>
      <button
        type={'button'}
        className={'app-no-drag flex h-[42px] w-[42px] items-center justify-center text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]'}
        onClick={() => { window.electronAPI?.windowMaximize() }}
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <svg width={12} height={12} viewBox={'0 0 12 12'} fill={'none'} stroke={'currentColor'} strokeWidth={1.5}>
            <rect x={1} y={3} width={8} height={8} />
            <path d={'M3 3V1h8v8h-2'} />
          </svg>
        ) : (
          <svg width={12} height={12} viewBox={'0 0 12 12'} fill={'none'} stroke={'currentColor'} strokeWidth={1.5}>
            <rect x={0.5} y={0.5} width={11} height={11} />
          </svg>
        )}
      </button>
      <button
        type={'button'}
        className={'app-no-drag flex h-[42px] w-[42px] items-center justify-center text-[#8C8C8C] hover:bg-[#E81123] hover:text-white'}
        onClick={() => { window.electronAPI?.windowClose() }}
        title={'Close'}
      >
        <svg width={12} height={12} viewBox={'0 0 12 12'} fill={'currentColor'}>
          <path d={'M1 1l10 10M11 1L1 11'} stroke={'currentColor'} strokeWidth={1.5} />
        </svg>
      </button>
    </div>
  )
}

// ── MainLayout ────────────────────────────────────────────

export function MainLayout(): JSX.Element {
  const {
    sidebarVisible,
    sidebarWidth,
    sidebarCollapsed,
    setSidebarWidth,
    setSidebarCollapsed,
    terminalVisible,
    terminalHeight,
    terminalCollapsed,
    setTerminalHeight,
    setTerminalCollapsed,
    toggleSidebar,
    toggleTerminal,
  } = useLayoutStore()

  const { rootPath, files, selectedPath, addToast, setRootPath, refresh } = useFileStore()
  const { addTab, activeTabId } = useTerminalStore()
  const { closeTab, closeAllTabs, getActiveTab, markSaved, showWelcome } = useEditorStore()
  const { addProject, projects, clearProjects, loadProjects } = useRecentProjectsStore()
  const gitMenuActions = useGitMenuActions()

  // Dialog / overlay state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [fileQuickOpenOpen, setFileQuickOpenOpen] = useState(false)
  const [searchMode, setSearchMode] = useState<'find' | 'replace' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false)
  const [version, setVersion] = useState('0.0.0')

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('claude-editor:theme')
      return saved === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  const [zoom, setZoom] = useState(() => {
    try {
      const saved = localStorage.getItem('claude-editor:zoom')
      const n = Number(saved)
      return Number.isFinite(n) && n > 0 ? n : 1
    } catch {
      return 1
    }
  })

  const [prompt, setPrompt] = useState<{
    open: boolean
    title: string
    defaultValue: string
    onConfirm: (value: string) => void
  }>({ open: false, title: '', defaultValue: '', onConfirm: () => {} })

  const [confirm, setConfirm] = useState<{
    open: boolean
    title: string
    message: string
    danger: boolean
    onConfirm: () => void
  }>({ open: false, title: '', message: '', danger: false, onConfirm: () => {} })

  // Chord state for Ctrl+K sequences
  const awaitingChordRef = useRef(false)
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearChord = useCallback(() => {
    if (chordTimerRef.current) clearTimeout(chordTimerRef.current)
    awaitingChordRef.current = false
    chordTimerRef.current = null
  }, [])

  const startChord = useCallback(() => {
    clearChord()
    awaitingChordRef.current = true
    chordTimerRef.current = setTimeout(() => {
      awaitingChordRef.current = false
      chordTimerRef.current = null
      gitMenuActions.openCommitPanel()
    }, 400)
  }, [clearChord, gitMenuActions])

  // Responsive layout
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 1024) {
        setSidebarCollapsed(true)
        setTerminalCollapsed(true)
      } else {
        setSidebarCollapsed(false)
        setTerminalCollapsed(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize) }
  }, [setSidebarCollapsed, setTerminalCollapsed])

  // Theme / zoom / version / fullscreen listeners
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    try {
      localStorage.setItem('claude-editor:theme', theme)
    } catch {
      // ignore storage errors
    }
  }, [theme])

  useEffect(() => {
    window.electronAPI?.setZoomFactor(zoom)
    try {
      localStorage.setItem('claude-editor:zoom', String(zoom))
    } catch {
      // ignore storage errors
    }
  }, [zoom])

  useEffect(() => {
    if (window.electronAPI) setVersion(window.electronAPI.version)
  }, [])

  // Watch for per-file external changes and route them to the editor store.
  useEffect(() => {
    if (!window.electronAPI) return
    const cleanup = window.electronAPI.onFsFileChanged((path) => {
      useEditorStore.getState().markExternalChange(path)
    })
    return cleanup
  }, [])

  // Prompt before reloading a modified tab that changed externally.
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent<string>).detail
      setConfirm({
        open: true,
        title: 'File Changed Externally',
        message: `The file "${path}" was modified outside the editor. Reload and discard unsaved changes?`,
        danger: true,
        onConfirm: async () => {
          const result = await window.electronAPI?.readFile(path)
          if (result && 'content' in result) {
            useEditorStore.getState().reloadTab(path, result.content)
          } else {
            addToast({ message: 'Failed to reload file', type: 'error' })
          }
        },
      })
    }
    window.addEventListener('editor:externalChange', handler)
    return () => { window.removeEventListener('editor:externalChange', handler) }
  }, [addToast])

  useEffect(() => {
    const onFull = () => {
      void document.documentElement.requestFullscreen().catch(() => {})
    }
    window.addEventListener('window:fullscreen', onFull)
    return () => { window.removeEventListener('window:fullscreen', onFull) }
  }, [])

  const handleSidebarResize = useCallback(
    (delta: number) => {
      const newWidth = sidebarWidth + delta
      if (newWidth < 100) {
        setSidebarCollapsed(true)
      } else {
        setSidebarWidth(Math.max(200, Math.min(400, newWidth)))
      }
    },
    [sidebarWidth, setSidebarWidth, setSidebarCollapsed]
  )

  const handleTerminalResize = useCallback(
    (delta: number) => {
      const newHeight = terminalHeight - delta
      if (newHeight < 60) {
        setTerminalCollapsed(true)
      } else {
        setTerminalHeight(Math.max(150, newHeight))
      }
    },
    [terminalHeight, setTerminalHeight, setTerminalCollapsed]
  )

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const dispatch = useCallback((type: string) => {
    window.dispatchEvent(new CustomEvent(type))
  }, [])

  // ── Actions ──

  const openRoot = useCallback((path: string) => {
    addProject(path)
    setRootPath(path)
  }, [addProject, setRootPath])

  const openFolder = useCallback(async () => {
    if (!window.electronAPI) {
      addToast({ message: 'Electron API not available', type: 'error' })
      return
    }
    try {
      const p = await window.electronAPI.selectFolder()
      if (p) openRoot(p)
    } catch (err: unknown) {
      addToast({ message: 'Failed to open folder: ' + String(err), type: 'error' })
    }
  }, [addToast, openRoot])

  const getTargetDir = useCallback((): string | null => {
    if (!rootPath) return null
    if (selectedPath) {
      const node = findNode(files, selectedPath)
      if (node?.isDirectory) return selectedPath
      const parent = getParentPath(selectedPath)
      return parent || rootPath
    }
    return rootPath
  }, [rootPath, selectedPath, files])

  const createItem = useCallback(async (baseName: string, isDirectory: boolean) => {
    const dir = getTargetDir()
    if (!dir) {
      addToast({ message: 'No folder open', type: 'error' })
      return
    }
    if (!window.electronAPI) {
      addToast({ message: 'Electron API not available', type: 'error' })
      return
    }
    const path = await generateUniquePath(dir, baseName)
    const result = isDirectory
      ? await window.electronAPI.createDir(path)
      : await window.electronAPI.createFile(path)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
      return
    }
    refresh()
    void useGitStore.getState().refreshStatus()
    addToast({ message: isDirectory ? 'Folder created' : 'File created', type: 'success' })
  }, [getTargetDir, addToast, refresh])

  const promptNewFile = useCallback(() => {
    setPrompt({
      open: true,
      title: 'New File',
      defaultValue: 'untitled.txt',
      onConfirm: (value) => { void createItem(value.trim() || 'untitled.txt', false) },
    })
  }, [createItem])

  const promptNewFolder = useCallback(() => {
    setPrompt({
      open: true,
      title: 'New Folder',
      defaultValue: 'newfolder',
      onConfirm: (value) => { void createItem(value.trim() || 'newfolder', true) },
    })
  }, [createItem])

  const promptClone = useCallback(() => {
    setPrompt({
      open: true,
      title: 'Clone Repository',
      defaultValue: 'https://github.com/user/repo.git',
      onConfirm: (url) => { void doClone(url.trim()) },
    })
  }, [])

  const doClone = useCallback(async (url: string) => {
    if (!url) return
    if (!window.electronAPI) {
      addToast({ message: 'Electron API not available', type: 'error' })
      return
    }
    const parent = await window.electronAPI.selectFolder()
    if (!parent) return
    let clean = url
    if (clean.endsWith('/')) clean = clean.slice(0, -1)
    const gitSuffix = '.git'
    let base = getBaseName(clean)
    if (base.toLowerCase().endsWith(gitSuffix)) {
      base = base.slice(0, -gitSuffix.length)
    }
    const target = await generateUniquePath(parent, base || 'repo')
    const ok = await useGitStore.getState().cloneRepo(url, target)
    if (ok) openRoot(target)
  }, [addToast, openRoot])

  const saveActive = useCallback(() => {
    const tab = getActiveTab()
    if (!tab || !window.electronAPI) return
    void window.electronAPI.writeFile(tab.path, tab.content).then((result) => {
      if ('error' in result) {
        addToast({ message: result.error, type: 'error' })
      } else {
        markSaved(tab.path)
        addToast({ message: 'Saved', type: 'success' })
      }
    })
  }, [getActiveTab, markSaved, addToast])

  const saveAll = useCallback(() => {
    const { tabs } = useEditorStore.getState()
    const modified = tabs.filter((t) => t.isModified)
    if (modified.length === 0) return
    const api = window.electronAPI
    if (!api) return
    modified.forEach((tab) => {
      void api.writeFile(tab.path, tab.content).then((result) => {
        if ('error' in result) {
          addToast({ message: result.error, type: 'error' })
        } else {
          markSaved(tab.path)
        }
      })
    })
    addToast({ message: 'All saved', type: 'success' })
  }, [markSaved, addToast])

  const closeActiveEditor = useCallback(() => {
    const tab = getActiveTab()
    if (tab) closeTab(tab.path)
  }, [getActiveTab, closeTab])

  const closeFolder = useCallback(() => {
    if (!rootPath) return
    setConfirm({
      open: true,
      title: 'Close Folder',
      message: 'Close the current project? Unsaved changes will remain in tabs.',
      danger: false,
      onConfirm: () => {
        setRootPath(null)
        closeAllTabs()
        setConfirm((c) => ({ ...c, open: false }))
      },
    })
  }, [rootPath, setRootPath, closeAllTabs])

  const zoomIn = useCallback(() => { setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10)) }, [])
  const zoomOut = useCallback(() => { setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10)) }, [])
  const resetZoom = useCallback(() => { setZoom(1) }, [])

  const openSearch = useCallback((mode: 'find' | 'replace') => {
    setSearchMode(mode)
  }, [])

  const terminalCwd = rootPath || ''
  const newTerminal = useCallback(() => {
    toggleTerminal()
    addTab(terminalCwd)
  }, [toggleTerminal, addTab, terminalCwd])

  const splitTerminal = useCallback(() => {
    addTab(terminalCwd)
  }, [addTab, terminalCwd])

  // ── Menu items ──

  const menuItems = useMemo((): { label: string; children: MenuItemDef[] }[] => {
    const activeTab = getActiveTab()
    const hasRoot = Boolean(rootPath)
    const hasModified = useEditorStore.getState().tabs.some((t) => t.isModified)
    const hasActiveTerminal = Boolean(activeTabId)

    const recentChildren: MenuItemDef[] = projects.length === 0
      ? [{ label: 'No Recent Folders', disabled: true }]
      : [
          ...projects.map((p) => ({ label: getBaseName(p), action: () => { openRoot(p) } })),
          { divider: true, label: '' },
          { label: 'Clear Recent', action: () => { clearProjects() } },
        ]

    return [
      {
        label: 'File',
        children: [
          { label: 'New File', shortcut: 'Ctrl+N', disabled: !hasRoot, action: promptNewFile },
          { label: 'New Folder', shortcut: 'Ctrl+Shift+N', disabled: !hasRoot, action: promptNewFolder },
          { divider: true, label: '' },
          { label: 'Open Folder', shortcut: 'Ctrl+K Ctrl+O', action: openFolder },
          { label: 'Clone Repository...', action: promptClone },
          { label: 'Open Recent', children: recentChildren },
          { divider: true, label: '' },
          { label: 'Save', shortcut: 'Ctrl+S', disabled: !activeTab?.isModified, action: saveActive },
          { label: 'Save All', shortcut: 'Ctrl+K S', disabled: !hasModified, action: saveAll },
          { divider: true, label: '' },
          { label: 'Close Editor', shortcut: 'Ctrl+W', disabled: !activeTab, action: closeActiveEditor },
          { label: 'Close Folder', shortcut: 'Ctrl+K F', disabled: !hasRoot, action: closeFolder },
          { divider: true, label: '' },
          {
            label: 'Preferences',
            children: [
              { label: 'Settings', shortcut: 'Ctrl+,', action: () => { setSettingsOpen(true) } },
              { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', action: () => { setShortcutsOpen(true) } },
            ],
          },
          { divider: true, label: '' },
          { label: 'Exit', action: () => { window.electronAPI?.windowClose() } },
        ],
      },
      {
        label: 'Edit',
        children: [
          { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !activeTab, action: () => { dispatch('editor:undo') } },
          { label: 'Redo', shortcut: 'Ctrl+Shift+Z', disabled: !activeTab, action: () => { dispatch('editor:redo') } },
          { divider: true, label: '' },
          { label: 'Cut', shortcut: 'Ctrl+X', action: () => { document.execCommand('cut') } },
          { label: 'Copy', shortcut: 'Ctrl+C', action: () => { document.execCommand('copy') } },
          { label: 'Paste', shortcut: 'Ctrl+V', action: () => { document.execCommand('paste') } },
          { label: 'Paste as Image', disabled: true },
          { divider: true, label: '' },
          { label: 'Find', shortcut: 'Ctrl+F', action: () => { dispatch('editor:find') } },
          { label: 'Replace', shortcut: 'Ctrl+H', action: () => { dispatch('editor:replace') } },
          { label: 'Find in Files', shortcut: 'Ctrl+Shift+F', action: () => { openSearch('find') } },
          { label: 'Replace in Files', shortcut: 'Ctrl+Shift+H', action: () => { openSearch('replace') } },
        ],
      },
      {
        label: 'View',
        children: [
          { label: 'Command Palette', shortcut: 'Ctrl+Shift+P', action: () => { setCommandPaletteOpen(true) } },
          { divider: true, label: '' },
          { label: 'Sidebar', shortcut: 'Ctrl+B', action: toggleSidebar },
          { label: 'Terminal', shortcut: 'Ctrl+`', action: () => { toggleTerminal(); addTab(terminalCwd) } },
          { divider: true, label: '' },
          {
            label: 'Appearance',
            children: [
              {
                label: 'Theme',
                children: [
                  { label: theme === 'dark' ? 'Dark ✓' : 'Dark', action: () => { setTheme('dark') } },
                  { label: theme === 'light' ? 'Light ✓' : 'Light', action: () => { setTheme('light') } },
                ],
              },
              { divider: true, label: '' },
              { label: 'Zoom In', shortcut: 'Ctrl+=', action: zoomIn },
              { label: 'Zoom Out', shortcut: 'Ctrl+-', action: zoomOut },
              { label: 'Reset Zoom', shortcut: 'Ctrl+0', action: resetZoom },
            ],
          },
          { label: 'Full Screen', shortcut: 'F11', action: () => { dispatch('window:fullscreen') } },
        ],
      },
      {
        label: 'Code',
        children: [
          { label: 'Go to File', shortcut: 'Ctrl+P', action: () => { setFileQuickOpenOpen(true) } },
          { label: 'Go to Symbol', shortcut: 'Ctrl+Shift+O', action: () => { dispatch('editor:gotoSymbol') } },
          { label: 'Go to Line', shortcut: 'Ctrl+G', action: () => { dispatch('editor:gotoLine') } },
          { divider: true, label: '' },
          { label: 'Go to Definition', shortcut: 'F12', action: () => { dispatch('editor:gotoDefinition') } },
          { divider: true, label: '' },
          { label: 'Format Document', shortcut: 'Shift+Alt+F', action: () => { dispatch('editor:format') } },
          { label: 'Format Selection', shortcut: 'Ctrl+K Ctrl+F', action: () => { dispatch('editor:formatSelection') } },
          { label: 'Comment Line', shortcut: 'Ctrl+/', action: () => { dispatch('editor:comment') } },
        ],
      },
      {
        label: 'Git',
        children: [
          { label: 'Initialize Repository...', disabled: !hasRoot, action: gitMenuActions.handleInitRepo },
          { label: 'Commit...', shortcut: 'Ctrl+K', disabled: !gitMenuActions.isRepo, action: gitMenuActions.openCommitPanel },
          { label: 'Push...', shortcut: 'Ctrl+Shift+K', disabled: !gitMenuActions.isRepo, action: gitMenuActions.handlePush },
          { label: 'Pull...', disabled: !gitMenuActions.isRepo, action: gitMenuActions.handlePull },
          { label: 'Fetch', disabled: !gitMenuActions.isRepo, action: gitMenuActions.handleFetch },
          { label: 'Update Project', shortcut: 'Ctrl+T', disabled: !gitMenuActions.isRepo, action: gitMenuActions.handleUpdateProject },
          { label: 'Manage Remotes...', disabled: !gitMenuActions.isRepo, action: () => { gitMenuActions.setIsRemotesOpen(true) } },
        ],
      },
      {
        label: 'Terminal',
        children: [
          { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: newTerminal },
          { label: 'Split Terminal', action: splitTerminal },
          { label: 'Kill Terminal', disabled: !hasActiveTerminal, action: () => { dispatch('terminal:kill') } },
          { divider: true, label: '' },
          { label: 'Clear Terminal', disabled: !hasActiveTerminal, action: () => { dispatch('terminal:clear') } },
          { label: 'Scroll to Top', disabled: !hasActiveTerminal, action: () => { dispatch('terminal:scrollTop') } },
          { label: 'Scroll to Bottom', disabled: !hasActiveTerminal, action: () => { dispatch('terminal:scrollBottom') } },
        ],
      },
      {
        label: 'Help',
        children: [
          { label: 'Welcome', action: showWelcome },
          { label: 'Keyboard Shortcuts Reference', action: () => { setShortcutsOpen(true) } },
          { label: 'Release Notes', action: () => { setReleaseNotesOpen(true) } },
          { divider: true, label: '' },
          { label: 'About', action: () => { setAboutOpen(true) } },
        ],
      },
    ]
  }, [
    getActiveTab, rootPath, activeTabId, projects, theme,
    promptNewFile, promptNewFolder, openFolder, promptClone, openRoot, clearProjects,
    saveActive, saveAll, closeActiveEditor, closeFolder,
    dispatch, toggleSidebar, toggleTerminal, terminalCwd, addTab,
    openSearch, zoomIn, zoomOut, resetZoom, setTheme,
    gitMenuActions, showWelcome,
  ])

  // ── Command palette ──

  const commands = useMemo((): CommandPaletteItem[] => {
    return [
      { id: 'newFile', label: 'File: New File', shortcut: 'Ctrl+N', action: promptNewFile },
      { id: 'newFolder', label: 'File: New Folder', shortcut: 'Ctrl+Shift+N', action: promptNewFolder },
      { id: 'openFolder', label: 'File: Open Folder', shortcut: 'Ctrl+K Ctrl+O', action: openFolder },
      { id: 'cloneRepo', label: 'File: Clone Repository', action: promptClone },
      { id: 'save', label: 'File: Save', shortcut: 'Ctrl+S', action: saveActive },
      { id: 'saveAll', label: 'File: Save All', shortcut: 'Ctrl+K S', action: saveAll },
      { id: 'closeEditor', label: 'File: Close Editor', shortcut: 'Ctrl+W', action: closeActiveEditor },
      { id: 'closeFolder', label: 'File: Close Folder', shortcut: 'Ctrl+K F', action: closeFolder },
      { id: 'settings', label: 'File: Preferences: Settings', shortcut: 'Ctrl+,', action: () => { setSettingsOpen(true) } },
      { id: 'keyboardShortcuts', label: 'File: Preferences: Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', action: () => { setShortcutsOpen(true) } },
      { id: 'undo', label: 'Edit: Undo', shortcut: 'Ctrl+Z', action: () => { dispatch('editor:undo') } },
      { id: 'redo', label: 'Edit: Redo', shortcut: 'Ctrl+Shift+Z', action: () => { dispatch('editor:redo') } },
      { id: 'cut', label: 'Edit: Cut', shortcut: 'Ctrl+X', action: () => { document.execCommand('cut') } },
      { id: 'copy', label: 'Edit: Copy', shortcut: 'Ctrl+C', action: () => { document.execCommand('copy') } },
      { id: 'paste', label: 'Edit: Paste', shortcut: 'Ctrl+V', action: () => { document.execCommand('paste') } },
      { id: 'find', label: 'Edit: Find', shortcut: 'Ctrl+F', action: () => { dispatch('editor:find') } },
      { id: 'replace', label: 'Edit: Replace', shortcut: 'Ctrl+H', action: () => { dispatch('editor:replace') } },
      { id: 'findInFiles', label: 'Edit: Find in Files', shortcut: 'Ctrl+Shift+F', action: () => { openSearch('find') } },
      { id: 'replaceInFiles', label: 'Edit: Replace in Files', shortcut: 'Ctrl+Shift+H', action: () => { openSearch('replace') } },
      { id: 'commandPalette', label: 'View: Command Palette', shortcut: 'Ctrl+Shift+P', action: () => { setCommandPaletteOpen(true) } },
      { id: 'sidebar', label: 'View: Toggle Sidebar', shortcut: 'Ctrl+B', action: toggleSidebar },
      { id: 'terminal', label: 'View: Toggle Terminal', shortcut: 'Ctrl+`', action: () => { toggleTerminal(); addTab(terminalCwd) } },
      { id: 'zoomIn', label: 'View: Zoom In', shortcut: 'Ctrl+=', action: zoomIn },
      { id: 'zoomOut', label: 'View: Zoom Out', shortcut: 'Ctrl+-', action: zoomOut },
      { id: 'resetZoom', label: 'View: Reset Zoom', shortcut: 'Ctrl+0', action: resetZoom },
      { id: 'goToFile', label: 'Code: Go to File', shortcut: 'Ctrl+P', action: () => { setFileQuickOpenOpen(true) } },
      { id: 'goToSymbol', label: 'Code: Go to Symbol', shortcut: 'Ctrl+Shift+O', action: () => { dispatch('editor:gotoSymbol') } },
      { id: 'goToLine', label: 'Code: Go to Line', shortcut: 'Ctrl+G', action: () => { dispatch('editor:gotoLine') } },
      { id: 'goToDefinition', label: 'Code: Go to Definition', shortcut: 'F12', action: () => { dispatch('editor:gotoDefinition') } },
      { id: 'formatDocument', label: 'Code: Format Document', shortcut: 'Shift+Alt+F', action: () => { dispatch('editor:format') } },
      { id: 'formatSelection', label: 'Code: Format Selection', shortcut: 'Ctrl+K Ctrl+F', action: () => { dispatch('editor:formatSelection') } },
      { id: 'commentLine', label: 'Code: Comment Line', shortcut: 'Ctrl+/', action: () => { dispatch('editor:comment') } },
      { id: 'gitCommit', label: 'Git: Commit', shortcut: 'Ctrl+K', action: gitMenuActions.openCommitPanel },
      { id: 'gitPush', label: 'Git: Push', shortcut: 'Ctrl+Shift+K', action: gitMenuActions.handlePush },
      { id: 'gitPull', label: 'Git: Pull', action: gitMenuActions.handlePull },
      { id: 'gitFetch', label: 'Git: Fetch', action: gitMenuActions.handleFetch },
      { id: 'gitUpdateProject', label: 'Git: Update Project', shortcut: 'Ctrl+T', action: gitMenuActions.handleUpdateProject },
      { id: 'gitInitRepo', label: 'Git: Initialize Repository', action: gitMenuActions.handleInitRepo },
      { id: 'gitManageRemotes', label: 'Git: Manage Remotes', action: () => { gitMenuActions.setIsRemotesOpen(true) } },
      { id: 'newTerminal', label: 'Terminal: New Terminal', shortcut: 'Ctrl+Shift+`', action: newTerminal },
      { id: 'splitTerminal', label: 'Terminal: Split Terminal', action: splitTerminal },
      { id: 'clearTerminal', label: 'Terminal: Clear Terminal', action: () => { dispatch('terminal:clear') } },
      { id: 'killTerminal', label: 'Terminal: Kill Terminal', action: () => { dispatch('terminal:kill') } },
      { id: 'welcome', label: 'Help: Welcome', action: showWelcome },
      { id: 'shortcutsRef', label: 'Help: Keyboard Shortcuts Reference', action: () => { setShortcutsOpen(true) } },
      { id: 'releaseNotes', label: 'Help: Release Notes', action: () => { setReleaseNotesOpen(true) } },
      { id: 'about', label: 'Help: About', action: () => { setAboutOpen(true) } },
    ]
  }, [
    promptNewFile, promptNewFolder, openFolder, promptClone, saveActive, saveAll,
    closeActiveEditor, closeFolder, dispatch, toggleSidebar, toggleTerminal,
    terminalCwd, addTab, openSearch, zoomIn, zoomOut, resetZoom, gitMenuActions,
    showWelcome,
  ])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const key = e.key.toLowerCase()

      if (awaitingChordRef.current) {
        clearChord()
        if (ctrl && key === 'o') { e.preventDefault(); openFolder(); return }
        if (!ctrl && key === 's') { e.preventDefault(); saveAll(); return }
        if (ctrl && key === 's') { e.preventDefault(); setShortcutsOpen(true); return }
        if (!ctrl && key === 'f') { e.preventDefault(); closeFolder(); return }
        if (ctrl && key === 'f') { e.preventDefault(); dispatch('editor:formatSelection'); return }
        return
      }

      if (ctrl && key === 'k') { e.preventDefault(); startChord(); return }

      // File
      if (ctrl && key === 'n') { e.preventDefault(); promptNewFile(); return }
      if (ctrl && shift && key === 'n') { e.preventDefault(); promptNewFolder(); return }
      if (ctrl && key === 'o') { e.preventDefault(); openFolder(); return }
      if (ctrl && key === 's') { e.preventDefault(); saveActive(); return }
      if (ctrl && key === 'w') { e.preventDefault(); closeActiveEditor(); return }

      // Edit
      if (ctrl && key === 'z') { e.preventDefault(); dispatch('editor:undo'); return }
      if ((ctrl && shift && key === 'z') || (ctrl && key === 'y')) { e.preventDefault(); dispatch('editor:redo'); return }

      // Skip global clipboard interception when Monaco editor has focus so it can
      // use its native copy/cut/paste implementation.
      const active = document.activeElement
      const isMonacoFocused = active instanceof HTMLElement && active.closest('.monaco-editor') !== null
      if (isMonacoFocused && (ctrl && (key === 'c' || key === 'x' || key === 'v'))) {
        return
      }

      if (ctrl && key === 'x') { e.preventDefault(); document.execCommand('cut'); return }
      if (ctrl && key === 'c') { e.preventDefault(); document.execCommand('copy'); return }
      if (ctrl && key === 'v') { e.preventDefault(); document.execCommand('paste'); return }
      if (ctrl && key === 'a') { e.preventDefault(); dispatch('editor:selectAll'); return }
      if (ctrl && key === 'f') { e.preventDefault(); dispatch('editor:find'); return }
      if (ctrl && key === 'h') { e.preventDefault(); dispatch('editor:replace'); return }
      if (ctrl && shift && key === 'f') { e.preventDefault(); openSearch('find'); return }
      if (ctrl && shift && key === 'h') { e.preventDefault(); openSearch('replace'); return }

      // View
      if (ctrl && shift && key === 'p') { e.preventDefault(); setCommandPaletteOpen(true); return }
      if (ctrl && key === 'b') { e.preventDefault(); toggleSidebar(); return }
      if ((ctrl && (key === '`' || key === 'backquote')) && !shift) { e.preventDefault(); toggleTerminal(); addTab(terminalCwd); return }
      if (ctrl && shift && (key === '`' || key === 'backquote')) { e.preventDefault(); newTerminal(); return }
      if (ctrl && key === '=') { e.preventDefault(); zoomIn(); return }
      if (ctrl && key === '+') { e.preventDefault(); zoomIn(); return }
      if (ctrl && key === '-') { e.preventDefault(); zoomOut(); return }
      if (ctrl && key === '0') { e.preventDefault(); resetZoom(); return }
      if (key === 'f11') { e.preventDefault(); dispatch('window:fullscreen'); return }

      // Code
      if (ctrl && key === 'p') { e.preventDefault(); setFileQuickOpenOpen(true); return }
      if (ctrl && shift && key === 'o') { e.preventDefault(); dispatch('editor:gotoSymbol'); return }
      if (ctrl && key === 'g') { e.preventDefault(); dispatch('editor:gotoLine'); return }
      if (key === 'f12') { e.preventDefault(); dispatch('editor:gotoDefinition'); return }
      if (shift && e.altKey && key === 'f') { e.preventDefault(); dispatch('editor:format'); return }

      // Git
      if (ctrl && shift && key === 'k') { e.preventDefault(); gitMenuActions.handlePush(); return }
      if (ctrl && key === 't') { e.preventDefault(); gitMenuActions.handleUpdateProject(); return }

      // Settings
      if (ctrl && key === ',') { e.preventDefault(); setSettingsOpen(true); return }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearChord()
    }
  }, [
    openFolder, saveAll, setShortcutsOpen, closeFolder, dispatch, startChord, clearChord,
    promptNewFile, promptNewFolder, saveActive, closeActiveEditor, toggleSidebar,
    toggleTerminal, terminalCwd, addTab, newTerminal, zoomIn, zoomOut, resetZoom,
    openSearch, setCommandPaletteOpen, setFileQuickOpenOpen, setSettingsOpen,
    gitMenuActions,
  ])

  return (
    <div className={'flex h-screen w-screen flex-col overflow-hidden bg-[#1E1F22]'}>
      {/* Title bar / Menu */}
      <div className={'flex h-[42px] shrink-0 items-center border-b border-[#4E5254] bg-[#2B2D30] px-3 app-drag'}>
        <MenuBar items={menuItems} />
        <div className={'flex-1 app-drag'} />
        <WindowControls />
      </div>

      {/* Main content area */}
      <div className={'flex flex-1 overflow-hidden'}>
        {/* Sidebar */}
        <Sidebar />

        {/* Sidebar splitter */}
        {sidebarVisible && !sidebarCollapsed && (
          <ResizableSplitter direction={'horizontal'} onResize={handleSidebarResize} />
        )}

        {/* Center area: Editor + Terminal */}
        <div className={'flex flex-1 flex-col overflow-hidden'}>
          <div className={'flex flex-1 overflow-hidden'}>
            {/* Editor */}
            <EditorArea />
          </div>

          {/* Terminal splitter */}
          {terminalVisible && !terminalCollapsed && (
            <ResizableSplitter
              direction={'vertical'}
              onResize={handleTerminalResize}
              onResizeEnd={() => { window.dispatchEvent(new CustomEvent('terminal:resize')) }}
            />
          )}

          {/* Terminal */}
          <TerminalPanel />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Overlays */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => { setCommandPaletteOpen(false) }}
        commands={commands}
      />
      <FileQuickOpen
        isOpen={fileQuickOpenOpen}
        onClose={() => { setFileQuickOpenOpen(false) }}
      />
      {searchMode && (
        <SearchPanel
          isOpen={true}
          mode={searchMode}
          onClose={() => { setSearchMode(null) }}
        />
      )}
      <Suspense fallback={null}>
        {settingsOpen && (
          <SettingsDialog
            isOpen={settingsOpen}
            onClose={() => { setSettingsOpen(false) }}
            theme={theme}
            onThemeChange={setTheme}
          />
        )}
        {shortcutsOpen && (
          <KeyboardShortcutsReference
            isOpen={shortcutsOpen}
            onClose={() => { setShortcutsOpen(false) }}
          />
        )}
        {aboutOpen && (
          <AboutDialog
            isOpen={aboutOpen}
            onClose={() => { setAboutOpen(false) }}
            version={version}
          />
        )}
        {releaseNotesOpen && (
          <ReleaseNotesDialog
            isOpen={releaseNotesOpen}
            onClose={() => { setReleaseNotesOpen(false) }}
            version={version}
          />
        )}
      </Suspense>
      <ManageRemotesDialog
        isOpen={gitMenuActions.isRemotesOpen}
        onClose={() => { gitMenuActions.setIsRemotesOpen(false) }}
        remotes={gitMenuActions.remotes}
        onAdd={gitMenuActions.handleAddRemote}
        onRemove={gitMenuActions.handleRemoveRemote}
      />
      {prompt.open && (
        <PromptDialog
          title={prompt.title}
          defaultValue={prompt.defaultValue}
          onConfirm={(value) => {
            setPrompt((p) => ({ ...p, open: false }))
            prompt.onConfirm(value)
          }}
          onCancel={() => { setPrompt((p) => ({ ...p, open: false })) }}
        />
      )}
      {confirm.open && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          danger={confirm.danger}
          onConfirm={() => {
            setConfirm((c) => ({ ...c, open: false }))
            confirm.onConfirm()
          }}
          onCancel={() => { setConfirm((c) => ({ ...c, open: false })) }}
        />
      )}
    </div>
  )
}
