import { useState } from 'react'
import type { JSX } from 'react'
import type { DiffBlock } from '../../stores/chatStore'
import { FileCode, Check, X } from 'lucide-react'

interface DiffViewerProps {
  diff: DiffBlock
}

export function DiffViewer({ diff }: DiffViewerProps): JSX.Element {
  const [expanded, setExpanded] = useState(true)
  const [approved, setApproved] = useState<boolean | null>(null)

  const oldLines = diff.oldCode.split('\n')
  const newLines = diff.newCode.split('\n')
  const maxLines = Math.max(oldLines.length, newLines.length)

  return (
    <div className="rounded border border-[#4E5254] bg-[#1E1F22] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#4E5254] bg-[#2B2D30] px-2 py-1.5">
        <button
          type="button"
          className="flex items-center gap-1.5 text-[11px] text-[#DFE1E5] hover:text-[#3574F0]"
          onClick={() => setExpanded(!expanded)}
        >
          <FileCode size={12} />
          <span className="truncate">{diff.filePath}</span>
        </button>
        <div className="flex items-center gap-1">
          {approved === null ? (
            <>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded text-[#36B37E] hover:bg-[#36B37E]/20"
                onClick={() => setApproved(true)}
                title="Accept"
              >
                <Check size={10} />
              </button>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded text-[#E53E3E] hover:bg-[#E53E3E]/20"
                onClick={() => setApproved(false)}
                title="Reject"
              >
                <X size={10} />
              </button>
            </>
          ) : approved ? (
            <span className="text-[10px] text-[#36B37E]">Accepted</span>
          ) : (
            <span className="text-[10px] text-[#E53E3E]">Rejected</span>
          )}
        </div>
      </div>

      {/* Diff content */}
      {expanded && (
        <div className="flex text-[10px] font-mono">
          {/* Old code */}
          <div className="flex-1 border-r border-[#4E5254]">
            <div className="bg-[#E53E3E]/10 px-2 py-0.5 text-[#E53E3E]">- Old</div>
            <div className="max-h-40 overflow-auto">
              {oldLines.map((line, i) => (
                <div key={`old-${i}`} className="px-2 py-0.5 text-[#5C5C5C]">
                  {line || ' '}
                </div>
              ))}
            </div>
          </div>
          {/* New code */}
          <div className="flex-1">
            <div className="bg-[#36B37E]/10 px-2 py-0.5 text-[#36B37E]">+ New</div>
            <div className="max-h-40 overflow-auto">
              {newLines.map((line, i) => (
                <div key={`new-${i}`} className="px-2 py-0.5 text-[#DFE1E5]">
                  {line || ' '}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
