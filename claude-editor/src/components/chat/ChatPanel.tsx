import { useEffect } from 'react'
import type { JSX } from 'react'
import { MessageSquare, X, Trash2, Power, RotateCcw, Cpu } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import { useChatStore } from '../../stores/chatStore'
import { useCliStore } from '../../stores/cliStore'
import { useFileStore } from '../../stores/fileStore'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

export function ChatPanel(): JSX.Element {
  const { chatVisible, chatWidth, toggleChat } = useLayoutStore()
  const { clearChat, appendStream, finishStream } = useChatStore()
  const { status, restartCli, setStatus, setError } = useCliStore()
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

  // CLI must be started manually - claude is an interactive CLI, not a daemon
  // useEffect(() => {
  //   if (status === 'offline') {
  //     void startCli()
  //   }
  // }, [status, startCli])

  if (!chatVisible) {
    return <div className="hidden" />
  }

  const statusColor = {
    offline: 'bg-[#4E5254]',
    online: 'bg-[#36B37E]',
    thinking: 'bg-[#FFC107]',
    error: 'bg-[#E53E3E]',
  }[status]

  const modelLabel = 'Claude 3.5 Sonnet'

  return (
    <div className="flex shrink-0 flex-col border-l border-[#4E5254] bg-[#2B2D30] transition-[width] duration-200 ease-out" style={{ width: chatWidth }}>
      {/* Chat header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#4E5254] px-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#DFE1E5]">
          <MessageSquare size={14} />
          <span>Claude</span>
          <div className="flex items-center gap-1 rounded bg-[#1E1F22] px-1.5 py-0.5 text-[10px] text-[#8C8C8C]">
            <Cpu size={10} />
            {modelLabel}
          </div>
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
              addToast({ message: 'Claude CLI is interactive only. Use Terminal instead.', type: 'info' })
            }}
            title="CLI not available"
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
