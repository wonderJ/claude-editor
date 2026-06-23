import type { JSX } from 'react'
import { useCallback, useEffect, useState, useRef } from 'react'
import { useLayoutStore } from '../../stores/layoutStore'
import { useFileStore } from '../../stores/fileStore'
import { useTerminalStore } from '../../stores/terminalStore'
import { useEditorStore } from '../../stores/editorStore'
import { Sidebar } from './Sidebar'
import { EditorArea } from './EditorArea'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { ChatPanel } from '../chat/ChatPanel'
import { StatusBar } from './StatusBar'
import { ResizableSplitter } from './ResizableSplitter'

// ── MenuBar ───────────────────────────────────────────────

interface MenuItem {
  label: string
  action?: () => void
  shortcut?: string
  disabled?: boolean
  divider?: boolean
  children?: MenuItem[]
}

function MenuBar({
  items,
}: {
  items: { label: string; children: MenuItem[] }[]
}): JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // close on outside click / Escape
  useEffect(() => {
    if (openIndex === null) return
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpenIndex(null)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openIndex])

  return (
    <div ref={containerRef} className="flex items-center gap-1 text-xs text-[#DFE1E5] app-no-drag">
      {items.map((menu, idx) => (
        <div key={menu.label} className="relative">
          <button
            type="button"
            className={`app-no-drag rounded px-2 py-1 ${openIndex === idx ? 'bg-[#4E5254]' : 'hover:bg-[#3C3F41]'}`}
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            onMouseEnter={() => { if (openIndex !== null) setOpenIndex(idx) }}
          >
            {menu.label}
          </button>

          {openIndex === idx && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-[#4E5254] bg-[#2B2D30] py-1 shadow-lg">
              {menu.children.map((item, i) =>
                item.divider ? (
                  <div key={`div-${i}`} className="my-1 border-t border-[#4E5254]" />
                ) : (
                  <button
                    key={`${item.label}-${i}`}
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${item.disabled ? 'cursor-not-allowed text-[#5C5C5C]' : 'text-[#DFE1E5] hover:bg-[#3574F0]'}`}
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled && item.action) {
                        item.action()
                        setOpenIndex(null)
                      }
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="ml-4 text-[10px] text-[#8C8C8C]">{item.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

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
        type="button"
        className="app-no-drag flex h-[42px] w-[42px] items-center justify-center text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
        onClick={() => { window.electronAPI?.windowMinimize() }}
        title="Minimize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect y="5" width="12" height="2" />
        </svg>
      </button>
      <button
        type="button"
        className="app-no-drag flex h-[42px] w-[42px] items-center justify-center text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
        onClick={() => { window.electronAPI?.windowMaximize() }}
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="3" width="8" height="8" />
            <path d="M3 3V1h8v8h-2" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="0.5" y="0.5" width="11" height="11" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="app-no-drag flex h-[42px] w-[42px] items-center justify-center text-[#8C8C8C] hover:bg-[#E81123] hover:text-white"
        onClick={() => { window.electronAPI?.windowClose() }}
        title="Close"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
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
    chatVisible,
    chatWidth,
    setChatWidth,
    toggleChat,
    toggleSidebar,
    toggleTerminal,
  } = useLayoutStore()
  const { addToast, setRootPath } = useFileStore()
  const { addTab } = useTerminalStore()
  const { closeTab, getActiveTab, markSaved } = useEditorStore()

  // Responsive: <1024px collapse sidebar and terminal
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
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [setSidebarCollapsed, setTerminalCollapsed])

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

  const handleChatResize = useCallback(
    (delta: number) => {
      const newWidth = chatWidth - delta
      setChatWidth(Math.max(300, Math.min(500, newWidth)))
    },
    [chatWidth, setChatWidth]
  )

  // ── Menu definitions ──
  const menuItems = useCallback(() => {
    const activeTab = getActiveTab()

    return [
      {
        label: 'File',
        children: [
          {
            label: 'New Project',
            action: () => {
              if (!window.electronAPI) {
                addToast({ message: 'Electron API not available', type: 'error' })
                return
              }
              void window.electronAPI.selectFolder().then((p) => {
                if (p) setRootPath(p)
              }).catch((err: unknown) => {
                addToast({ message: 'Failed to open folder: ' + String(err), type: 'error' })
              })
            },
          },
          {
            label: 'Open Folder',
            shortcut: 'Ctrl+O',
            action: () => {
              if (!window.electronAPI) {
                addToast({ message: 'Electron API not available', type: 'error' })
                return
              }
              void window.electronAPI.selectFolder().then((p) => {
                if (p) setRootPath(p)
              }).catch((err: unknown) => {
                addToast({ message: 'Failed to open folder: ' + String(err), type: 'error' })
              })
            },
          },
          { divider: true } as MenuItem,
          {
            label: 'Save',
            shortcut: 'Ctrl+S',
            disabled: !activeTab?.isModified,
            action: () => {
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
            },
          },
          {
            label: 'Save All',
            action: () => {
              const { tabs } = useEditorStore.getState()
              tabs.filter((t) => t.isModified).forEach((tab) => {
                if (!window.electronAPI) return
                void window.electronAPI.writeFile(tab.path, tab.content).then((result) => {
                  if ('error' in result) {
                    addToast({ message: result.error, type: 'error' })
                  } else {
                    markSaved(tab.path)
                  }
                })
              })
              addToast({ message: 'All saved', type: 'success' })
            },
          },
          { divider: true } as MenuItem,
          {
            label: 'Close Editor',
            shortcut: 'Ctrl+W',
            disabled: !activeTab,
            action: () => {
              const tab = getActiveTab()
              if (tab) closeTab(tab.path)
            },
          },
          { divider: true } as MenuItem,
          {
            label: 'Exit',
            action: () => { window.electronAPI?.windowClose() },
          },
        ],
      },
      {
        label: 'Edit',
        children: [
          { label: 'Undo', shortcut: 'Ctrl+Z', action: () => { window.dispatchEvent(new CustomEvent('editor:undo')) } },
          { label: 'Redo', shortcut: 'Ctrl+Y', action: () => { window.dispatchEvent(new CustomEvent('editor:redo')) } },
          { divider: true } as MenuItem,
          { label: 'Cut', shortcut: 'Ctrl+X', action: () => { document.execCommand('cut') } },
          { label: 'Copy', shortcut: 'Ctrl+C', action: () => { document.execCommand('copy') } },
          { label: 'Paste', shortcut: 'Ctrl+V', action: () => { document.execCommand('paste') } },
          { divider: true } as MenuItem,
          { label: 'Find', shortcut: 'Ctrl+F', action: () => { window.dispatchEvent(new CustomEvent('editor:find')) } },
          { label: 'Replace', shortcut: 'Ctrl+H', action: () => { window.dispatchEvent(new CustomEvent('editor:replace')) } },
          { divider: true } as MenuItem,
          { label: 'Select All', shortcut: 'Ctrl+A', action: () => { window.dispatchEvent(new CustomEvent('editor:selectAll')) } },
        ],
      },
      {
        label: 'View',
        children: [
          { label: 'Command Palette', shortcut: 'Ctrl+Shift+P', action: () => { addToast({ message: 'Command Palette coming soon', type: 'info' }) } },
          { divider: true } as MenuItem,
          { label: 'Sidebar Toggle', shortcut: 'Ctrl+B', action: () => { toggleSidebar() } },
          { label: 'Terminal Toggle', shortcut: 'Ctrl+J', action: () => { toggleTerminal(); addTab() } },
          { label: 'Full Screen', shortcut: 'F11', action: () => { window.dispatchEvent(new CustomEvent('window:fullscreen')) } },
        ],
      },
      {
        label: 'Code',
        children: [
          { label: 'Go to File', shortcut: 'Ctrl+P', action: () => { window.dispatchEvent(new CustomEvent('editor:gotoFile')) } },
          { label: 'Go to Definition', shortcut: 'F12', action: () => { window.dispatchEvent(new CustomEvent('editor:gotoDefinition')) } },
          { divider: true } as MenuItem,
          { label: 'Format Document', shortcut: 'Ctrl+Shift+I', action: () => { window.dispatchEvent(new CustomEvent('editor:format')) } },
          { label: 'Comment Line', shortcut: 'Ctrl+/', action: () => { window.dispatchEvent(new CustomEvent('editor:comment')) } },
        ],
      },
      {
        label: 'Claude',
        children: [
          { label: 'New Chat', action: () => { if (!chatVisible) toggleChat(); window.dispatchEvent(new CustomEvent('chat:new')) } },
          { label: 'Send File to Claude', action: () => { addToast({ message: 'Send File coming soon', type: 'info' }) } },
          { divider: true } as MenuItem,
          { label: 'View History', action: () => { window.dispatchEvent(new CustomEvent('chat:history')) } },
          { label: 'Settings', action: () => { window.dispatchEvent(new CustomEvent('app:settings')) } },
        ],
      },
      {
        label: 'Terminal',
        children: [
          { label: 'New Terminal', action: () => { toggleTerminal(); addTab() } },
          { label: 'Split Terminal', action: () => { addTab() } },
          { divider: true } as MenuItem,
          { label: 'Clear Terminal', action: () => { window.dispatchEvent(new CustomEvent('terminal:clear')) } },
        ],
      },
      {
        label: 'Help',
        children: [
          { label: 'Documentation', action: () => { window.dispatchEvent(new CustomEvent('app:docs')) } },
          { label: 'Keyboard Shortcuts', action: () => { window.dispatchEvent(new CustomEvent('app:shortcuts')) } },
          { divider: true } as MenuItem,
          { label: 'About', action: () => { window.dispatchEvent(new CustomEvent('app:about')) } },
        ],
      },
    ]
  }, [addToast, setRootPath, getActiveTab, markSaved, closeTab, toggleSidebar, toggleTerminal, toggleChat, chatVisible, addTab])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const key = e.key.toLowerCase()

      // File
      if (ctrl && key === 'o') {
        e.preventDefault()
        if (!window.electronAPI) {
          addToast({ message: 'Electron API not available', type: 'error' })
          return
        }
        void window.electronAPI.selectFolder().then((p) => {
          if (p) setRootPath(p)
        }).catch((err: unknown) => {
          addToast({ message: 'Failed to open folder: ' + String(err), type: 'error' })
        })
        return
      }
      if (ctrl && key === 's') {
        e.preventDefault()
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
        return
      }
      if (ctrl && key === 'w') {
        e.preventDefault()
        const tab = getActiveTab()
        if (tab) closeTab(tab.path)
        return
      }

      // Edit
      if (ctrl && key === 'z') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('editor:undo'))
        return
      }
      if (ctrl && key === 'y') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('editor:redo'))
        return
      }
      if (ctrl && key === 'f') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('editor:find'))
        return
      }
      if (ctrl && shift && key === 'f') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('editor:replace'))
        return
      }

      // View
      if (ctrl && shift && key === 'p') {
        e.preventDefault()
        addToast({ message: 'Command Palette coming soon', type: 'info' })
        return
      }
      if (ctrl && key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }
      if (ctrl && key === 'j') {
        e.preventDefault()
        toggleTerminal()
        addTab()
        return
      }
      if (key === 'f11') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('window:fullscreen'))
        return
      }

      // Code
      if (ctrl && key === 'p') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('editor:gotoFile'))
        return
      }
      if (key === 'f12') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('editor:gotoDefinition'))
        return
      }
      if (ctrl && shift && key === 'i') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('editor:format'))
        return
      }
      if (ctrl && key === '/') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('editor:comment'))
        return
      }

      // Terminal
      if (ctrl && key === '`') {
        e.preventDefault()
        toggleTerminal()
        addTab()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler) }
  }, [addToast, setRootPath, getActiveTab, markSaved, closeTab, toggleSidebar, toggleTerminal, addTab])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#1E1F22]">
      {/* Title bar / Menu */}
      <div className="flex h-[42px] shrink-0 items-center border-b border-[#4E5254] bg-[#2B2D30] px-3 app-drag">
        <MenuBar items={menuItems()} />
        <div className="flex-1 app-drag" />
        <WindowControls />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Sidebar splitter */}
        {sidebarVisible && !sidebarCollapsed && (
          <ResizableSplitter
            direction="horizontal"
            onResize={handleSidebarResize}
          />
        )}

        {/* Center area: Editor + Terminal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            {/* Editor */}
            <EditorArea />

            {/* Chat splitter */}
            {chatVisible && (
              <ResizableSplitter
                direction="horizontal"
                onResize={handleChatResize}
              />
            )}

            {/* Chat panel */}
            <ChatPanel />
          </div>

          {/* Terminal splitter */}
          {terminalVisible && !terminalCollapsed && (
            <ResizableSplitter
              direction="vertical"
              onResize={handleTerminalResize}
              onResizeEnd={() => {
                window.dispatchEvent(new CustomEvent('terminal:resize'))
              }}
            />
          )}

          {/* Terminal */}
          <TerminalPanel />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
