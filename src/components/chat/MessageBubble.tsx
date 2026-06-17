import type { JSX } from 'react'
import type { ChatMessage } from '../../stores/chatStore'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps): JSX.Element {
  const isUser = message.role === 'user'

  return (
    <div className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] rounded-md px-3 py-2 text-sm',
          isUser
            ? 'bg-[#3574F0] text-white'
            : 'bg-[#313438] text-[#DFE1E5]',
        ].join(' ')}
      >
        <MessageContent content={message.content} isStreaming={message.isStreaming ?? false} />
      </div>
    </div>
  )
}

function MessageContent({ content, isStreaming }: { content: string; isStreaming: boolean }): JSX.Element {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let codeBlock: string[] = []
  let inCodeBlock = false
  let codeLang = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLang = line.slice(3).trim()
        codeBlock = []
      } else {
        inCodeBlock = false
        elements.push(
          <CodeBlock key={i} lang={codeLang} code={codeBlock.join('\n')} />
        )
        codeBlock = []
      }
      continue
    }

    if (inCodeBlock) {
      codeBlock.push(line)
      continue
    }

    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(
        <p key={i} className="leading-relaxed">
          {line}
          {isStreaming && i === lines.length - 1 && (
            <span className="animate-pulse">▋</span>
          )}
        </p>
      )
    }
  }

  if (inCodeBlock && codeBlock.length > 0) {
    elements.push(<CodeBlock key="end" lang={codeLang} code={codeBlock.join('\n')} />)
  }

  return <div>{elements}</div>
}

function CodeBlock({ lang, code }: { lang: string; code: string }): JSX.Element {
  return (
    <div className="my-2 overflow-hidden rounded border border-[#4E5254] bg-[#1E1F22]">
      <div className="flex h-6 items-center justify-between border-b border-[#4E5254] bg-[#2B2D30] px-2">
        <span className="text-[10px] text-[#8C8C8C] uppercase">{lang || 'code'}</span>
        <button
          type="button"
          className="text-[10px] text-[#8C8C8C] hover:text-[#DFE1E5]"
          onClick={() => {
            navigator.clipboard.writeText(code).catch(() => {})
          }}
        >
          Copy
        </button>
      </div>
      <pre className="overflow-auto p-2 text-xs font-mono text-[#DFE1E5]">
        <code>{code}</code>
      </pre>
    </div>
  )
}
