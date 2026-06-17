import { useRef, useEffect, useState } from 'react'
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

  const { addToast } = useFileStore()
  const [showSettings, setShowSettings] = useState(false)
  const xtermContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const isCollapsed = terminalCollapsed || terminalHeight <= 40

  function resizeTerminal(id: string): void {
    const el = xtermContainerRefs.current.get(id)
    if (!el) return
    const resizeFn = (el as unknown as Record<string, unknown>).resize as (() => { cols: number; rows: number }) | undefined
    const dims = resizeFn?.()
    if (dims) {
      void window.electronAPI?.terminalResize(id, dims.cols, dims.rows)
    }
  }

  function createTerminal(id: string): void {
    void (async () => {
      try {
        const result = await window.electronAPI?.terminalCreate(id, '')
        if (result && 'error' in result) {
          addToast({ message: 'Failed to create terminal: ' + result.error, type: 'error' })
          return
        }
        setTimeout(() => {
          resizeTerminal(id)
        }, 100)
      } catch (err) {
        addToast({ message: 'Terminal creation error: ' + String(err), type: 'error' })
      }
    })()
  }

  // Create first terminal tab if none exist
  useEffect(() => {
    if (tabs.length === 0 && terminalVisible && !isCollapsed) {
      const id = addTab()
      createTerminal(id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length, terminalVisible, isCollapsed, addTab])

  function handleAddTab(): void {
    const id = addTab()
    createTerminal(id)
  }

  function handleRemoveTab(id: string): void {
    void window.electronAPI?.terminalKill(id)
    removeTab(id)
  }

  function handleSelectTab(id: string): void {
    setActiveTab(id)
    setTimeout(() => {
      resizeTerminal(id)
    }, 50)
  }

  function handleTerminalData(id: string, data: string): void {
    void window.electronAPI?.terminalWrite(id, data)
  }

  if (!terminalVisible) {
    return <div className="hidden" />
  }

  return (
    <div className="flex shrink-0 flex-col border-t border-[#4E5254] bg-[#1E1F22] transition-[height] duration-200 ease-out" style={{ height: isCollapsed ? 32 : terminalHeight }}>
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

      {/* Terminal instances */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
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
              className={tab.id === activeTabId ? 'h-full w-full' : 'hidden'}
            >
              <XTerm
                id={tab.id}
                settings={settings}
                onData={handleTerminalData}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
