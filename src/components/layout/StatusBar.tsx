import type { JSX } from 'react'
import { useLayoutStore } from '../../stores/layoutStore'
import { useGitStore } from '../../stores/gitStore'

export function StatusBar(): JSX.Element {
  const { statusMessage, cursorLine, cursorColumn, encoding } = useLayoutStore()
  const { isRepo, status } = useGitStore()

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-[#4E5254] bg-[#2B2D30] px-3 text-xs text-[#8C8C8C]">
      <div className="flex items-center gap-4">
        <span>{statusMessage}</span>
        {isRepo && status?.branch && (
          <span className="text-[#A9B7C6]">
            {status.branch}
            {status.ahead > 0 || status.behind > 0 ? ` ↑${status.ahead} ↓${status.behind}` : ''}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>Ln {cursorLine}, Col {cursorColumn}</span>
        <span>{encoding}</span>
        <span>UTF-8</span>
      </div>
    </div>
  )
}
