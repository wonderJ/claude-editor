import { useState } from 'react'
import type { JSX } from 'react'
import { ArrowDown, ArrowUp, Download } from 'lucide-react'
import type { GitFileEntry } from '../../../electron/preload'
import { useGitStore } from '../../stores/gitStore'
import { useEditorStore } from '../../stores/editorStore'

/** Build absolute path from repo root + repo-relative path. */
function absPath(root: string, rel: string): string {
  const sep = root.includes('\\') ? '\\' : '/'
  return root.replace(/[\\/]$/, '') + sep + rel.replace(/\//g, sep)
}

function baseName(p: string): string {
  return p.split('/').pop() ?? p
}

const STATUS_LABEL: Record<string, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  conflict: 'C',
  ignored: 'I',
  unmodified: '',
}

export function CommitView(): JSX.Element {
  const repoPath = useGitStore((s) => s.repoPath)
  const status = useGitStore((s) => s.status)
  const { stageFiles, unstageFiles, discardFiles, commit, push, pull, fetch } = useGitStore()
  const { openDiffTab } = useEditorStore()
  const [message, setMessage] = useState('')
  const [committing, setCommitting] = useState(false)

  const files = status?.files ?? []
  const staged = files.filter((f) => f.indexStatus !== 'unmodified' && f.indexStatus !== 'untracked')
  const unstaged = files.filter(
    (f) => f.worktreeStatus !== 'unmodified' || f.indexStatus === 'untracked'
  )

  const openDiff = async (entry: GitFileEntry, mode: 'working' | 'staged') => {
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitDiff(repoPath, entry.path, mode)
    if ('error' in res) return
    openDiffTab(absPath(repoPath, entry.path), baseName(entry.path), {
      mode,
      original: res.original,
      modified: res.modified,
      filePath: absPath(repoPath, entry.path),
    })
  }

  const handleCommit = async () => {
    if (!message.trim()) return
    setCommitting(true)
    const ok = await commit(message.trim())
    setCommitting(false)
    if (ok) setMessage('')
  }

  const renderRow = (
    entry: GitFileEntry,
    mode: 'working' | 'staged',
    actions: JSX.Element
  ) => (
    <div
      key={`${mode}:${entry.path}`}
      className="group flex items-center gap-1.5 rounded px-2 py-0.5 text-xs text-[#A9B7C6] hover:bg-[#3C3F41]"
      onDoubleClick={() => { void openDiff(entry, mode) }}
    >
      <span className="w-3 shrink-0 text-center text-[10px] text-[#8C8C8C]">
        {STATUS_LABEL[mode === 'staged' ? entry.indexStatus : entry.worktreeStatus] || STATUS_LABEL[entry.indexStatus]}
      </span>
      <span className="flex-1 truncate" title={entry.path}>{entry.path}</span>
      <span className="hidden shrink-0 gap-1 group-hover:flex">{actions}</span>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[#4E5254] px-2 text-xs text-[#A9B7C6]">
        <span className="truncate">{status?.branch ?? '(no branch)'}</span>
        {status && (status.ahead > 0 || status.behind > 0) && (
          <span className="text-[#8C8C8C]">↑{status.ahead} ↓{status.behind}</span>
        )}
        <span className="flex-1" />
        <button type="button" title="Fetch" className="rounded p-1 hover:bg-[#3C3F41]" onClick={() => { void fetch() }}>
          <Download size={13} />
        </button>
        <button type="button" title="Pull" className="rounded p-1 hover:bg-[#3C3F41]" onClick={() => { void pull() }}>
          <ArrowDown size={13} />
        </button>
        <button type="button" title="Push" className="rounded p-1 hover:bg-[#3C3F41]" onClick={() => { void push() }}>
          <ArrowUp size={13} />
        </button>
      </div>

      {/* File lists */}
      <div className="flex-1 overflow-auto py-1">
        {staged.length > 0 && (
          <div className="mb-1">
            <div className="px-2 py-0.5 text-[10px] font-medium uppercase text-[#8C8C8C]">Staged</div>
            {staged.map((f) =>
              renderRow(f, 'staged', (
                <button
                  type="button"
                  className="rounded px-1 text-[10px] hover:bg-[#4E5254]"
                  onClick={(e) => { e.stopPropagation(); void unstageFiles([f.path]) }}
                >
                  Unstage
                </button>
              ))
            )}
          </div>
        )}
        {unstaged.length > 0 && (
          <div>
            <div className="px-2 py-0.5 text-[10px] font-medium uppercase text-[#8C8C8C]">Changes</div>
            {unstaged.map((f) =>
              renderRow(f, 'working', (
                <>
                  <button
                    type="button"
                    className="rounded px-1 text-[10px] hover:bg-[#4E5254]"
                    onClick={(e) => { e.stopPropagation(); void stageFiles([f.path]) }}
                  >
                    Stage
                  </button>
                  {f.indexStatus !== 'untracked' && f.worktreeStatus !== 'untracked' && (
                    <button
                      type="button"
                      className="rounded px-1 text-[10px] text-[#C75450] hover:bg-[#4E5254]"
                      onClick={(e) => { e.stopPropagation(); void discardFiles([f.path]) }}
                    >
                      Discard
                    </button>
                  )}
                </>
              ))
            )}
          </div>
        )}
        {staged.length === 0 && unstaged.length === 0 && (
          <div className="px-2 py-2 text-xs text-[#8C8C8C]">No changes</div>
        )}
      </div>

      {/* Commit box */}
      <div className="shrink-0 border-t border-[#4E5254] p-2">
        <textarea
          value={message}
          onChange={(e) => { setMessage(e.target.value) }}
          placeholder="Commit message"
          rows={3}
          className="w-full resize-none rounded border border-[#4E5254] bg-[#1E1F22] px-2 py-1 text-xs text-[#DFE1E5] outline-none focus:border-[#3574F0]"
        />
        <button
          type="button"
          disabled={committing || !message.trim() || staged.length === 0}
          className="mt-1 w-full rounded bg-[#3574F0] px-3 py-1 text-xs text-white hover:bg-[#4682F5] disabled:opacity-50"
          onClick={() => { void handleCommit() }}
        >
          Commit
        </button>
      </div>
    </div>
  )
}
