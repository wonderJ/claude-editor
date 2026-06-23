import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface ResizableSplitterProps {
  direction: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
  onResizeEnd?: () => void
  className?: string
}

export function ResizableSplitter({
  direction,
  onResize,
  onResizeEnd,
  className = '',
}: ResizableSplitterProps): JSX.Element {
  const [isDragging, setIsDragging] = useState(false)
  const startPosRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY
    },
    [direction]
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY
      const delta = currentPos - startPosRef.current
      startPosRef.current = currentPos
      onResize(delta)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      onResizeEnd?.()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, direction, onResize, onResizeEnd])

  const isHorizontal = direction === 'horizontal'

  return (
    <div
      className={[
        'relative z-20 shrink-0 bg-transparent transition-colors',
        isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
        isDragging ? 'bg-[#3574F0]' : 'hover:bg-[#4E5254]',
        className,
      ].join(' ')}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation={direction}
    >
      <div
        className={[
          'absolute bg-[#4E5254] transition-opacity',
          isHorizontal
            ? 'left-px top-0 h-full w-px'
            : 'left-0 top-px h-px w-full',
          isDragging ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
    </div>
  )
}
