import { useEffect } from 'react'
import type { JSX } from 'react'
import { MessageSquare, X, Trash2, Power, RotateCcw } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import { useChatStore } from '../../stores/chatStore'
import { useCliStore } from '../../stores/cliStore'
import { useFileStore } from '../../stores/fileStore'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

export function ChatPanel(): JSX.Element {
  const { chatVisible, chatWidth, toggleChat } = useLayoutStore()
  const { clearChat, appendStream, finishStream } = useChatStore()
  const { status, startCli, stopCli, restartCli, setStatus, setError } = useCliStore()
  const { addToast } = useFileStore()

  // Listen for CLI events
  useEffect(() => {
    const cleanupData = window.electronAPI?.onCliData((response) => {
      if (response.type === 'text' || response.type === 'thinking') {
        appendStream(response.messageId, response.content)
      }
      if (response.done) {
        finishStream(response.messageId)
      }
    })

    const cleanupStatus = window.electronAPI?.onCliStatus((newStatus) => {
      setStatus(newStatus as 'offline' | 'online' | 'thinking' | 'error')
    })

    const cleanupError = window.electronAPI?.onCliError((error) => {
      setError(error)
      addToast({ message: 'CLI Error: ' + error, type: 'error' })
    })

    return () => {
      cleanupData?.()
      cleanupStatus?.()
      cleanupError?.()
    }
  }, [appendStream, finishStream, setStatus, setError, addToast])

  // Auto-start CLI on mount
  useEffect(() => {
    if (status === 'offline') {
      void startCli()
    }
  }, [status, startCli])

  if (!chatVisible) {
    return <div className="hidden" />
  }

  const statusColor = {
    offline: 'bg-[#4E5254]',
    online: 'bg-[#36B37E]',
    thinking: 'bg-[#FFC107]',
    error: 'bg-[#E53E3E]',
  }[status]

  return (
    <div className="flex shrink-0 flex-col border-l border-[#4E5254] bg-[#2B2D30] transition-[width] duration-200 ease-out" style={{ width: chatWidth }}>
      {/* Chat header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#4E5254] px-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#DFE1E5]">
          <MessageSquare size={14} />
          <span>Claude</span>
          <div className={`h-2 w-2 rounded-full ${statusColor}`} title={`CLI: ${status}`} />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            onClick={() => { void restartCli() }}
            title="Restart CLI"
          >
            <RotateCcw size={12} />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            onClick={() => {
              if (status === 'online') {
                void stopCli()
              } else {
                void startCli()
              }
            }}
            title={status === 'online' ? 'Stop CLI' : 'Start CLI'}
          >
            <Power size={12} />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            onClick={() => { clearChat() }}
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
