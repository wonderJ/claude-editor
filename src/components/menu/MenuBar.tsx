import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'

export interface MenuItemDef {
  id?: string
  label: string
  shortcut?: string
  disabled?: boolean
  divider?: boolean
  children?: MenuItemDef[]
  action?: () => void
}

interface MenuBarProps {
  items: { label: string; children: MenuItemDef[] }[]
}

function stopPropagation(e: React.MouseEvent): void {
  e.stopPropagation()
}

function MenuDropdown({
  items,
  onClose,
}: {
  items: MenuItemDef[]
  onClose: () => void
}): JSX.Element {
  const [openChild, setOpenChild] = useState<MenuItemDef | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleClose = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { setOpenChild(null) }, 150)
  }

  const cancelClose = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return (
    <div className="min-w-[200px] rounded-md border border-[#4E5254] bg-[#2B2D30] py-1 shadow-lg">
      {items.map((item, i) => {
        if (item.divider) {
          return <div key={`div-${i}`} className="my-1 border-t border-[#4E5254]" />
        }
        const hasChildren = item.children && item.children.length > 0
        return (
          <div
            key={`${item.label}-${i}`}
            className="relative"
            onMouseEnter={() => {
              cancelClose()
              if (hasChildren) setOpenChild(item)
            }}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              disabled={item.disabled}
              onClick={(e) => {
                stopPropagation(e)
                if (!item.disabled && item.action) {
                  item.action()
                  onClose()
                }
              }}
              className={[
                'flex w-full items-center justify-between px-3 py-1.5 text-left text-xs',
                item.disabled
                  ? 'cursor-not-allowed text-[#5C5C5C]'
                  : 'text-[#DFE1E5] hover:bg-[#3574F0]',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                {item.label}
              </span>
              <span className="flex items-center gap-2">
                {item.shortcut && (
                  <span className="text-[10px] text-[#8C8C8C]">{item.shortcut}</span>
                )}
                {hasChildren && <span className="text-[10px]">▶</span>}
              </span>
            </button>
            {hasChildren && openChild === item && (
              <div className="absolute left-full top-0 pl-0.5">
                <MenuDropdown items={item.children ?? []} onClose={onClose} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function MenuBar({ items }: MenuBarProps): JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openIndex === null) return
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpenIndex(null)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openIndex])

  return (
    <div ref={containerRef} className="flex items-center gap-1 text-xs text-[#DFE1E5] app-no-drag">
      {items.map((menu, idx) => (
        <div key={menu.label} className="relative">
          <button
            type="button"
            className={`app-no-drag rounded px-2 py-1 ${openIndex === idx ? 'bg-[#4E5254]' : 'hover:bg-[#3C3F41]'}`}
            onClick={() => { setOpenIndex(openIndex === idx ? null : idx) }}
            onMouseEnter={() => { if (openIndex !== null) setOpenIndex(idx) }}
          >
            {menu.label}
          </button>
          {openIndex === idx && (
            <div className="absolute left-0 top-full z-50 mt-1">
              <MenuDropdown items={menu.children} onClose={() => { setOpenIndex(null) }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
