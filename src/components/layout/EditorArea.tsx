import type { JSX } from 'react'
import { useLayoutStore } from '../../stores/layoutStore'

export function EditorArea(): JSX.Element {
  const { sidebarVisible, sidebarWidth, sidebarCollapsed, chatVisible, chatWidth } = useLayoutStore()

  const sidebarW = sidebarVisible ? (sidebarCollapsed || sidebarWidth <= 50 ? 40 : sidebarWidth) : 0
  const chatW = chatVisible ? chatWidth : 0

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#1E1F22]">
      {/* Editor tab bar */}
      <div className="flex h-9 shrink-0 items-center border-b border-[#4E5254] bg-[#2B2D30] px-2">
        <div className="flex h-full items-center gap-1">
          <div className="flex h-7 items-center gap-2 rounded-t bg-[#1E1F22] px-3 text-xs text-[#DFE1E5]">
            <span>main.tsx</span>
            <button type="button" className="text-[#8C8C8C] hover:text-[#DFE1E5]">×</button>
          </div>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="text-sm text-[#8C8C8C]">
          Editor placeholder (Monaco Editor will be integrated here)
        </div>
        <div className="mt-2 text-xs text-[#5C5C5C]">
          Sidebar: {sidebarW}px | Chat: {chatW}px
        </div>
      </div>
    </div>
  )
}
