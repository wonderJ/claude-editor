import { X } from 'lucide-react'
import { useState } from 'react'
import type { JSX } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { ContextMenu } from '../file-tree/ContextMenu'

export function TabBar(): JSX.Element {
  const {
    tabs,
    activeTabPath,
    switchTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
  } = useEditorStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null)

  return (
    <div className="flex max-h-32 shrink-0 flex-wrap items-center gap-0.5 overflow-y-auto border-b border-[#4E5254] bg-[#2B2D30] px-1 py-0.5">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath
        return (
          <div
            key={tab.path}
            className={[
              'flex h-7 cursor-pointer items-center gap-1.5 rounded-t px-2 text-xs',
              'select-none transition-colors duration-150',
              isActive
                ? 'bg-[#1E1F22] text-[#DFE1E5] border-b-2 border-[#3574F0]'
                : 'text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]',
            ].join(' ')}
            onClick={() => {
              switchTab(tab.path)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              window.dispatchEvent(new CustomEvent('filetree:closeContextMenu'))
              setContextMenu({ x: e.clientX, y: e.clientY, path: tab.path })
            }}
          >
            <span className="truncate max-w-[120px]">{tab.name}</span>
            {tab.isModified && (
              <span className="text-[#3574F0]">●</span>
            )}
            {tab.hasExternalChange && (
              <span className="text-[#EDA200]" title="File changed externally">●</span>
            )}
            <button
              type="button"
              className={[
                'flex h-4 w-4 items-center justify-center rounded text-[10px]',
                'hover:bg-[#4E5254] hover:text-[#DFE1E5]',
              ].join(' ')}
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.path)
              }}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => { setContextMenu(null) }}
          items={[
            {
              label: 'Close',
              action: () => { closeTab(contextMenu.path) },
              shortcut: 'Ctrl+W',
            },
            {
              label: 'Close Others',
              action: () => { closeOtherTabs(contextMenu.path) },
            },
            {
              label: 'Close All',
              action: () => { closeAllTabs() },
            },
            { separator: true, label: '', action: () => {} },
            {
              label: 'Split Right',
              disabled: true,
              action: () => {},
            },
            { separator: true, label: '', action: () => {} },
            {
              label: 'Copy Path',
              action: () => {
                void navigator.clipboard.writeText(contextMenu.path)
              },
            },
          ]}
        />
      )}
    </div>
  )
}
