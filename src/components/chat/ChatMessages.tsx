import { useRef, useEffect } from 'react'
import type { JSX } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { MessageBubble } from './MessageBubble'
import { ThinkingBlock } from './ThinkingBlock'

export function ChatMessages(): JSX.Element {
  const { messages } = useChatStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto p-3">
      {messages.map((message) => {
        if (message.role === 'thinking') {
          return <ThinkingBlock key={message.id} content={message.content} />
        }
        return <MessageBubble key={message.id} message={message} />
      })}
    </div>
  )
}
