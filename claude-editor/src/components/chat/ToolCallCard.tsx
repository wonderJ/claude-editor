import { useState } from 'react'
import type { JSX } from 'react'
import type { ToolCall } from '../../stores/chatStore'
import { FileText, Edit, Terminal, Search, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface ToolCallCardProps {
  toolCall: ToolCall
}

const iconMap = {
  read: FileText,
  write: FileText,
  edit: Edit,
  bash: Terminal,
  search: Search,
}

const statusIconMap = {
  pending: Loader2,
  running: Loader2,
  success: CheckCircle,
  error: XCircle,
}

const statusColorMap = {
  pending: 'text-[#8C8C8C]',
  running: 'text-[#FFC107]',
  success: 'text-[#36B37E]',
  error: 'text-[#E53E3E]',
}

export function ToolCallCard({ toolCall }: ToolCallCardProps): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const Icon = iconMap[toolCall.type] ?? FileText
  const StatusIcon = statusIconMap[toolCall.status] ?? Loader2
  const statusColor = statusColorMap[toolCall.status]

  return (
    <div className="rounded border border-[#4E5254] bg-[#1E1F22] overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-[#2B2D30]"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon size={12} className="text-[#8C8C8C]" />
        <span className="text-[11px] text-[#DFE1E5] flex-1 truncate">{toolCall.description}</span>
        <StatusIcon size={12} className={`${statusColor} ${toolCall.status === 'running' ? 'animate-spin' : ''}`} />
      </button>
      {expanded && toolCall.result && (
        <div className="border-t border-[#4E5254] px-2 py-1.5 text-[10px] text-[#5C5C5C] font-mono max-h-32 overflow-auto">
          <pre>{toolCall.result}</pre>
        </div>
      )}
    </div>
  )
}
