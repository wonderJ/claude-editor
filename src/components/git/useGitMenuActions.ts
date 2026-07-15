import { useEffect, useState } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { useGitStore } from '../../stores/gitStore'
import { useLayoutStore } from '../../stores/layoutStore'

interface GitMenuActionsResult {
  isRepo: boolean
  repoPath: string | null
  remotes: { name: string; url: string }[]
  remotesLoading: boolean
  openCommitPanel: () => void
  handleInitRepo: () => void
  handleFetch: () => void
  handlePull: () => void
  handlePush: () => void
  handleUpdateProject: () => void
  isRemotesOpen: boolean
  setIsRemotesOpen: (v: boolean) => void
  handleAddRemote: (name: string, url: string) => void
  handleRemoveRemote: (name: string) => void
}

export function useGitMenuActions(): GitMenuActionsResult {
  const { rootPath, addToast } = useFileStore()
  const {
    isRepo,
    repoPath,
    fetch,
    pull,
    push,
    initRepo,
    listRemotes,
    addRemote,
    removeRemote,
  } = useGitStore()

  const [isRemotesOpen, setIsRemotesOpen] = useState(false)
  const [remotes, setRemotes] = useState<{ name: string; url: string }[]>([])
  const [remotesLoading, setRemotesLoading] = useState(false)

  const refreshRemotes = async (): Promise<void> => {
    if (!repoPath || !isRepo) {
      setRemotes([])
      return
    }
    setRemotesLoading(true)
    const res = await listRemotes()
    setRemotesLoading(false)
    setRemotes(res)
  }

  useEffect(() => {
    if (isRemotesOpen) {
      void refreshRemotes()
    }
  }, [isRemotesOpen])

  return {
    isRepo,
    repoPath,
    remotes,
    remotesLoading,
    openCommitPanel: () => {
      useLayoutStore.getState().setSidebarCollapsed(false)
      useLayoutStore.getState().setSidebarPanel('commit')
    },
    handleInitRepo: () => {
      if (!rootPath) {
        addToast({ message: 'No folder open', type: 'error' })
        return
      }
      void initRepo(rootPath)
    },
    handleFetch: () => { void fetch() },
    handlePull: () => { void pull() },
    handlePush: () => { void push() },
    handleUpdateProject: async () => {
      await fetch()
      await pull()
    },
    isRemotesOpen,
    setIsRemotesOpen,
    handleAddRemote: (name, url) => {
      void addRemote(name, url).then(() => { void refreshRemotes() })
    },
    handleRemoveRemote: (name) => {
      void removeRemote(name).then(() => { void refreshRemotes() })
    },
  }
}
