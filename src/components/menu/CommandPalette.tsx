import { useEffect, useRef, useState, useCallback } from 'react'
import type { JSX } from 'react'
import { Modal } from '../common/Modal'

export interface CommandPaletteItem {
  id: string
  label: string
  shortcut?: string
  category?: string
  action: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: CommandPaletteItem[]
}

export function CommandPalette({
  isOpen,
  onClose,
  commands,
}: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = commands.filter((cmd) => {
    const q = query.toLowerCase()
    return (
      cmd.label.toLowerCase().includes(q) ||
      (cmd.shortcut?.toLowerCase().includes(q) ?? false) ||
      (cmd.category?.toLowerCase().includes(q) ?? false)
    )
  })

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      inputRef.current?.focus()
    }
  }, [isOpen])

  const execute = useCallback(
    (index: number) => {
      const item = filtered[index]
      if (item) {
        item.action()
        onClose()
      }
    },
    [filtered, onClose]
  )

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % Math.max(filtered.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        execute(selectedIndex)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler) }
  }, [isOpen, filtered.length, selectedIndex, execute, onClose])

  if (!isOpen) return null

  return (
    <Modal title="Command Palette" onClose={onClose} widthClass="w-[560px]">
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
          }}
          placeholder="Type a command..."
          className="w-full rounded border border-[#4E5254] bg-[#1E1F22] px-2 py-1.5 text-sm text-[#DFE1E5] outline-none focus:border-[#3574F0]"
        />
        <div className="max-h-[360px] overflow-auto">
          {filtered.length === 0 && (
            <div className="px-2 py-4 text-center text-xs text-[#8C8C8C]">
              No matching commands
            </div>
          )}
          {filtered.map((cmd, idx) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => { execute(idx) }}
              onMouseEnter={() => { setSelectedIndex(idx) }}
              className={[
                'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs',
                idx === selectedIndex ? 'bg-[#3574F0] text-white' : 'text-[#DFE1E5] hover:bg-[#3C3F41]',
              ].join(' ')}
            >
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <span className={['text-[10px]', idx === selectedIndex ? 'text-white/80' : 'text-[#8C8C8C]'].join(' ')}>
                  {cmd.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
