import { create } from 'zustand'

const STORAGE_KEY = 'claude-editor:recent-projects'
const MAX_RECENT = 10

function readProjects(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter((p): p is string => typeof p === 'string')
    }
  } catch {
    // ignore corrupted storage
  }
  return []
}

function writeProjects(projects: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // ignore storage errors
  }
}

interface RecentProjectsState {
  projects: string[]
  addProject: (path: string) => void
  removeProject: (path: string) => void
  clearProjects: () => void
}

export const useRecentProjectsStore = create<RecentProjectsState>((set, get) => ({
  projects: readProjects(),
  addProject: (path) => {
    const next = [path, ...get().projects.filter((p) => p !== path)].slice(0, MAX_RECENT)
    set({ projects: next })
    writeProjects(next)
  },
  removeProject: (path) => {
    const next = get().projects.filter((p) => p !== path)
    set({ projects: next })
    writeProjects(next)
  },
  clearProjects: () => {
    set({ projects: [] })
    writeProjects([])
  },
}))
