import { create } from 'zustand'

const MAX_RECENT = 10

interface RecentProjectsState {
  projects: string[]
  initialized: boolean
  addProject: (path: string) => void
  removeProject: (path: string) => void
  clearProjects: () => void
  loadProjects: () => Promise<void>
}

async function saveProjects(projects: string[]): Promise<void> {
  try {
    await window.electronAPI?.recentSave(projects)
  } catch {
    // ignore save errors
  }
}

export const useRecentProjectsStore = create<RecentProjectsState>((set, get) => ({
  projects: [],
  initialized: false,
  addProject: (path) => {
    const next = [path, ...get().projects.filter((p) => p !== path)].slice(0, MAX_RECENT)
    set({ projects: next })
    void saveProjects(next)
  },
  removeProject: (path) => {
    const next = get().projects.filter((p) => p !== path)
    set({ projects: next })
    void saveProjects(next)
  },
  clearProjects: () => {
    set({ projects: [] })
    void saveProjects([])
  },
  loadProjects: async () => {
    try {
      const result = await window.electronAPI?.recentLoad()
      if (result && Array.isArray(result.projects)) {
        set({ projects: result.projects.filter((p): p is string => typeof p === 'string'), initialized: true })
      } else {
        set({ initialized: true })
      }
    } catch {
      set({ initialized: true })
    }
  },
}))
