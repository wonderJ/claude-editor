import { contextBridge, ipcRenderer, webUtils } from 'electron'

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
  readFileBase64: (path: string) => Promise<{ data: string; mime: string } | { error: string }>
  copyPath: (src: string, dest: string) => Promise<{ success: boolean } | { error: string }>
  openInExplorer: (path: string) => Promise<{ success: boolean } | { error: string }>
  // History
  historySetRoot: (root: string | null) => Promise<{ success: boolean }>
  historyList: (filePath: string) => Promise<{ versions: HistoryVersion[] } | { error: string }>
  historyRead: (filePath: string, versionId: string) => Promise<{ content: string } | { error: string }>
  historyRollback: (filePath: string, versionId: string) => Promise<{ content: string } | { error: string }>
  // Terminal
  terminalCreate: (id: string, cwd: string) => Promise<{ success: boolean } | { error: string }>
  terminalWrite: (id: string, data: string) => Promise<{ success: boolean } | { error: string }>
  terminalResize: (id: string, cols: number, rows: number) => Promise<{ success: boolean } | { error: string }>
  terminalKill: (id: string) => Promise<{ success: boolean } | { error: string }>
  onTerminalData: (callback: (id: string, data: string) => void) => () => void
  onTerminalExit: (callback: (id: string) => void) => () => void
  // Resolve a dropped File's absolute path (Electron 32+ replaces File.path with webUtils)
  getPathForFile: (file: File) => string
  // Window controls
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
  onWindowMaximized: (callback: (maximized: boolean) => void) => () => void
}

export interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

export interface HistoryVersion {
  id: string
  timestamp: number
  size: number
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
  readFileBase64: (path: string) => ipcRenderer.invoke('fs:readFileBase64', path),
  copyPath: (src: string, dest: string) => ipcRenderer.invoke('fs:copyPath', src, dest),
  openInExplorer: (path: string) => ipcRenderer.invoke('fs:openInExplorer', path),
  historySetRoot: (root) => ipcRenderer.invoke('history:setRoot', root),
  historyList: (filePath) => ipcRenderer.invoke('history:list', filePath),
  historyRead: (filePath, versionId) => ipcRenderer.invoke('history:read', filePath, versionId),
  historyRollback: (filePath, versionId) => ipcRenderer.invoke('history:rollback', filePath, versionId),
  terminalCreate: (id: string, cwd: string) => ipcRenderer.invoke('terminal:create', id, cwd),
  terminalWrite: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
  terminalResize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
  terminalKill: (id: string) => ipcRenderer.invoke('terminal:kill', id),
  onTerminalData: (callback) => {
    const handler = (_event: unknown, id: string, data: string) => { callback(id, data) }
    const on = ipcRenderer.on.bind(ipcRenderer)
    const off = ipcRenderer.removeListener.bind(ipcRenderer)
    on('terminal:data', handler)
    return () => { off('terminal:data', handler) }
  },
  onTerminalExit: (callback) => {
    const handler = (_event: unknown, id: string) => { callback(id) }
    const on = ipcRenderer.on.bind(ipcRenderer)
    const off = ipcRenderer.removeListener.bind(ipcRenderer)
    on('terminal:exit', handler)
    return () => { off('terminal:exit', handler) }
  },
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  // Window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  onWindowMaximized: (callback) => {
    const handler = (_event: unknown, maximized: boolean) => { callback(maximized) }
    const on = ipcRenderer.on.bind(ipcRenderer)
    const off = ipcRenderer.removeListener.bind(ipcRenderer)
    on('window:maximized', handler)
    return () => { off('window:maximized', handler) }
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
