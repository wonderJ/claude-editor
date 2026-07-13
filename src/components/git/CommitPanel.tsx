import type { JSX } from 'react'
import { CommitView } from './CommitView'
import { useGitStore } from '../../stores/gitStore'

export function CommitPanel(): JSX.Element {
  const isRepo = useGitStore((s) => s.isRepo)

  if (!isRepo) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[#8C8C8C]">
        Not a Git repository
      </div>
    )
  }

  return <CommitView />
}
