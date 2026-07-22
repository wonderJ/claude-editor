import { ipcMain, webContents } from 'electron'
import chokidar from 'chokidar'
import type { FSWatcher } from 'chokidar'

let watcher: FSWatcher | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.claude-editor/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/out/**',
  '**/*.tmp',
  '**/~$*',
]

function notifyAllWindows(): void {
  for (const wc of webContents.getAllWebContents()) {
    if (wc.isDestroyed()) continue
    wc.send('fs:changed')
  }
}

function startWatching(rootPath: string): void {
  stopWatching()
  watcher = chokidar.watch(rootPath, {
    ignored: DEFAULT_IGNORE,
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  })

  watcher.on('all', (_event, path) => {
    // Debounce: batch rapid events (e.g., git checkout, npm install)
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      notifyAllWindows()
    }, 300)

    // Also notify immediately for single-file saves so the editor can detect
    // external modifications without waiting for the debounce window.
    if (_event === 'change') {
      for (const wc of webContents.getAllWebContents()) {
        if (wc.isDestroyed()) continue
        wc.send('fs:fileChanged', path)
      }
    }
  })

  watcher.on('error', (err) => {
    console.error('File watcher error:', err)
  })
}

function stopWatching(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (watcher) {
    void watcher.close()
    watcher = null
  }
}

export function registerWatcherHandlers(): void {
  ipcMain.handle('watch:start', (_event, rootPath: string) => {
    if (!rootPath) return { success: false }
    startWatching(rootPath)
    return { success: true }
  })

  ipcMain.handle('watch:stop', () => {
    stopWatching()
    return { success: true }
  })
}
