import type { JSX } from 'react'
import { Folder, Search, Settings } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import { FileTree } from '../file-tree/FileTree'

export function Sidebar(): JSX.Element {
  const { sidebarVisible, sidebarWidth, sidebarCollapsed, setSidebarCollapsed } = useLayoutStore()

  if (!sidebarVisible) {
    return <div className="hidden" />
  }

  const isCollapsed = sidebarCollapsed || sidebarWidth <= 50

  return (
    <div
      className="flex shrink-0 flex-col bg-[#2B2D30] transition-[width] duration-200 ease-out"
      style={{ width: isCollapsed ? 40 : sidebarWidth }}
    >
      {/* Sidebar toolbar */}
      <div className="flex h-9 items-center justify-between border-b border-[#4E5254] px-2">
        {!isCollapsed && <span className="text-xs font-medium text-[#8C8C8C]">EXPLORER</span>}
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
          onClick={() => {
            setSidebarCollapsed(!isCollapsed)
          }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Sidebar content */}
      {isCollapsed ? (
        <div className="flex flex-1 flex-col items-center gap-3 pt-3">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            title="Explorer"
          >
            <Folder size={18} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            title="Search"
            onClick={() => {
              setSidebarCollapsed(false)
            }}
          >
            <Search size={18} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <FileTree />
        </div>
      )}
    </div>
  )
}
