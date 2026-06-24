import { useState, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { MessageSquare, X, Trash2, Power, RotateCcw, Cpu, History, Plus, Star, Download, Search } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import { useChatStore } from '../../stores/chatStore'
import { useCliStore } from '../../stores/cliStore'
import { useFileStore } from '../../stores/fileStore'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

export function ChatPanel(): JSX.Element {
  const { chatVisible, chatWidth, toggleChat } = useLayoutStore()
  const { clearChat, appendStream, finishStream, sessions, currentSessionId, createSession, switchSession, deleteSession, toggleFavorite, exportSession } = useChatStore()
  const { status, startCli, restartCli, setStatus, setError } = useCliStore()
  const { addToast } = useFileStore()

  const [showSessionPanel, setShowSessionPanel] = useState(false)
  const [sessionSearch, setSessionSearch] = useState('')

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
    })

    return () => {
      cleanupData?.()
      cleanupStatus?.()
      cleanupError?.()
    }
  }, [appendStream, finishStream, setStatus, setError, addToast])

  // Auto-start CLI when chat panel opens
  useEffect(() => {
    if (status === 'offline') {
      void startCli()
    }
  }, [status, startCli])

  const handleExport = useCallback((sessionId: string, format: 'markdown' | 'json') => {
    const data = exportSession(sessionId, format)
    if (!data) return
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${sessionId.slice(-6)}.${format === 'json' ? 'json' : 'md'}`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ message: `Exported as ${format.toUpperCase()}`, type: 'success' })
  }, [exportSession, addToast])

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(sessionSearch.toLowerCase()))
  )

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
            onClick={() => { setShowSessionPanel(!showSessionPanel) }}
            title="Session history"
          >
            <History size={12} />
          </button>
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

      {/* Session panel */}
      {showSessionPanel && (
        <div className="shrink-0 border-b border-[#4E5254] bg-[#1E1F22] p-2">
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
              <input
                type="text"
                className="w-full rounded bg-[#313438] py-1 pl-6 pr-2 text-[10px] text-[#DFE1E5] outline-none placeholder-[#5C5C5C]"
                placeholder="Search sessions..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="flex h-6 items-center gap-1 rounded bg-[#3574F0] px-2 text-[10px] text-white hover:bg-[#4682F5]"
              onClick={() => { createSession(); setShowSessionPanel(false) }}
            >
              <Plus size={10} />
              New
            </button>
          </div>
          <div className="max-h-40 overflow-auto">
            {filteredSessions.length === 0 && (
              <div className="py-2 text-center text-[10px] text-[#5C5C5C]">
                No sessions yet
              </div>
            )}
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center gap-1 rounded px-2 py-1.5 text-[11px] cursor-pointer ${
                  session.id === currentSessionId ? 'bg-[#3574F0]/20 text-[#3574F0]' : 'text-[#8C8C8C] hover:bg-[#3C3F41]'
                }`}
                onClick={() => { switchSession(session.id); setShowSessionPanel(false) }}
              >
                <button
                  type="button"
                  className={`${session.isFavorite ? 'text-[#FFC107]' : 'text-[#5C5C5C] hover:text-[#FFC107]'}`}
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(session.id) }}
                >
                  <Star size={10} fill={session.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <span className="flex-1 truncate">{session.title}</span>
                <span className="text-[#5C5C5C]">
                  {new Date(session.updatedAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  className="text-[#5C5C5C] hover:text-[#DFE1E5]"
                  onClick={(e) => { e.stopPropagation(); handleExport(session.id, 'markdown') }}
                  title="Export"
                >
                  <Download size={10} />
                </button>
                <button
                  type="button"
                  className="text-[#5C5C5C] hover:text-[#E53E3E]"
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                  title="Delete"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ChatMessages />
      <ChatInput />
    </div>
  )
}
