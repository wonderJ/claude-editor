import { useRef, useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import { Send, Paperclip, AtSign, Zap, Brain, MessageSquare } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useCliStore } from '../../stores/cliStore'
import { useFileStore } from '../../stores/fileStore'
import { ImageUploader } from './ImageUploader'

export function ChatInput(): JSX.Element {
  const {
    inputValue,
    setInputValue,
    sendImageMessage,
    isLoading,
    pendingImages,
    mentionedFiles,
    addMentionedFile,
    removeMentionedFile,
    model,
    provider,
    streamingEnabled,
    thinkingMode,
    setModel,
    setProvider,
    setStreamingEnabled,
    setThinkingMode,
  } = useChatStore()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const { rootPath, treeData } = useFileStore()

  const handleSend = useCallback(() => {
    const content = inputValue.trim()
    if ((!content && pendingImages.length === 0) || isLoading) return
    sendImageMessage(content, pendingImages)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [inputValue, isLoading, pendingImages, sendImageMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === '@') {
      setShowMentionPicker(true)
      setMentionQuery('')
    }
  }, [handleSend])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = String(Math.min(el.scrollHeight, 200)) + 'px'

    // Check for @ mentions
    const lastAt = value.lastIndexOf('@')
    if (lastAt >= 0 && lastAt === value.length - 1) {
      setShowMentionPicker(true)
      setMentionQuery('')
    } else if (lastAt >= 0) {
      const afterAt = value.slice(lastAt + 1)
      if (!afterAt.includes(' ')) {
        setShowMentionPicker(true)
        setMentionQuery(afterAt)
      } else {
        setShowMentionPicker(false)
      }
    } else {
      setShowMentionPicker(false)
    }
  }, [setInputValue])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    let hasImage = false
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        hasImage = true
        break
      }
    }
    if (hasImage) {
      e.preventDefault()
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = () => {
              useChatStore.getState().addPendingImage(reader.result as string)
            }
            reader.readAsDataURL(file)
          }
        }
      }
    }
  }, [])

  const handleMentionSelect = useCallback((filePath: string) => {
    addMentionedFile(filePath)
    const lastAt = inputValue.lastIndexOf('@')
    if (lastAt >= 0) {
      setInputValue(inputValue.slice(0, lastAt) + `@${filePath} `)
    }
    setShowMentionPicker(false)
    textareaRef.current?.focus()
  }, [inputValue, setInputValue, addMentionedFile])

  // Filter files for mention picker
  const mentionFiles = useCallback(() => {
    if (!treeData) return []
    const allFiles: string[] = []
    const collect = (nodes: typeof treeData) => {
      for (const node of nodes) {
        if (node.isFile) allFiles.push(node.path)
        if (node.children) collect(node.children)
      }
    }
    collect(treeData)
    if (!mentionQuery) return allFiles.slice(0, 10)
    return allFiles.filter(f => f.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 10)
  }, [treeData, mentionQuery])()

  const hasContent = inputValue.trim().length > 0 || pendingImages.length > 0

  return (
    <div className="shrink-0 border-t border-[#4E5254] p-3">
      {/* Settings bar */}
      <div className="mb-2 flex items-center gap-2">
        {/* Provider switch */}
        <div className="flex rounded bg-[#1E1F22] text-[10px]">
          <button
            type="button"
            className={`px-2 py-1 rounded-l ${provider === 'claude' ? 'bg-[#3574F0] text-white' : 'text-[#8C8C8C] hover:text-[#DFE1E5]'}`}
            onClick={() => setProvider('claude')}
          >
            <MessageSquare size={10} className="inline mr-1" />
            Claude
          </button>
          <button
            type="button"
            className={`px-2 py-1 rounded-r ${provider === 'codex' ? 'bg-[#3574F0] text-white' : 'text-[#8C8C8C] hover:text-[#DFE1E5]'}`}
            onClick={() => setProvider('codex')}
          >
            <Zap size={10} className="inline mr-1" />
            Codex
          </button>
        </div>

        {/* Model switch */}
        <select
          className="rounded bg-[#1E1F22] px-2 py-1 text-[10px] text-[#DFE1E5] outline-none"
          value={model}
          onChange={(e) => setModel(e.target.value as 'opus' | 'sonnet' | 'haiku')}
        >
          <option value="opus">Opus</option>
          <option value="sonnet">Sonnet</option>
          <option value="haiku">Haiku</option>
        </select>

        {/* Streaming toggle */}
        <button
          type="button"
          className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${streamingEnabled ? 'bg-[#36B37E]/20 text-[#36B37E]' : 'bg-[#1E1F22] text-[#5C5C5C]'}`}
          onClick={() => setStreamingEnabled(!streamingEnabled)}
          title="Toggle streaming"
        >
          <Zap size={10} />
          Stream
        </button>

        {/* Thinking mode */}
        <select
          className="rounded bg-[#1E1F22] px-2 py-1 text-[10px] text-[#DFE1E5] outline-none"
          value={thinkingMode}
          onChange={(e) => setThinkingMode(e.target.value as 'off' | 'on' | 'extended')}
        >
          <option value="off">No Thinking</option>
          <option value="on">Thinking</option>
          <option value="extended">Extended</option>
        </select>
      </div>

      <ImageUploader />

      {/* Mentioned files */}
      {mentionedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {mentionedFiles.map((file, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1 rounded bg-[#3574F0]/20 px-2 py-0.5 text-[10px] text-[#3574F0]"
            >
              <AtSign size={8} />
              {file.split('/').pop()}
              <button
                type="button"
                className="hover:text-white"
                onClick={() => removeMentionedFile(idx)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 rounded-md bg-[#313438] p-2">
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
          title="Attach file"
        >
          <Paperclip size={14} />
        </button>
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            className="min-h-[24px] max-h-[200px] w-full resize-none bg-transparent text-sm text-[#DFE1E5] placeholder-[#5C5C5C] outline-none"
            placeholder="Ask Claude... (Enter to send, Shift+Enter newline, @ to mention file)"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
            disabled={isLoading}
          />
          {/* Mention picker */}
          {showMentionPicker && mentionFiles.length > 0 && (
            <div className="absolute bottom-full left-0 z-50 mb-1 max-h-40 w-64 overflow-auto rounded border border-[#4E5254] bg-[#2B2D30] shadow-lg">
              {mentionFiles.map((file) => (
                <button
                  key={file}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#DFE1E5] hover:bg-[#3574F0]"
                  onClick={() => handleMentionSelect(file)}
                >
                  <AtSign size={10} className="text-[#8C8C8C]" />
                  <span className="truncate">{file.replace(rootPath + '/', '')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className={[
            'flex h-7 w-7 shrink-0 items-center justify-center rounded',
            hasContent && !isLoading
              ? 'bg-[#3574F0] text-white hover:bg-[#4682F5]'
              : 'text-[#5C5C5C]',
          ].join(' ')}
          onClick={handleSend}
          disabled={!hasContent || isLoading}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
