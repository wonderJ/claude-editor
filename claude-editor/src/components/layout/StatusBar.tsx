import type { JSX } from 'react'
import { useLayoutStore } from '../../stores/layoutStore'

export function StatusBar(): JSX.Element {
  const { statusMessage, cursorLine, cursorColumn, encoding } = useLayoutStore()

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-[#4E5254] bg-[#2B2D30] px-3 text-xs text-[#8C8C8C]">
      <div className="flex items-center gap-4">
        <span>{statusMessage}</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Ln {cursorLine}, Col {cursorColumn}</span>
        <span>{encoding}</span>
        <span>UTF-8</span>
      </div>
    </div>
  )
}
