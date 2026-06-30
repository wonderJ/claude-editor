import { useEffect, useRef } from 'react'
import type { JSX, ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
}

export function Modal({ title, onClose, children, footer, widthClass = 'w-[640px]' }: ModalProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => { document.removeEventListener('keydown', handleEsc) }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={ref}
        className={[
          'flex max-h-[85vh] flex-col rounded-md border border-[#4E5254] bg-[#2B2D30] shadow-xl',
          widthClass,
        ].join(' ')}
        onClick={(e) => { e.stopPropagation() }}
      >
        <div className="flex h-9 shrink-0 items-center justify-between px-3">
          <span className="truncate text-sm text-[#DFE1E5]">{title}</span>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 px-3 py-2">{footer}</div>
        )}
      </div>
    </div>
  )
}
