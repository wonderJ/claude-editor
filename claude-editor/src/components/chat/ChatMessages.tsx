import { useRef, useEffect } from 'react'
import type { JSX } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { MessageBubble } from './MessageBubble'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolCallCard } from './ToolCallCard'
import { DiffViewer } from './DiffViewer'

export function ChatMessages(): JSX.Element {
  const { messages } = useChatStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(true)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (shouldScrollRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20
    shouldScrollRef.current = isAtBottom
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto p-3" onScroll={handleScroll}>
      {messages.map((message) => {
        if (message.role === 'thinking') {
          return <ThinkingBlock key={message.id} content={message.content} />
        }
        return (
          <div key={message.id}>
            <MessageBubble message={message} />
            {/* Tool calls - rendered if present, but V1 backend does not parse them */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mb-2 ml-4 flex flex-col gap-1">
                {message.toolCalls.map((tool) => (
                  <ToolCallCard key={tool.id} toolCall={tool} />
                ))}
              </div>
            )}
            {/* Diff blocks - rendered if present, but V1 backend does not parse them */}
            {message.diffBlocks && message.diffBlocks.length > 0 && (
              <div className="mb-2 ml-4 flex flex-col gap-2">
                {message.diffBlocks.map((diff) => (
                  <DiffViewer key={diff.id} diff={diff} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
