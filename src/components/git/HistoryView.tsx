import type { JSX } from 'react'
import { useGitStore } from '../../stores/gitStore'

export function HistoryView(): JSX.Element {
  const commits = useGitStore((s) => s.commits)

  if (commits.length === 0) {
    return <div className="px-2 py-2 text-xs text-[#8C8C8C]">No commits</div>
  }

  return (
    <div className="h-full overflow-auto py-1">
      {commits.map((c) => (
        <div
          key={c.hash}
          className="flex flex-col gap-0.5 rounded px-2 py-1 text-xs hover:bg-[#3C3F41]"
          title={c.hash}
        >
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-[10px] text-[#E2A336]">{c.shortHash}</span>
            <span className="flex-1 truncate text-[#DFE1E5]">{c.subject}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#8C8C8C]">
            <span className="truncate">{c.authorName}</span>
            <span className="shrink-0">{new Date(c.authorDate).toLocaleString()}</span>
            {c.refs.length > 0 && (
              <span className="shrink-0 truncate text-[#499C54]">{c.refs.join(', ')}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
