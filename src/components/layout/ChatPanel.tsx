import type { JSX } from 'react'
import { ChevronRight, MessageSquare, Send, X } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'

export function ChatPanel(): JSX.Element {
  const { chatVisible, chatWidth, toggleChat } = useLayoutStore()

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
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
          onClick={toggleChat}
          title="Close chat"
        >
          <X size={14} />
        </button>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-auto p-3">
        <div className="mb-3 flex justify-end">
          <div className="max-w-[85%] rounded-md bg-[#3574F0] px-3 py-2 text-sm text-white">
            Hello, can you help me with this code?
          </div>
        </div>
        <div className="mb-3 flex justify-start">
          <div className="max-w-[85%] rounded-md bg-[#313438] px-3 py-2 text-sm text-[#DFE1E5]">
            Sure! I can help you analyze and improve your code. What would you like me to look at?
          </div>
        </div>
        <div className="mb-3 flex justify-start">
          <div className="rounded-md border border-dashed border-[#4E5254] bg-[#2B2D30] px-3 py-2 text-sm text-[#8C8C8C]">
            <div className="flex items-center gap-1">
              <ChevronRight size={12} />
              <span>Thinking...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat input */}
      <div className="shrink-0 border-t border-[#4E5254] p-3">
        <div className="flex items-end gap-2 rounded-md bg-[#313438] p-2">
          <textarea
            className="min-h-[60px] max-h-[200px] flex-1 resize-none bg-transparent text-sm text-[#DFE1E5] placeholder-[#5C5C5C] outline-none"
            placeholder="Ask Claude..."
            rows={3}
          />
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
