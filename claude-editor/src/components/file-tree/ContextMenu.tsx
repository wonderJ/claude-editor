import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'

interface ContextMenuItem {
  label: string
  icon?: string
  action: () => void
  separator?: boolean
  danger?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  x: number
  y: number
  onClose: () => void
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const winW = window.innerWidth
    const winH = window.innerHeight

    let px = x
    let py = y

    if (x + rect.width > winW) px = winW - rect.width - 8
    if (y + rect.height > winH) py = winH - rect.height - 8

    setPosition({ x: px, y: py })
  }, [x, y])

  useEffect(() => {
    const handleClick = () => {
      onClose()
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] rounded-md border border-[#4E5254] bg-[#2B2D30] py-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      {items.map((item, idx) =>
        item.separator ? (
          <div key={idx} className="my-1 h-px bg-[#4E5254]" />
        ) : (
          <button
            key={idx}
            type="button"
            className={[
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
              'hover:bg-[#3574F0] hover:text-white',
              item.danger ? 'text-[#E53E3E] hover:bg-[#E53E3E] hover:text-white' : 'text-[#DFE1E5]',
            ].join(' ')}
            onClick={() => {
              item.action()
              onClose()
            }}
          >
            {item.icon && <span className="text-xs">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  )
}
