import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  platform: string
  version: string
  getPlatform: () => Promise<string>
  getVersion: () => Promise<string>
  // File system
  selectFolder: () => Promise<string | null>
  readDir: (path: string) => Promise<DirEntry[] | { error: string }>
  createFile: (path: string) => Promise<{ success: boolean } | { error: string }>
  createDir: (path: string) => Promise<{ success: boolean } | { error: string }>
  rename: (oldPath: string, newPath: string) => Promise<{ success: boolean } | { error: string }>
  delete: (path: string) => Promise<{ success: boolean } | { error: string }>
  readFile: (path: string) => Promise<{ content: string } | { error: string }>
  writeFile: (path: string, content: string) => Promise<{ success: boolean } | { error: string }>
}

export interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

const api: ElectronAPI = {
  platform: process.platform,
  version: process.versions.electron,
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),
  readDir: (path: string) => ipcRenderer.invoke('fs:readDir', path),
  createFile: (path: string) => ipcRenderer.invoke('fs:createFile', path),
  createDir: (path: string) => ipcRenderer.invoke('fs:createDir', path),
  rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  delete: (path: string) => ipcRenderer.invoke('fs:delete', path),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
