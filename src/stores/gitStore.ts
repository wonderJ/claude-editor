import { create } from 'zustand'
import type { GitStatus, GitBranch, GitCommit, GitFileStatus } from '../../electron/preload'
import { useFileStore } from './fileStore'

/** Effective status of a file entry = worktree status, falling back to index status. */
function effectiveStatus(index: GitFileStatus, worktree: GitFileStatus): GitFileStatus {
  return worktree !== 'unmodified' ? worktree : index
}

/** Build a fast lookup map from repo-relative path → effective status. */
function buildStatusMap(status: GitStatus | null): Map<string, GitFileStatus> {
  const map = new Map<string, GitFileStatus>()
  if (!status) return map
  for (const f of status.files) {
    map.set(f.path.replace(/\\/g, '/'), effectiveStatus(f.indexStatus, f.worktreeStatus))
  }
  return map
}

interface GitState {
  repoPath: string | null
  isRepo: boolean
  status: GitStatus | null
  statusMap: Map<string, GitFileStatus>
  branches: GitBranch[]
  commits: GitCommit[]
  loading: boolean
  error: string | null

  setRepoPath: (path: string | null) => void
  refreshStatus: () => Promise<void>
  refreshBranches: () => Promise<void>
  refreshLog: () => Promise<void>
  refreshAll: () => Promise<void>

  stageFiles: (paths: string[]) => Promise<void>
  unstageFiles: (paths: string[]) => Promise<void>
  discardFiles: (paths: string[]) => Promise<void>
  commit: (message: string) => Promise<boolean>
  push: () => Promise<void>
  pull: () => Promise<void>
  fetch: () => Promise<void>

  checkoutBranch: (name: string) => Promise<void>
  createBranch: (name: string, startPoint?: string) => Promise<void>
  mergeBranch: (name: string) => Promise<void>
  deleteBranch: (name: string, force?: boolean) => Promise<void>
}

function toastError(message: string): void {
  useFileStore.getState().addToast({ message, type: 'error' })
}

export const useGitStore = create<GitState>((set, get) => ({
  repoPath: null,
  isRepo: false,
  status: null,
  statusMap: new Map(),
  branches: [],
  commits: [],
  loading: false,
  error: null,

  setRepoPath: (path) => {
    set({
      repoPath: path,
      isRepo: false,
      status: null,
      statusMap: new Map(),
      branches: [],
      commits: [],
      error: null,
    })
    if (!path || !window.electronAPI) return
    void window.electronAPI.gitIsRepo(path).then((res) => {
      if (res.isRepo) {
        set({ isRepo: true })
        void get().refreshAll()
      }
    })
  },

  refreshStatus: async () => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitStatus(repoPath)
    if ('error' in res) {
      set({ error: res.error })
      return
    }
    set({ status: res.status, statusMap: buildStatusMap(res.status), error: null })
  },

  refreshBranches: async () => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitBranches(repoPath)
    if ('error' in res) {
      set({ error: res.error })
      return
    }
    set({ branches: res.branches })
  },

  refreshLog: async () => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitLog(repoPath, 100)
    if ('error' in res) {
      set({ error: res.error })
      return
    }
    set({ commits: res.commits })
  },

  refreshAll: async () => {
    set({ loading: true })
    await Promise.all([get().refreshStatus(), get().refreshBranches(), get().refreshLog()])
    set({ loading: false })
  },

  stageFiles: async (paths) => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitStage(repoPath, paths)
    if ('error' in res) { toastError(res.error); return }
    await get().refreshStatus()
  },

  unstageFiles: async (paths) => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitUnstage(repoPath, paths)
    if ('error' in res) { toastError(res.error); return }
    await get().refreshStatus()
  },

  discardFiles: async (paths) => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitDiscard(repoPath, paths)
    if ('error' in res) { toastError(res.error); return }
    await get().refreshStatus()
  },

  commit: async (message) => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return false
    const res = await window.electronAPI.gitCommit(repoPath, message)
    if ('error' in res) { toastError(res.error); return false }
    await Promise.all([get().refreshStatus(), get().refreshLog()])
    useFileStore.getState().addToast({ message: 'Committed', type: 'success' })
    return true
  },

  push: async () => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitPush(repoPath)
    if ('error' in res) { toastError(res.error); return }
    await get().refreshStatus()
    useFileStore.getState().addToast({ message: 'Pushed', type: 'success' })
  },

  pull: async () => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitPull(repoPath)
    if ('error' in res) { toastError(res.error); return }
    await get().refreshAll()
    useFileStore.getState().addToast({ message: 'Pulled', type: 'success' })
  },

  fetch: async () => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitFetch(repoPath)
    if ('error' in res) { toastError(res.error); return }
    await get().refreshStatus()
    useFileStore.getState().addToast({ message: 'Fetched', type: 'success' })
  },

  checkoutBranch: async (name) => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitBranchCheckout(repoPath, name)
    if ('error' in res) { toastError(res.error); return }
    await get().refreshAll()
    useFileStore.getState().refresh()
  },

  createBranch: async (name, startPoint) => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitBranchCreate(repoPath, name, startPoint)
    if ('error' in res) { toastError(res.error); return }
    await get().refreshBranches()
  },

  mergeBranch: async (name) => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitBranchMerge(repoPath, name)
    if ('error' in res) { toastError(res.error); return }
    await get().refreshAll()
    useFileStore.getState().refresh()
  },

  deleteBranch: async (name, force) => {
    const { repoPath } = get()
    if (!repoPath || !window.electronAPI) return
    const res = await window.electronAPI.gitBranchDelete(repoPath, name, force)
    if ('error' in res) { toastError(res.error); return }
    await get().refreshBranches()
  },
}))
