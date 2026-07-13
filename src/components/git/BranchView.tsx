import { useState } from 'react'
import type { JSX } from 'react'
import { Plus } from 'lucide-react'
import type { GitBranch } from '../../../electron/preload'
import { useGitStore } from '../../stores/gitStore'
import { PromptDialog } from '../common/PromptDialog'
import { ConfirmDialog } from '../common/ConfirmDialog'

export function BranchView(): JSX.Element {
  const branches = useGitStore((s) => s.branches)
  const { checkoutBranch, createBranch, mergeBranch, deleteBranch } = useGitStore()
  const [creating, setCreating] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Local branches first (no remotes/ prefix), then remotes.
  const sorted = [...branches].sort((a, b) => {
    const ar = a.name.startsWith('remotes/') ? 1 : 0
    const br = b.name.startsWith('remotes/') ? 1 : 0
    if (ar !== br) return ar - br
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-[#4E5254] px-2">
        <span className="text-[10px] font-medium uppercase text-[#8C8C8C]">Branches</span>
        <button
          type="button"
          title="New branch"
          className="rounded p-1 text-[#A9B7C6] hover:bg-[#3C3F41]"
          onClick={() => { setCreating(true) }}
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-auto py-1">
        {sorted.map((b: GitBranch) => (
          <div
            key={b.name}
            className="group flex items-center gap-1.5 rounded px-2 py-0.5 text-xs hover:bg-[#3C3F41]"
          >
            <span className="w-2 shrink-0 text-[#499C54]">{b.current ? '●' : ''}</span>
            <span
              className={['flex-1 truncate', b.current ? 'text-[#DFE1E5]' : 'text-[#A9B7C6]'].join(' ')}
              title={b.name}
            >
              {b.name}
            </span>
            {!b.current && !b.name.startsWith('remotes/') && (
              <span className="hidden shrink-0 gap-1 group-hover:flex">
                <button type="button" className="rounded px-1 text-[10px] hover:bg-[#4E5254]" onClick={() => { void checkoutBranch(b.name) }}>Checkout</button>
                <button type="button" className="rounded px-1 text-[10px] hover:bg-[#4E5254]" onClick={() => { setMergeTarget(b.name) }}>Merge</button>
                <button type="button" className="rounded px-1 text-[10px] text-[#C75450] hover:bg-[#4E5254]" onClick={() => { setDeleteTarget(b.name) }}>Delete</button>
              </span>
            )}
            {!b.current && b.name.startsWith('remotes/') && (
              <span className="hidden shrink-0 group-hover:flex">
                <button type="button" className="rounded px-1 text-[10px] hover:bg-[#4E5254]" onClick={() => { void checkoutBranch(b.name.replace(/^remotes\/[^/]+\//, '')) }}>Checkout</button>
              </span>
            )}
          </div>
        ))}
        {sorted.length === 0 && <div className="px-2 py-2 text-xs text-[#8C8C8C]">No branches</div>}
      </div>

      {creating && (
        <PromptDialog
          title="New Branch"
          defaultValue=""
          confirmText="Create"
          onConfirm={(value) => { setCreating(false); if (value.trim()) void createBranch(value.trim()) }}
          onCancel={() => { setCreating(false) }}
        />
      )}

      {mergeTarget && (
        <ConfirmDialog
          title="Merge Branch"
          message={`Merge "${mergeTarget}" into current branch?`}
          confirmText="Merge"
          onConfirm={() => { const t = mergeTarget; setMergeTarget(null); void mergeBranch(t) }}
          onCancel={() => { setMergeTarget(null) }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Branch"
          message={`Delete branch "${deleteTarget}"?`}
          confirmText="Delete"
          danger
          onConfirm={() => { const t = deleteTarget; setDeleteTarget(null); void deleteBranch(t) }}
          onCancel={() => { setDeleteTarget(null) }}
        />
      )}
    </div>
  )
}
