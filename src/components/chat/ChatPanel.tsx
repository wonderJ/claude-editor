import type { JSX } from 'react'
import { MessageSquare, X, Trash2 } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import { useChatStore } from '../../stores/chatStore'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

export function ChatPanel(): JSX.Element {
  const { chatVisible, chatWidth, toggleChat } = useLayoutStore()
  const { clearChat } = useChatStore()

  if (!chatVisible) {
    return <div className="hidden" />
  }

  return (
    <div className="flex shrink-0 flex-col border-l border-[#4E5254] bg-[#2B2D30] transition-[width] duration-200 ease-out" style={{ width: chatWidth }}>
      {/* Chat header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#4E5254] px-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#DFE1E5]">
          <MessageSquare size={14} />
          <span>Claude</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            onClick={() => {
              clearChat()
            }}
            title="Clear chat"
          >
            <Trash2 size={12} />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            onClick={toggleChat}
            title="Close chat"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <ChatMessages />
      <ChatInput />
    </div>
  )
}
