import type { JSX } from 'react'
import { Folder, Search, Settings, GitBranch, GitCommitHorizontal } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import { FileTree } from '../file-tree/FileTree'
import { CommitPanel } from '../git/CommitPanel'
import { GitPanel } from '../git/GitPanel'

const PANEL_LABEL: Record<'files' | 'commit' | 'git', string> = {
  files: 'EXPLORER',
  commit: 'COMMIT',
  git: 'GIT',
}

export function Sidebar(): JSX.Element {
  const {
    sidebarVisible,
    sidebarWidth,
    sidebarCollapsed,
    sidebarPanel,
    setSidebarCollapsed,
    setSidebarPanel,
  } = useLayoutStore()

  if (!sidebarVisible) {
    return <div className="hidden" />
  }

  const isCollapsed = sidebarCollapsed || sidebarWidth <= 50

  const railButton = (
    panel: 'files' | 'commit' | 'git',
    label: string,
    Icon: typeof Folder,
    size: number
  ) => (
    <button
      type="button"
      className={[
        'flex items-center justify-center rounded',
        size === 18 ? 'h-8 w-8' : 'h-7 w-7',
        sidebarPanel === panel
          ? 'bg-[#4E5254] text-[#DFE1E5]'
          : 'text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]',
      ].join(' ')}
      title={label}
      onClick={() => {
        setSidebarPanel(panel)
        setSidebarCollapsed(false)
      }}
    >
      <Icon size={size} />
    </button>
  )

  return (
    <div
      className="flex shrink-0 flex-col bg-[#2B2D30] transition-[width] duration-200 ease-out"
      style={{ width: isCollapsed ? 40 : sidebarWidth }}
    >
      {/* Sidebar toolbar */}
      <div className="flex h-9 items-center justify-between border-b border-[#4E5254] px-2">
        {!isCollapsed && (
          <span className="text-xs font-medium text-[#8C8C8C]">{PANEL_LABEL[sidebarPanel]}</span>
        )}
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
        <div className="flex flex-1 flex-col items-center pt-3">
          {/* Top group */}
          <div className="flex flex-col items-center gap-3">
            {railButton('files', 'Explorer', Folder, 18)}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
              title="Search"
              onClick={() => { setSidebarCollapsed(false) }}
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
          {/* Bottom group (Git) — pinned to lower-left corner */}
          <div className="mt-auto flex flex-col items-center gap-3 pb-3">
            {railButton('commit', 'Commit', GitCommitHorizontal, 18)}
            {railButton('git', 'Git', GitBranch, 18)}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Activity rail */}
          <div className="flex w-9 shrink-0 flex-col items-center border-r border-[#4E5254] pt-2">
            {/* Top group */}
            <div className="flex flex-col items-center gap-2">
              {railButton('files', 'Explorer', Folder, 16)}
            </div>
            {/* Bottom group (Git) — pinned to lower-left corner */}
            <div className="mt-auto flex flex-col items-center gap-2 pb-2">
              {railButton('commit', 'Commit', GitCommitHorizontal, 16)}
              {railButton('git', 'Git', GitBranch, 16)}
            </div>
          </div>
          {/* Panel */}
          <div className="flex-1 overflow-hidden">
            {sidebarPanel === 'commit' ? (
              <CommitPanel />
            ) : sidebarPanel === 'git' ? (
              <GitPanel />
            ) : (
              <FileTree />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
