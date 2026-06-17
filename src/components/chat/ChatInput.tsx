import { useRef, useCallback } from 'react'
import type { JSX } from 'react'
import { Send, Paperclip } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'

export function ChatInput(): JSX.Element {
  const { inputValue, setInputValue, sendMessage, isLoading } = useChatStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const content = inputValue.trim()
    if (!content || isLoading) return
    sendMessage(content)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [inputValue, isLoading, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = String(Math.min(el.scrollHeight, 200)) + 'px'
  }, [setInputValue])

  return (
    <div className="shrink-0 border-t border-[#4E5254] p-3">
      <div className="flex items-end gap-2 rounded-md bg-[#313438] p-2">
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
          title="Attach file"
        >
          <Paperclip size={14} />
        </button>
        <textarea
          ref={textareaRef}
          className="min-h-[24px] max-h-[200px] flex-1 resize-none bg-transparent text-sm text-[#DFE1E5] placeholder-[#5C5C5C] outline-none"
          placeholder="Ask Claude... (Ctrl+Enter to send)"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />
        <button
          type="button"
          className={[
            'flex h-7 w-7 shrink-0 items-center justify-center rounded',
            inputValue.trim() && !isLoading
              ? 'bg-[#3574F0] text-white hover:bg-[#4682F5]'
              : 'text-[#5C5C5C]',
          ].join(' ')}
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
