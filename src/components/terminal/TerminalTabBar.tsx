import type { JSX } from 'react'
import { Plus, X, Terminal } from 'lucide-react'
import type { TerminalTab } from '../../stores/terminalStore'

interface TerminalTabBarProps {
  tabs: TerminalTab[]
  activeTabId: string | null
  onAddTab: () => void
  onRemoveTab: (id: string) => void
  onSelectTab: (id: string) => void
}

export function TerminalTabBar({ tabs, activeTabId, onAddTab, onRemoveTab, onSelectTab }: TerminalTabBarProps): JSX.Element {
  return (
    <div className="flex h-8 shrink-0 items-center gap-1 border-b border-[#4E5254] bg-[#2B2D30] px-2">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            className={[
              'flex cursor-pointer items-center gap-1.5 rounded-t px-3 py-1 text-xs',
              isActive
                ? 'bg-[#1E1F22] text-[#DFE1E5]'
                : 'text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]',
            ].join(' ')}
            onClick={() => { onSelectTab(tab.id) }}
          >
            <Terminal size={12} />
            <span className="max-w-[120px] truncate">{tab.name}</span>
            <button
              type="button"
              className="ml-1 flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-[#4E5254]"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveTab(tab.id)
              }}
            >
              <X size={10} />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
        onClick={onAddTab}
        title="New terminal"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
