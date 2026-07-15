import { useEffect, useRef, useState, useMemo } from 'react'
import type { JSX } from 'react'
import { Modal } from '../common/Modal'
import { useFileStore, type FileNode } from '../../stores/fileStore'
import { useEditorStore } from '../../stores/editorStore'
import { isImageFile } from '../../lib/fileTreeActions'

interface FileQuickOpenProps {
  isOpen: boolean
  onClose: () => void
}

function collectFiles(nodes: FileNode[], result: FileNode[] = []): FileNode[] {
  for (const node of nodes) {
    if (node.isFile) {
      result.push(node)
    }
    if (node.children) {
      collectFiles(node.children, result)
    }
  }
  return result
}

export function FileQuickOpen({ isOpen, onClose }: FileQuickOpenProps): JSX.Element | null {
  const { files } = useFileStore()
  const { openTab } = useEditorStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allFiles = useMemo(() => collectFiles(files), [files])
  const filtered = allFiles.filter((f) => {
    const q = query.toLowerCase()
    return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
  })

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      inputRef.current?.focus()
    }
  }, [isOpen])

  const openFile = (path: string, name: string): void => {
    if (isImageFile(name)) {
      openTab(path, name, '')
    } else {
      void window.electronAPI?.readFile(path).then((result) => {
        if ('content' in result) {
          openTab(path, name, result.content)
        }
      })
    }
    onClose()
  }

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
        const file = filtered[selectedIndex]
        if (file) openFile(file.path, file.name)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler) }
  }, [isOpen, filtered.length, selectedIndex, onClose])

  if (!isOpen) return null

  return (
    <Modal title="Go to File" onClose={onClose} widthClass="w-[560px]">
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
          placeholder="Type a file name..."
          className="w-full rounded border border-[#4E5254] bg-[#1E1F22] px-2 py-1.5 text-sm text-[#DFE1E5] outline-none focus:border-[#3574F0]"
        />
        <div className="max-h-[360px] overflow-auto">
          {filtered.length === 0 && (
            <div className="px-2 py-4 text-center text-xs text-[#8C8C8C]">No matching files</div>
          )}
          {filtered.map((file, idx) => (
            <button
              key={file.path}
              type="button"
              onClick={() => { openFile(file.path, file.name) }}
              onMouseEnter={() => { setSelectedIndex(idx) }}
              className={[
                'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs',
                idx === selectedIndex ? 'bg-[#3574F0] text-white' : 'text-[#DFE1E5] hover:bg-[#3C3F41]',
              ].join(' ')}
            >
              <span>{file.name}</span>
              <span className={['truncate pl-2 text-[10px]', idx === selectedIndex ? 'text-white/80' : 'text-[#8C8C8C]'].join(' ')}>
                {file.path}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
