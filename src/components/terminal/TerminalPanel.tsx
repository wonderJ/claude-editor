import { useRef, useEffect, useState, useCallback } from 'react'
import type { JSX } from 'react'
import { ChevronUp, Settings } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import { useTerminalStore } from '../../stores/terminalStore'
import { useFileStore } from '../../stores/fileStore'
import { TerminalTabBar } from './TerminalTabBar'
import { XTerm } from './XTerm'

export function TerminalPanel(): JSX.Element {
  const {
    terminalVisible,
    terminalHeight,
    terminalCollapsed,
    setTerminalCollapsed,
  } = useLayoutStore()

  const {
    tabs,
    activeTabId,
    settings,
    addTab,
    removeTab,
    setActiveTab,
  } = useTerminalStore()

  const { addToast, rootPath } = useFileStore()
  const [showSettings, setShowSettings] = useState(false)
  const xtermContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const isCollapsed = terminalCollapsed || terminalHeight <= 40
  const cwd = rootPath ?? ''

  const resizeTerminal = useCallback((id: string): void => {
    const el = xtermContainerRefs.current.get(id)
    if (!el) return
    const resizeFn = (el as unknown as Record<string, unknown>).termResize as (() => { cols: number; rows: number }) | undefined
    const dims = resizeFn?.()
    if (dims) {
      void window.electronAPI?.terminalResize(id, dims.cols, dims.rows)
    }
  }, [])

  const focusTerminal = useCallback((id: string): void => {
    const tryFocus = (attempts = 0): void => {
      const el = xtermContainerRefs.current.get(id)
      if (!el) return
      const focusFn = (el as unknown as Record<string, unknown>).termFocus as (() => void) | undefined
      if (typeof focusFn === 'function') {
        focusFn()
        return
      }
      if (attempts < 20) {
        setTimeout(() => { tryFocus(attempts + 1) }, 30)
      }
    }
    tryFocus()
  }, [])

  // Expose imperative focus method for context-menu actions that need to
  // focus a specific terminal immediately without waiting for React state.
  useEffect(() => {
    ;(window as unknown as Record<string, (id: string) => void>).__focusTerminal = (id: string) => {
      focusTerminal(id)
    }
    return () => {
      delete (window as unknown as Record<string, unknown>).__focusTerminal
    }
  }, [focusTerminal])

  const createTerminal = useCallback((id: string, terminalCwd = cwd): void => {
    void (async () => {
      try {
        const result = await window.electronAPI?.terminalCreate(id, terminalCwd)
        if (result && 'error' in result) {
          addToast({ message: 'Failed to create terminal: ' + result.error, type: 'error' })
          return
        }
        setTimeout(() => {
          resizeTerminal(id)
          focusTerminal(id)
        }, 100)
      } catch (err) {
        addToast({ message: 'Terminal creation error: ' + String(err), type: 'error' })
      }
    })()
  }, [addToast, cwd, resizeTerminal, focusTerminal])

  // Create first terminal tab if none exist
  useEffect(() => {
    if (tabs.length === 0 && terminalVisible && !isCollapsed) {
      const id = addTab(cwd)
      createTerminal(id, cwd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length, terminalVisible, isCollapsed, addTab, cwd])

  const handleAddTab = useCallback((): void => {
    const id = addTab(cwd)
    createTerminal(id, cwd)
  }, [addTab, cwd, createTerminal])

  const handleRemoveTab = useCallback((id: string): void => {
    void window.electronAPI?.terminalKill(id)
    removeTab(id)
  }, [removeTab])

  function callActive(method: 'termClear' | 'termScrollToTop' | 'termScrollToBottom'): void {
    if (!activeTabId) return
    const el = xtermContainerRefs.current.get(activeTabId)
    if (!el) return
    const fn = (el as unknown as Record<string, (() => void) | undefined>)[method]
    if (typeof fn === 'function') fn()
  }

  useEffect(() => {
    const onClear = () => { callActive('termClear') }
    const onKill = () => {
      const id = useTerminalStore.getState().activeTabId
      if (id) {
        const { removeTab } = useTerminalStore.getState()
        void window.electronAPI?.terminalKill(id)
        removeTab(id)
      }
    }
    const onTop = () => { callActive('termScrollToTop') }
    const onBottom = () => { callActive('termScrollToBottom') }
    window.addEventListener('terminal:clear', onClear)
    window.addEventListener('terminal:kill', onKill)
    window.addEventListener('terminal:scrollTop', onTop)
    window.addEventListener('terminal:scrollBottom', onBottom)
    return () => {
      window.removeEventListener('terminal:clear', onClear)
      window.removeEventListener('terminal:kill', onKill)
      window.removeEventListener('terminal:scrollTop', onTop)
      window.removeEventListener('terminal:scrollBottom', onBottom)
    }
  }, [activeTabId])

  // Focus/resize active terminal when requested from other components.
  useEffect(() => {
    const onFocus = () => {
      if (!activeTabId) return
      // Wait for any expand/show animation and React layout flush before
      // moving browser focus into the xterm textarea.
      window.setTimeout(() => {
        resizeTerminal(activeTabId)
        focusTerminal(activeTabId)
      }, 220)
    }
    window.addEventListener('terminal:focus', onFocus)
    return () => { window.removeEventListener('terminal:focus', onFocus) }
  }, [activeTabId, resizeTerminal, focusTerminal])

  // Resize/focus active terminal when expanding from collapsed state.
  const wasCollapsedRef = useRef(isCollapsed)
  useEffect(() => {
    if (wasCollapsedRef.current && !isCollapsed && activeTabId) {
      resizeTerminal(activeTabId)
      focusTerminal(activeTabId)
    }
    wasCollapsedRef.current = isCollapsed
  }, [isCollapsed, activeTabId, resizeTerminal, focusTerminal])

  // Resize/focus active terminal when showing the panel after it was hidden.
  const wasVisibleRef = useRef(terminalVisible)
  useEffect(() => {
    if (!wasVisibleRef.current && terminalVisible && activeTabId) {
      resizeTerminal(activeTabId)
      focusTerminal(activeTabId)
    }
    wasVisibleRef.current = terminalVisible
  }, [terminalVisible, activeTabId, resizeTerminal, focusTerminal])

  const handleSelectTab = useCallback((id: string): void => {
    setActiveTab(id)
    setTimeout(() => {
      resizeTerminal(id)
      focusTerminal(id)
    }, 50)
  }, [setActiveTab, resizeTerminal, focusTerminal])

  const handleTerminalData = useCallback((id: string, data: string) => {
    void window.electronAPI?.terminalWrite(id, data)
  }, [])

  // Handle keyboard events - let shell handle Up/Down history natively
  // We only intercept Tab to allow shell completion, and Enter to track commands
  const handleTerminalKey = useCallback((_id: string, e: { key: string; domEvent: KeyboardEvent }) => {
    const { key } = e

    // Tab: pass through to shell for native completion
    if (key === '\t') {
      return
    }

    // Enter: track command for potential "send to Claude" feature
    if (key === '\r' || key === '\n') {
      // Command tracking happens via onData or terminal output parsing
    }
  }, [])

  return (
    <div className={['flex shrink-0 flex-col border-t border-[#4E5254] bg-[#1E1F22] transition-[height] duration-200 ease-out relative overflow-hidden', !terminalVisible ? 'hidden' : ''].join(' ')} style={{ height: isCollapsed ? 32 : terminalHeight }}>
      {/* Tab bar + controls */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-[#4E5254] bg-[#2B2D30]">
        <TerminalTabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onAddTab={handleAddTab}
          onRemoveTab={handleRemoveTab}
          onSelectTab={handleSelectTab}
        />
        <div className="flex items-center gap-1 px-2">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            onClick={() => { setShowSettings(!showSettings) }}
            title="Terminal settings"
          >
            <Settings size={14} />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            onClick={() => { setTerminalCollapsed(!isCollapsed) }}
            title={isCollapsed ? 'Expand terminal' : 'Collapse terminal'}
          >
            <ChevronUp size={16} className={isCollapsed ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="flex shrink-0 gap-4 border-b border-[#4E5254] bg-[#2B2D30] px-3 py-2">
          <label className="flex items-center gap-2 text-xs text-[#DFE1E5]">
            Font size
            <input
              type="number"
              className="w-12 rounded border border-[#4E5254] bg-[#1E1F22] px-1 text-xs text-[#DFE1E5]"
              value={settings.fontSize}
              min={8}
              max={32}
              onChange={(e) => { useTerminalStore.getState().updateSettings({ fontSize: Number(e.target.value) }) }}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-[#DFE1E5]">
            Cursor
            <select
              className="rounded border border-[#4E5254] bg-[#1E1F22] px-1 text-xs text-[#DFE1E5]"
              value={settings.cursorStyle}
              onChange={(e) => { useTerminalStore.getState().updateSettings({ cursorStyle: e.target.value as 'block' | 'bar' | 'underline' }) }}
            >
              <option value="block">Block</option>
              <option value="bar">Bar</option>
              <option value="underline">Underline</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-[#DFE1E5]">
            <input
              type="checkbox"
              checked={settings.cursorBlink}
              onChange={(e) => { useTerminalStore.getState().updateSettings({ cursorBlink: e.target.checked }) }}
            />
            Blink
          </label>
        </div>
      )}

      {/* Terminal instances: keep mounted and at a fixed size so xterm/ConPTY
          are not resized and do not repaint the screen on collapse/expand. */}
      <div
        className={[
          'absolute left-0 top-8 w-full overflow-hidden',
          isCollapsed ? 'opacity-0 pointer-events-none' : '',
        ].join(' ')}
        style={{ height: Math.max(terminalHeight - 32, 100) }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            ref={(el) => {
              if (el) {
                xtermContainerRefs.current.set(tab.id, el)
              } else {
                xtermContainerRefs.current.delete(tab.id)
              }
            }}
            className={tab.id === activeTabId ? 'relative z-10 h-full w-full' : 'invisible absolute inset-0 h-full w-full'}
          >
            <XTerm
              id={tab.id}
              settings={settings}
              onData={handleTerminalData}
              onKey={handleTerminalKey}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
