import { useState } from 'react'
import type { JSX } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ThinkingBlockProps {
  content: string
}

export function ThinkingBlock({ content }: ThinkingBlockProps): JSX.Element {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-3 flex justify-start">
      <div className="max-w-[85%] rounded-md border border-dashed border-[#4E5254] bg-[#2B2D30] px-3 py-2 text-sm text-[#8C8C8C]">
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-[#8C8C8C] hover:text-[#DFE1E5]"
          onClick={() => {
            setExpanded(!expanded)
          }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span>Thinking</span>
        </button>
        {expanded && (
          <div className="mt-2 text-xs leading-relaxed text-[#5C5C5C]">
            {content}
          </div>
        )}
      </div>
    </div>
  )
}
