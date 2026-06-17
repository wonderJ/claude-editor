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
  // Terminal
  terminalCreate: (id: string, cwd: string) => Promise<{ success: boolean } | { error: string }>
  terminalWrite: (id: string, data: string) => Promise<{ success: boolean } | { error: string }>
  terminalResize: (id: string, cols: number, rows: number) => Promise<{ success: boolean } | { error: string }>
  terminalKill: (id: string) => Promise<{ success: boolean } | { error: string }>
  onTerminalData: (callback: (id: string, data: string) => void) => () => void
  onTerminalExit: (callback: (id: string) => void) => () => void
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
  terminalCreate: (id: string, cwd: string) => ipcRenderer.invoke('terminal:create', id, cwd),
  terminalWrite: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
  terminalResize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
  terminalKill: (id: string) => ipcRenderer.invoke('terminal:kill', id),
  onTerminalData: (callback) => {
    const handler = (_event: unknown, id: string, data: string) => { callback(id, data) }
    ipcRenderer.on('terminal:data', handler)
    return () => { ipcRenderer.removeListener('terminal:data', handler) }
  },
  onTerminalExit: (callback) => {
    const handler = (_event: unknown, id: string) => { callback(id) }
    ipcRenderer.on('terminal:exit', handler)
    return () => { ipcRenderer.removeListener('terminal:exit', handler) }
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
