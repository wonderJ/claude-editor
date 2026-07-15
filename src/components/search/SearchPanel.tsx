import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { Modal } from '../common/Modal'

interface SearchPanelProps {
  isOpen: boolean
  onClose: () => void
  mode: 'find' | 'replace'
}

export function SearchPanel({ isOpen, onClose, mode }: SearchPanelProps): JSX.Element | null {
  const [query, setQuery] = useState('')
  const [replace, setReplace] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setReplace('')
      inputRef.current?.focus()
    }
  }, [isOpen, mode])

  if (!isOpen) return null

  return (
    <Modal title={mode === 'replace' ? 'Replace in Files' : 'Find in Files'} onClose={onClose} widthClass="w-[520px]">
      <div className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value) }}
          placeholder="Search text..."
          className="w-full rounded border border-[#4E5254] bg-[#1E1F22] px-2 py-1.5 text-sm text-[#DFE1E5] outline-none focus:border-[#3574F0]"
        />
        {mode === 'replace' && (
          <input
            type="text"
            value={replace}
            onChange={(e) => { setReplace(e.target.value) }}
            placeholder="Replace with..."
            className="w-full rounded border border-[#4E5254] bg-[#1E1F22] px-2 py-1.5 text-sm text-[#DFE1E5] outline-none focus:border-[#3574F0]"
          />
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#8C8C8C]">Global search across project files.</span>
          <button
            type="button"
            disabled={!query.trim()}
            className="rounded bg-[#3574F0] px-3 py-1 text-xs text-white hover:bg-[#4682F5] disabled:opacity-50"
            onClick={() => {
              // Placeholder: future implementation will traverse files and show results.
              onClose()
            }}
          >
            {mode === 'replace' ? 'Replace All' : 'Search'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
