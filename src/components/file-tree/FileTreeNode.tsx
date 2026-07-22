import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useFileStore, type FileNode } from '../../stores/fileStore'
import { useEditorStore } from '../../stores/editorStore'
import { useHistoryStore } from '../../stores/historyStore'
import { useGitStore } from '../../stores/gitStore'
import { useLayoutStore } from '../../stores/layoutStore'
import { useTerminalStore } from '../../stores/terminalStore'
import { STATUS_COLORS } from '../../lib/gitStatus'
import { FileIcon, FolderIcon } from './FileIcons'
import { ContextMenu } from './ContextMenu'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { PromptDialog } from '../common/PromptDialog'
import {
  copyReference,
  generateUniquePath,
  getParentPath,
  isImageFile,
  openInExplorer,
  pasteInto,
} from '../../lib/fileTreeActions'

interface FileTreeNodeProps {
  node: FileNode
  depth: number
}

/** Convert an absolute node path to a repo-relative forward-slash path. */
function toRepoRel(nodePath: string, rootPath: string | null): string | null {
  if (!rootPath) return null
  const root = rootPath.replace(/\\/g, '/').replace(/\/+$/, '')
  const node = nodePath.replace(/\\/g, '/').replace(/\/+$/, '')
  if (!node.startsWith(root + '/')) return null
  return node.slice(root.length + 1)
}

export function FileTreeNode({ node, depth }: FileTreeNodeProps): JSX.Element {
  const {
    rootPath,
    expandedPaths,
    selectedPath,
    clipboard,
    toggleExpanded,
    setSelected,
    setClipboard,
    clearClipboard,
    addToast,
    refresh,
    updateNodeChildren,
    renameExpandedPath,
  } = useFileStore()
  const { openTab } = useEditorStore()
  const { open: openHistory } = useHistoryStore()
  const gitRel = node.isFile ? toRepoRel(node.path, rootPath) : null
  const gitStatus = useGitStore((s) => (gitRel ? s.statusMap.get(gitRel) ?? null : null))
  const gitColor = gitStatus ? STATUS_COLORS[gitStatus] : null
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [newFileOpen, setNewFileOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  const paddingLeft = String(depth * 16 + 4) + 'px'

  const handleClick = () => {
    setSelected(node.path)
    if (node.isDirectory) {
      toggleExpanded(node.path)
      if (!node.children || node.children.length === 0) {
        void loadChildren(node.path, updateNodeChildren, addToast)
      }
    }
  }

  const handleOpen = () => {
    if (!node.isFile) return
    if (isImageFile(node.name)) {
      openTab(node.path, node.name, '')
      return
    }
    void loadFileToEditor(node.path, node.name, openTab, addToast)
  }

  const handleDoubleClick = () => {
    handleOpen()
  }

  const doCreateFile = async (name: string) => {
    if (!name || !window.electronAPI) return
    const newPath = await generateUniquePath(node.path, name)
    const result = await window.electronAPI.createFile(newPath)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
    } else {
      addToast({ message: 'File created', type: 'success' })
      refresh()
      void useGitStore.getState().refreshStatus()
    }
  }

  const doCreateFolder = async (name: string) => {
    if (!name || !window.electronAPI) return
    const newPath = await generateUniquePath(node.path, name)
    const result = await window.electronAPI.createDir(newPath)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
    } else {
      addToast({ message: 'Folder created', type: 'success' })
      refresh()
      void useGitStore.getState().refreshStatus()
    }
  }

  const doRename = async (newName: string) => {
    if (!newName || newName === node.name || !window.electronAPI) return
    const parentPath = getParentPath(node.path)
    const newPath = joinPathLocal(parentPath, newName)
    const result = await window.electronAPI.rename(node.path, newPath)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
    } else {
      addToast({ message: 'Renamed successfully', type: 'success' })
      renameExpandedPath(node.path, newPath)
      refresh()
      void useGitStore.getState().refreshStatus()
    }
  }

  const doDelete = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.delete(node.path)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
    } else {
      addToast({ message: 'Deleted successfully', type: 'success' })
      refresh()
      void useGitStore.getState().refreshStatus()
    }
  }

  const handleCut = () => {
    setClipboard({ path: node.path, mode: 'cut' })
    addToast({ message: 'Cut', type: 'info', duration: 1500 })
  }

  const handleCopy = () => {
    setClipboard({ path: node.path, mode: 'copy' })
    addToast({ message: 'Copied', type: 'info', duration: 1500 })
  }

  const handlePaste = async () => {
    if (!clipboard) return
    const targetDir = node.isDirectory ? node.path : getParentPath(node.path)
    const ok = await pasteInto(targetDir, clipboard.path, clipboard.mode, addToast)
    if (ok) {
      if (clipboard.mode === 'cut') clearClipboard()
      refresh()
      void useGitStore.getState().refreshStatus()
    }
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.path).then(
      () => { addToast({ message: 'Path copied to clipboard', type: 'success' }) },
      () => { addToast({ message: 'Failed to copy path', type: 'error' }) }
    )
  }

  const handleCopyReference = () => {
    copyReference(rootPath, node.path, addToast)
  }

  const handleOpenInExplorer = () => {
    void openInExplorer(node.path, addToast)
  }

  const handleOpenInTerminal = async () => {
    if (!window.electronAPI) {
      addToast({ message: 'Electron API not available', type: 'error' })
      return
    }
    const rel = rootPath && node.path.startsWith(rootPath)
      ? node.path.slice(rootPath.length).replace(/^[\\/]/, '')
      : node.path
    useLayoutStore.getState().setTerminalCollapsed(false)
    if (!useLayoutStore.getState().terminalVisible) {
      useLayoutStore.getState().toggleTerminal()
    }
    const terminalStore = useTerminalStore.getState()
    let activeId = terminalStore.activeTabId
    if (!activeId) {
      const cwd = rootPath || ''
      activeId = terminalStore.addTab(cwd)
      const result = await window.electronAPI.terminalCreate(activeId, cwd)
      if (result && 'error' in result) {
        addToast({ message: 'Failed to create terminal: ' + result.error, type: 'error' })
        return
      }
    }
    const result = await window.electronAPI.terminalWrite(activeId, rel)
    if (result && 'error' in result) {
      addToast({ message: 'Failed to send to terminal: ' + result.error, type: 'error' })
      return
    }
    terminalStore.setActiveTab(activeId)
    window.dispatchEvent(new CustomEvent('terminal:focus'))
  }

  const handleShowHistory = () => {
    openHistory(node.path, node.name)
  }

  const canPaste = Boolean(clipboard && clipboard.path !== node.path)

  const commonItems = [
    { label: node.isFile && isImageFile(node.name) ? 'Preview Image' : 'Open', action: handleOpen },
    { separator: true, label: '', action: () => {} },
    { label: 'Cut', action: handleCut, shortcut: 'Ctrl+X' },
    { label: 'Copy', action: handleCopy, shortcut: 'Ctrl+C' },
    { label: 'Paste', action: handlePaste, shortcut: 'Ctrl+V', disabled: !canPaste },
    { separator: true, label: '', action: () => {} },
    { label: 'Copy Path', action: handleCopyPath, shortcut: 'Ctrl+Shift+C' },
    { label: 'Copy Reference', action: handleCopyReference },
    { separator: true, label: '', action: () => {} },
    { label: 'Rename', action: () => { setRenameOpen(true) }, shortcut: 'Shift+F6' },
    { label: 'Delete', action: () => { setConfirmDelete(true) }, danger: true, shortcut: 'Del' },
    { separator: true, label: '', action: () => {} },
    { label: 'Open in Explorer', action: handleOpenInExplorer, shortcut: 'Ctrl+Shift+O' },
    { label: '@ in Terminal', action: handleOpenInTerminal },
    { label: 'Show History', action: handleShowHistory },
  ]

  const menuItems = node.isDirectory
    ? [
        { label: 'New File', action: () => { setNewFileOpen(true) } },
        { label: 'New Folder', action: () => { setNewFolderOpen(true) } },
        { separator: true, label: '', action: () => {} },
        ...commonItems.filter((it) => it.label !== 'Open'),
        { separator: true, label: '', action: () => {} },
        { label: 'Refresh', action: refresh },
      ]
    : commonItems

  useEffect(() => {
    const onRename = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === node.path) setRenameOpen(true)
    }
    const onDelete = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === node.path) setConfirmDelete(true)
    }
    window.addEventListener('filetree:rename', onRename)
    window.addEventListener('filetree:delete', onDelete)
    return () => {
      window.removeEventListener('filetree:rename', onRename)
      window.removeEventListener('filetree:delete', onDelete)
    }
  }, [node.path])

  return (
    <div>
      <div
        className={[
          'group flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-sm',
          isSelected
            ? node.isDirectory
              ? 'bg-[#3574F0]/20 text-[#DFE1E5]'
              : 'bg-[#4E5254] text-[#DFE1E5]'
            : node.isDirectory
              ? 'text-[#6BABE0] hover:bg-[#3C3F41]'
              : 'text-[#A9B7C6] hover:bg-[#3C3F41]',
        ].join(' ')}
        style={{ paddingLeft }}
        data-file-tree-node
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          window.dispatchEvent(new CustomEvent('filetree:closeContextMenu'))
          setSelected(node.path)
          setContextMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        {node.isDirectory && (
          <span className={['text-[10px]', isSelected ? 'text-[#DFE1E5]' : 'text-[#6BABE0]/70'].join(' ')}>
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {node.isDirectory ? (
          <FolderIcon expanded={isExpanded} size={16} className={['shrink-0', isSelected ? 'text-[#DFE1E5]' : 'text-[#6BABE0]'].join(' ')} />
        ) : (
          <FileIcon name={node.name} size={16} className={['shrink-0', isSelected ? 'text-[#DFE1E5]' : 'text-[#6BABE0]'].join(' ')} />
        )}
        <span
          className={['truncate', gitStatus === 'deleted' ? 'line-through' : ''].join(' ')}
          style={gitColor && !isSelected ? { color: gitColor } : undefined}
        >
          {node.name}
        </span>
      </div>

      {contextMenu && (
        <ContextMenu
          items={menuItems}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => {
            setContextMenu(null)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete"
          message={`Delete ${node.isDirectory ? 'folder' : 'file'} "${node.name}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          danger
          onConfirm={() => {
            setConfirmDelete(false)
            void doDelete()
          }}
          onCancel={() => { setConfirmDelete(false) }}
        />
      )}

      {renameOpen && (
        <PromptDialog
          title="Rename"
          defaultValue={node.name}
          confirmText="Rename"
          cancelText="Cancel"
          onConfirm={(value) => {
            setRenameOpen(false)
            void doRename(value)
          }}
          onCancel={() => { setRenameOpen(false) }}
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

      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function joinPathLocal(parent: string, name: string): string {
  const sep = parent.endsWith('/') || parent.endsWith('\\') ? '' : '/'
  return parent + sep + name
}

async function loadChildren(
  dirPath: string,
  updateNodeChildren: (path: string, children: FileNode[]) => void,
  addToast: (toast: { message: string; type: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void
): Promise<void> {
  if (!window.electronAPI) {
    addToast({ message: 'Electron API not available', type: 'error' })
    return
  }
  const result = await window.electronAPI.readDir(dirPath)
  if ('error' in result) {
    addToast({ message: `Failed to read directory: ${result.error}`, type: 'error' })
    return
  }
  const entries = Array.isArray(result) ? result : []
  const sorted = entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })
  const children: FileNode[] = sorted.map((entry) => ({
    name: entry.name,
    path: entry.path,
    isDirectory: entry.isDirectory,
    isFile: entry.isFile,
    children: entry.isDirectory ? [] : undefined,
    expanded: false,
    selected: false,
  }))
  updateNodeChildren(dirPath, children)
}

async function loadFileToEditor(
  path: string,
  name: string,
  openTab: (path: string, name: string, content: string) => void,
  addToast: (toast: { message: string; type: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void
): Promise<void> {
  if (!window.electronAPI) {
    addToast({ message: 'Electron API not available', type: 'error' })
    return
  }
  const result = await window.electronAPI.readFile(path)
  if ('error' in result) {
    addToast({ message: `Failed to open file: ${result.error}`, type: 'error' })
    return
  }
  openTab(path, name, result.content)
  addToast({ message: `Opened ${name}`, type: 'info', duration: 2000 })
}
