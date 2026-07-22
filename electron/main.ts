import { app, BrowserWindow, ipcMain, dialog, Menu, shell, clipboard } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import type { IPty } from 'node-pty'
import { registerGitHandlers } from './gitService'

const require = createRequire(import.meta.url)
const { spawn } = require('node-pty') as typeof import('node-pty')

let mainWindow: BrowserWindow | null = null

function getAppRoot(): string {
  // app.getAppPath() returns the app.asar file in packaged builds; in dev it is the project root.
  return app.getAppPath()
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
  }
})

function createWindow(): void {
  // Remove default menu to prevent shortcut conflicts (e.g., Ctrl+C in terminal)
  Menu.setApplicationMenu(null)

  const appRoot = getAppRoot()
  const preloadPath = path.join(appRoot, 'dist-electron', 'preload.cjs')
  const indexPath = path.join(appRoot, 'dist', 'index.html')

  logToFile('createWindow appRoot', appRoot)
  logToFile('createWindow preloadPath', preloadPath)
  logToFile('createWindow indexPath', indexPath)

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    frame: false,
    show: true,
    center: true,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    logToFile('createWindow loading file', indexPath)
    void mainWindow.loadFile(indexPath).catch((err) => {
      logToFile('createWindow loadFile error', err)
    })
  }

  mainWindow.once('ready-to-show', () => {
    logToFile('createWindow ready-to-show')
    mainWindow?.focus()
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logToFile('did-fail-load', errorCode, errorDescription)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Window state events for renderer
  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized', true)
    }
  })
  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized', false)
    }
  })

  // Window control IPC
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize()
  })
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => {
    mainWindow?.close()
  })
}

ipcMain.handle('clipboard:readFilePaths', () => {
  try {
    const fileNameW = clipboard.readBuffer('FileNameW')
    if (fileNameW.length > 0) {
      return fileNameW.toString('ucs2').replace(/\0+$/, '').split('\0').filter(Boolean)
    }
  } catch {
    // ignore
  }
  try {
    const hdrop = clipboard.readBuffer('CF_HDROP')
    if (hdrop.length > 0) {
      const pFiles = hdrop.readUInt32LE(0)
      const fWide = hdrop.readUInt32LE(12) !== 0
      const raw = hdrop.slice(pFiles)
      const text = fWide ? raw.toString('ucs2') : raw.toString('ascii')
      return text.replace(/\0+$/, '').split('\0').filter(Boolean)
    }
  } catch {
    // ignore
  }
  return []
})

// IPC handlers - app info
ipcMain.handle('app:platform', () => process.platform)
ipcMain.handle('app:version', () => app.getVersion())

// IPC handlers - file system
ipcMain.handle('fs:selectFolder', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    return entries.map((entry) => ({
      name: entry.name,
      path: path.join(dirPath, entry.name),
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }))
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('fs:createFile', async (_event, filePath: string) => {
  try {
    await fs.promises.writeFile(filePath, '', { flag: 'wx' })
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('fs:createDir', async (_event, dirPath: string) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true })
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('fs:rename', async (_event, oldPath: string, newPath: string) => {
  try {
    await fs.promises.rename(oldPath, newPath)
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('fs:delete', async (_event, targetPath: string) => {
  try {
    const stat = await fs.promises.stat(targetPath)
    if (stat.isDirectory()) {
      await fs.promises.rmdir(targetPath, { recursive: true })
    } else {
      await fs.promises.unlink(targetPath)
    }
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return { content }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  try {
    await snapshotIfChanged(filePath, content)
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('fs:readFileBase64', async (_event, filePath: string) => {
  try {
    const buf = await fs.promises.readFile(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const mime = IMAGE_MIME[ext] ?? 'application/octet-stream'
    return { data: buf.toString('base64'), mime }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('fs:copyPath', async (_event, src: string, dest: string) => {
  try {
    await fs.promises.cp(src, dest, { recursive: true, errorOnExist: false, force: true })
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('fs:openInExplorer', async (_event, targetPath: string) => {
  try {
    shell.showItemInFolder(targetPath)
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

// ── Edit history snapshots ──────────────────────────────────────────────

interface HistoryVersion {
  id: string
  timestamp: number
  size: number
}

interface HistoryMeta {
  originalPath: string
  versions: HistoryVersion[]
}

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

let historyRoot: string | null = null

function historyDirFor(filePath: string): string | null {
  if (!historyRoot) return null
  const hash = crypto.createHash('sha1').update(filePath).digest('hex').slice(0, 16)
  return path.join(historyRoot, '.claude-editor', 'history', hash)
}

function isInsideHistory(filePath: string): boolean {
  return filePath.includes(`${path.sep}.claude-editor${path.sep}`)
}

async function readMeta(dir: string): Promise<HistoryMeta | null> {
  try {
    const raw = await fs.promises.readFile(path.join(dir, 'meta.json'), 'utf-8')
    return JSON.parse(raw) as HistoryMeta
  } catch {
    return null
  }
}

async function snapshotIfChanged(filePath: string, incoming: string): Promise<void> {
  if (isInsideHistory(filePath)) return
  const dir = historyDirFor(filePath)
  if (!dir) return
  let existing: string
  try {
    existing = await fs.promises.readFile(filePath, 'utf-8')
  } catch {
    return
  }
  if (existing === incoming) return

  await fs.promises.mkdir(dir, { recursive: true })
  const now = new Date()
  const id = now.toISOString().replace(/[:.]/g, '-')
  await fs.promises.writeFile(path.join(dir, `${id}.snap`), existing, 'utf-8')

  const meta = (await readMeta(dir)) ?? { originalPath: filePath, versions: [] }
  meta.originalPath = filePath
  meta.versions.push({
    id,
    timestamp: now.getTime(),
    size: Buffer.byteLength(existing, 'utf-8'),
  })
  await fs.promises.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8')
}

ipcMain.handle('history:setRoot', (_event, root: string | null) => {
  historyRoot = root
  return { success: true }
})

ipcMain.handle('history:list', async (_event, filePath: string) => {
  const dir = historyDirFor(filePath)
  if (!dir) return { versions: [] }
  const meta = await readMeta(dir)
  const versions = meta ? [...meta.versions].sort((a, b) => b.timestamp - a.timestamp) : []
  return { versions }
})

ipcMain.handle('history:read', async (_event, filePath: string, versionId: string) => {
  const dir = historyDirFor(filePath)
  if (!dir) return { error: 'No history root' }
  try {
    const content = await fs.promises.readFile(path.join(dir, `${versionId}.snap`), 'utf-8')
    return { content }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('history:rollback', async (_event, filePath: string, versionId: string) => {
  const dir = historyDirFor(filePath)
  if (!dir) return { error: 'No history root' }
  try {
    const content = await fs.promises.readFile(path.join(dir, `${versionId}.snap`), 'utf-8')
    await snapshotIfChanged(filePath, content)
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { content }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

const LOG_FILE = path.join(app.getPath('userData'), 'claude-editor-debug.log')
const RECENT_PROJECTS_FILE = path.join(app.getPath('userData'), 'recent-projects.json')

async function readRecentProjects(): Promise<string[]> {
  try {
    const raw = await fs.promises.readFile(RECENT_PROJECTS_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter((p): p is string => typeof p === 'string')
    }
  } catch {
    // File may not exist or be corrupted
  }
  return []
}

async function writeRecentProjects(projects: string[]): Promise<void> {
  try {
    await fs.promises.writeFile(RECENT_PROJECTS_FILE, JSON.stringify(projects), 'utf-8')
  } catch {
    // ignore write errors
  }
}

ipcMain.handle('recent:load', async () => {
  return { projects: await readRecentProjects() }
})

ipcMain.handle('recent:save', async (_event, projects: string[]) => {
  await writeRecentProjects(projects)
  return { success: true }
})

function logToFile(...args: unknown[]): void {
  try {
    const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n'
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}`)
  } catch {
    // ignore logging errors
  }
}

process.on('uncaughtException', (err) => {
  logToFile('UNCAUGHT EXCEPTION', err)
})

// Terminal IPC handlers using node-pty
const terminals = new Map<string, IPty>()
const terminalSizes = new Map<string, { cols: number; rows: number }>()

/**
 * Colorize shell prompt lines in terminal output.
 * Matches common prompt patterns (e.g. `C:\path>`, `user@host:~/path$`, `PS C:\path>`)
 * and wraps the prompt part with yellow ANSI color (\x1b[33m ... \x1b[0m).
 * Skips lines that already contain ANSI escape sequences to avoid conflicts.
 */
function colorizePrompt(data: string): string {
  // Match the prompt text itself (contains path separator and ends with >/$/#).
  // Surround the matched prompt text with yellow ANSI codes.
  // Leave surrounding ANSI escape sequences untouched.
  return data.replace(
    /([^\x1b\r\n]*?[\\\/:][^\x1b\r\n]*?[>$#])/g,
    '\x1b[33m$1\x1b[0m'
  )
}

function getDefaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

ipcMain.handle('terminal:create', (_event, id: string, cwd: string) => {
  try {
    const shell = getDefaultShell()
    logToFile('terminal:create start', id, shell, cwd)
    const pty = spawn(shell, [], {
      name: 'xterm-color',
      cwd: cwd || process.cwd(),
      env: process.env,
      cols: 80,
      rows: 24,
      useConpty: true,
    } as import('node-pty').IPtyForkOptions)

    terminals.set(id, pty)

    pty.onData((data) => {
      const colored = colorizePrompt(data)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', id, colored)
      }
    })

    pty.onExit(() => {
      terminals.delete(id)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:exit', id)
      }
    })

    logToFile('terminal:create end', id)
    return { success: true }
  } catch (err) {
    logToFile('terminal:create error', err)
    return { error: (err as Error).message }
  }
})

ipcMain.handle('terminal:write', (_event, id: string, data: string) => {
  const pty = terminals.get(id)
  if (!pty) return { error: 'Terminal not found' }
  try {
    logToFile('terminal:write', id, JSON.stringify(data))
    pty.write(data)
    return { success: true }
  } catch (err) {
    logToFile('terminal:write error', err)
    return { error: (err as Error).message }
  }
})

ipcMain.handle('terminal:resize', (_event, id: string, cols: number, rows: number) => {
  const pty = terminals.get(id)
  if (!pty) return { error: 'Terminal not found' }
  try {
    const prev = terminalSizes.get(id)
    if (prev && prev.cols === cols && prev.rows === rows) {
      return { success: true }
    }
    logToFile('terminal:resize start', id, cols, rows)
    terminalSizes.set(id, { cols, rows })
    pty.resize(cols, rows)
    logToFile('terminal:resize end', id, cols, rows)
    return { success: true }
  } catch (err) {
    logToFile('terminal:resize error', err)
    return { error: (err as Error).message }
  }
})

ipcMain.handle('terminal:kill', (_event, id: string) => {
  const pty = terminals.get(id)
  if (!pty) return { success: true }
  try {
    logToFile('terminal:kill', id)
    pty.kill()
    terminals.delete(id)
    return { success: true }
  } catch (err) {
    logToFile('terminal:kill error', err)
    return { error: (err as Error).message }
  }
})

void app.whenReady().then(() => {
  registerGitHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
