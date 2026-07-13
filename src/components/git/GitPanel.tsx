import { useState } from 'react'
import type { JSX } from 'react'
import { GitBranch as GitBranchIcon, History as HistoryIcon } from 'lucide-react'
import { BranchView } from './BranchView'
import { HistoryView } from './HistoryView'
import { useGitStore } from '../../stores/gitStore'

type GitTab = 'branches' | 'history'

const TABS: { key: GitTab; label: string; Icon: typeof GitBranchIcon }[] = [
  { key: 'branches', label: 'Branches', Icon: GitBranchIcon },
  { key: 'history', label: 'Log', Icon: HistoryIcon },
]

export function GitPanel(): JSX.Element {
  const [tab, setTab] = useState<GitTab>('branches')
  const isRepo = useGitStore((s) => s.isRepo)

  if (!isRepo) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[#8C8C8C]">
        Not a Git repository
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-[#4E5254] px-2">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={[
              'flex h-6 items-center gap-1 rounded px-2 text-xs',
              tab === key ? 'bg-[#4E5254] text-[#DFE1E5]' : 'text-[#A9B7C6] hover:bg-[#3C3F41]',
            ].join(' ')}
            onClick={() => { setTab(key) }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'branches' && <BranchView />}
        {tab === 'history' && <HistoryView />}
      </div>
    </div>
  )
}
