import { useRef, useEffect } from 'react'
import type { JSX } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { MessageBubble } from './MessageBubble'
import { ThinkingBlock } from './ThinkingBlock'

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
        return <MessageBubble key={message.id} message={message} />
      })}
    </div>
  )
}
