import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { spawn, type IPty } from 'node-pty'
import { cliManager, type CliResponse } from './cli/claude-cli'

const __dirname = import.meta.dirname

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'hiddenInset',
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

function getDefaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

ipcMain.handle('terminal:create', (_event, id: string, cwd: string) => {
  try {
    const shell = getDefaultShell()
    const pty = spawn(shell, [], {
      name: 'xterm-color',
      cwd: cwd || process.cwd(),
      env: process.env,
      cols: 80,
      rows: 24,
    })

    terminals.set(id, pty)

    pty.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', id, data)
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
    return { error: (err as Error).message }
  }
})

ipcMain.handle('terminal:write', (_event, id: string, data: string) => {
  const pty = terminals.get(id)
  if (!pty) return { error: 'Terminal not found' }
  try {
    pty.write(data)
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

ipcMain.handle('terminal:resize', (_event, id: string, cols: number, rows: number) => {
  const pty = terminals.get(id)
  if (!pty) return { error: 'Terminal not found' }
  try {
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
