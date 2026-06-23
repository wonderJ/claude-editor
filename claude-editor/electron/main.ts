import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import type { IPty } from 'node-pty'
import { cliManager, type CliResponse } from './cli/claude-cli'

const require = createRequire(import.meta.url)
const { spawn } = require('node-pty') as typeof import('node-pty')

const __dirname = import.meta.dirname

let mainWindow: BrowserWindow | null = null

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

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'hidden',
    frame: false,
    show: false,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
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
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
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
    console.log('terminal:create', id, shell, cwd)
    const pty = spawn(shell, [], {
      name: 'xterm-color',
      cwd: cwd || process.cwd(),
      env: process.env,
      cols: 80,
      rows: 24,
      useConpty: false,
    } as import('node-pty').IPtyForkOptions)

    terminals.set(id, pty)

    pty.onData((data) => {
      console.log('pty raw:', JSON.stringify(data))
      const colored = colorizePrompt(data)
      console.log('pty colored:', JSON.stringify(colored))
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

    return { success: true }
  } catch (err) {
    console.error('terminal:create error:', err)
    return { error: (err as Error).message }
  }
})

ipcMain.handle('terminal:write', (_event, id: string, data: string) => {
  const pty = terminals.get(id)
  if (!pty) return { error: 'Terminal not found' }
  try {
    console.log('terminal:write:', id, JSON.stringify(data))
    pty.write(data)
    return { success: true }
  } catch (err) {
    console.error('terminal:write error:', err)
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
    terminalSizes.set(id, { cols, rows })
    pty.resize(cols, rows)
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('terminal:kill', (_event, id: string) => {
  const pty = terminals.get(id)
  if (!pty) return { success: true }
  try {
    pty.kill()
    terminals.delete(id)
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

// CLI IPC handlers
cliManager.setCallbacks(
  (response: CliResponse) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cli:data', response)
    }
  },
  (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cli:status', status)
    }
  },
  (error) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cli:error', error)
    }
  }
)

ipcMain.handle('cli:start', () => {
  const result = cliManager.start()
  return { success: result }
})

ipcMain.handle('cli:stop', () => {
  cliManager.stop()
  return { success: true }
})

ipcMain.handle('cli:restart', () => {
  const result = cliManager.restart()
  return { success: result }
})

ipcMain.handle('cli:send', (_event, message: { type: string; content: string; images?: string[] | undefined; id: string }) => {
  const typedMessage = message as { type: 'message' | 'image'; content: string; images?: string[] | undefined; id: string }
  const result = cliManager.sendMessage(typedMessage)
  return { success: result }
})

ipcMain.handle('cli:status', () => {
  return { status: cliManager.getStatus() }
})

void app.whenReady().then(() => {
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
