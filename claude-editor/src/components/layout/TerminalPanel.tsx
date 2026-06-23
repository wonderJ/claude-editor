import type { JSX } from 'react'
import { ChevronUp, Terminal } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'

export function TerminalPanel(): JSX.Element {
  const {
    terminalVisible,
    terminalHeight,
    terminalCollapsed,
    setTerminalCollapsed,
  } = useLayoutStore()

  if (!terminalVisible) {
    return <div className="hidden" />
  }

  const isCollapsed = terminalCollapsed || terminalHeight <= 40

  return (
    <div className="flex shrink-0 flex-col border-t border-[#4E5254] bg-[#1E1F22] transition-[height] duration-200 ease-out">
      {/* Terminal tab bar */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[#4E5254] bg-[#2B2D30] px-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[#DFE1E5] hover:bg-[#3C3F41]"
        >
          <Terminal size={14} />
          <span>bash</span>
        </button>
        <div className="flex-1" />
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
          onClick={() => {
            setTerminalCollapsed(!isCollapsed)
          }}
          title={isCollapsed ? 'Expand terminal' : 'Collapse terminal'}
        >
          <ChevronUp
            size={16}
            className={isCollapsed ? 'rotate-180' : ''}
          />
        </button>
      </div>

      {/* Terminal content */}
      {!isCollapsed && (
        <div
          className="flex-1 overflow-auto p-2"
          style={{ height: terminalHeight - 32 }}
        >
          <div className="font-mono text-sm text-[#DFE1E5]">
            <div>$ ls -la</div>
            <div className="text-[#8C8C8C]">drwxr-xr-x 5 user staff 160 Jun 17 10:00 .</div>
            <div className="text-[#8C8C8C]">drwxr-xr-x 3 user staff 96 Jun 17 09:30 ..</div>
            <div className="mt-1">
              <span className="text-[#36B37E]">$</span>{' '}
              <span className="animate-pulse">█</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
