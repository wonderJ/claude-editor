import type { JSX } from 'react'
import type { ChatMessage } from '../../stores/chatStore'
import { ImagePreview } from './ImagePreview'

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
        {message.images && message.images.length > 0 && (
          <div className="mb-2">
            <ImagePreview images={message.images} />
          </div>
        )}
        <MessageContent content={message.content} isStreaming={message.isStreaming ?? false} />
      </div>
    </div>
  )
}

function MessageContent({ content, isStreaming }: { content: string; isStreaming: boolean }): JSX.Element {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  const codeBlocks: { lines: string[]; lang: string; depth: number }[] = []
  let currentDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    // Match ``` with optional language, track nesting depth
    if (trimmed.startsWith('```')) {
      if (currentDepth === 0) {
        // Start outer code block
        currentDepth = 1
        codeBlocks.push({ lines: [], lang: trimmed.slice(3).trim(), depth: 1 })
      } else if (trimmed === '```') {
        // Check if this closes the current block or is nested
        const currentBlock = codeBlocks[codeBlocks.length - 1]
        if (currentBlock && currentDepth === currentBlock.depth) {
          // Close current block
          elements.push(
            <CodeBlock key={`code-${i}`} lang={currentBlock.lang} code={currentBlock.lines.join('\n')} />
          )
          codeBlocks.pop()
          currentDepth = 0
        } else {
          // Nested code block start
          currentDepth++
          codeBlocks.push({ lines: [], lang: trimmed.slice(3).trim(), depth: currentDepth })
        }
      } else {
        // Nested code block with language
        currentDepth++
        codeBlocks.push({ lines: [], lang: trimmed.slice(3).trim(), depth: currentDepth })
      }
      continue
    }

    if (currentDepth > 0) {
      const currentBlock = codeBlocks[codeBlocks.length - 1]
      if (currentBlock) {
        currentBlock.lines.push(line)
      }
      continue
    }

    if (line.trim() === '') {
      elements.push(<div key={`empty-${i}`} className="h-2" />)
    } else {
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed">
          {line}
          {isStreaming && i === lines.length - 1 && (
            <span className="animate-pulse">▋</span>
          )}
        </p>
      )
    }
  }

  // Handle unclosed code blocks
  while (codeBlocks.length > 0) {
    const block = codeBlocks.pop()
    if (block) {
      elements.push(
        <CodeBlock key={`code-end-${block.depth}`} lang={block.lang} code={block.lines.join('\n')} />
      )
    }
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
