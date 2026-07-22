import { FolderOpen, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { JSX } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { useHistoryStore } from '../../stores/historyStore'
import { FileTreeNode } from './FileTreeNode'
import { HistoryDialog } from './HistoryDialog'
import { ToastContainer } from './ToastContainer'
import { ContextMenu } from './ContextMenu'
import { PromptDialog } from '../common/PromptDialog'
import {
  copyReference,
  findNode,
  generateUniquePath,
  getBaseName,
  getParentPath,
  openInExplorer,
  pasteInto,
} from '../../lib/fileTreeActions'

export function FileTree(): JSX.Element {
  const {
    rootPath,
    files,
    selectedPath,
    clipboard,
    setRootPath,
    setClipboard,
    clearClipboard,
    addToast,
    refresh,
    isLoading,
  } = useFileStore()
  const { openPath, openName, close: closeHistory } = useHistoryStore()
  const [isDragOver, setIsDragOver] = useState(false)

  const [rootContextMenu, setRootContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [newFileOpen, setNewFileOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  const doCreateFile = async (name: string) => {
    if (!name || !rootPath || !window.electronAPI) return
    const newPath = await generateUniquePath(rootPath, name)
    const result = await window.electronAPI.createFile(newPath)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
    } else {
      addToast({ message: 'File created', type: 'success' })
      refresh()
    }
  }

  const doCreateFolder = async (name: string) => {
    if (!name || !rootPath || !window.electronAPI) return
    const newPath = await generateUniquePath(rootPath, name)
    const result = await window.electronAPI.createDir(newPath)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
    } else {
      addToast({ message: 'Folder created', type: 'success' })
      refresh()
    }
  }

  const handleOpenFolder = () => {
    if (!window.electronAPI) return
    void window.electronAPI.selectFolder().then((path) => {
      if (path) {
        setRootPath(path)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedPath) return
    const node = findNode(files, selectedPath)
    if (!node) return

    const ctrl = e.ctrlKey || e.metaKey

    if (ctrl && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
      e.preventDefault()
      copyReference(rootPath, selectedPath, addToast)
      return
    }
    if (ctrl && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
      e.preventDefault()
      void openInExplorer(selectedPath, addToast)
      return
    }
    if (ctrl && !e.shiftKey && (e.key === 'x' || e.key === 'X')) {
      e.preventDefault()
      setClipboard({ path: selectedPath, mode: 'cut' })
      addToast({ message: 'Cut', type: 'info', duration: 1500 })
      return
    }
    if (ctrl && !e.shiftKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault()
      setClipboard({ path: selectedPath, mode: 'copy' })
      addToast({ message: 'Copied', type: 'info', duration: 1500 })
      return
    }
    if (ctrl && !e.shiftKey && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault()
      if (!clipboard) return
      const targetDir = node.isDirectory ? node.path : getParentPath(node.path)
      void pasteInto(targetDir, clipboard.path, clipboard.mode, addToast).then((ok) => {
        if (ok) {
          if (clipboard.mode === 'cut') clearClipboard()
          refresh()
        }
      })
      return
    }
    if (e.key === 'Delete') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('filetree:delete', { detail: selectedPath }))
      return
    }
    if ((e.key === 'F6' && e.shiftKey) || e.key === 'F2') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('filetree:rename', { detail: selectedPath }))
      return
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!rootPath) return
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const getDropTargetDirectory = (): string | null => {
    if (!rootPath) return null
    if (!selectedPath) return rootPath
    const node = findNode(files, selectedPath)
    if (!node) return rootPath
    return node.isDirectory ? node.path : getParentPath(node.path)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!rootPath || !window.electronAPI) return

    const dt = e.dataTransfer
    if (!dt?.files?.length) return

    const targetDir = getDropTargetDirectory()
    if (!targetDir) return

    const fileList = Array.from(dt.files)
    let copied = 0
    for (const file of fileList) {
      const filePath = window.electronAPI.getPathForFile(file)
      if (!filePath) continue
      const dest = await generateUniquePath(targetDir, getBaseName(filePath))
      const result = await window.electronAPI.copyPath(filePath, dest)
      if ('error' in result) {
        addToast({ message: `Failed to copy ${getBaseName(filePath)}: ${result.error}`, type: 'error' })
      } else {
        copied++
      }
    }
    if (copied > 0) {
      addToast({ message: `Copied ${copied} file${copied === 1 ? '' : 's'}`, type: 'success' })
      refresh()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ToastContainer />

      {/* Toolbar */}
      <div className="flex h-8 items-center gap-1 border-b border-[#4E5254] px-2">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
          onClick={handleOpenFolder}
          title="Open Folder"
        >
          <FolderOpen size={14} />
        </button>
        {rootPath && (
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            onClick={refresh}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className={[
          'flex-1 overflow-auto p-1 outline-none transition-colors',
          isDragOver ? 'bg-[#3574F0]/20' : '',
        ].join(' ')}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={(e) => {
          if (!rootPath) return
          // Only show root menu when right-clicking empty space (not a node row)
          const target = e.target as HTMLElement
          if (target.closest('[data-file-tree-node]')) return
          e.preventDefault()
          e.stopPropagation()
          window.dispatchEvent(new CustomEvent('filetree:closeContextMenu'))
          setRootContextMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        {!rootPath ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[#8C8C8C]">
            <FolderOpen size={32} />
            <span className="text-sm">No folder opened</span>
            <button
              type="button"
              className="rounded bg-[#3574F0] px-3 py-1 text-xs text-white hover:bg-[#4682F5]"
              onClick={handleOpenFolder}
            >
              Open Folder
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center text-[#8C8C8C]">
            <span className="text-sm">Loading...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[#8C8C8C]">
            <span className="text-sm">Empty folder</span>
          </div>
        ) : (
          <div>
            {files.map((node) => (
              <FileTreeNode key={node.path} node={node} depth={0} />
            ))}
          </div>
        )}
      </div>

      {/* Root path indicator - also acts as a root-level context target */}
      {rootPath && (
        <div
          className="shrink-0 cursor-context-menu truncate border-t border-[#4E5254] px-2 py-1 text-[10px] text-[#5C5C5C] hover:bg-[#3C3F41]"
          title="Root folder"
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            window.dispatchEvent(new CustomEvent('filetree:closeContextMenu'))
            setRootContextMenu({ x: e.clientX, y: e.clientY })
          }}
        >
          {rootPath}
        </div>
      )}

      {openPath && openName && (
        <HistoryDialog path={openPath} name={openName} onClose={closeHistory} />
      )}

      {rootContextMenu && (
        <ContextMenu
          x={rootContextMenu.x}
          y={rootContextMenu.y}
          onClose={() => { setRootContextMenu(null) }}
          items={[
            { label: 'New File', action: () => { setNewFileOpen(true) } },
            { label: 'New Folder', action: () => { setNewFolderOpen(true) } },
            { separator: true, label: '', action: () => {} },
            { label: 'Paste', action: () => {
              if (!clipboard || !rootPath) return
              void pasteInto(rootPath, clipboard.path, clipboard.mode, addToast).then((ok) => {
                if (ok) {
                  if (clipboard.mode === 'cut') clearClipboard()
                  refresh()
                }
              })
            }, disabled: !clipboard },
            { separator: true, label: '', action: () => {} },
            { label: 'Refresh', action: refresh },
          ]}
        />
      )}

      {newFileOpen && (
        <PromptDialog
          title="New File"
          defaultValue="new-file.txt"
          confirmText="Create"
          cancelText="Cancel"
          onConfirm={(value) => {
            setNewFileOpen(false)
            void doCreateFile(value)
          }}
          onCancel={() => { setNewFileOpen(false) }}
        />
      )}

      {newFolderOpen && (
        <PromptDialog
          title="New Folder"
          defaultValue="new-folder"
          confirmText="Create"
          cancelText="Cancel"
          onConfirm={(value) => {
            setNewFolderOpen(false)
            void doCreateFolder(value)
          }}
          onCancel={() => { setNewFolderOpen(false) }}
        />
      )}
    </div>
  )
}
