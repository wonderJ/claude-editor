import { useState } from 'react'
import type { JSX } from 'react'
import { useFileStore, type FileNode } from '../../stores/fileStore'
import { FileIcon, FolderIcon } from './FileIcons'
import { ContextMenu } from './ContextMenu'

interface FileTreeNodeProps {
  node: FileNode
  depth: number
}

export function FileTreeNode({ node, depth }: FileTreeNodeProps): JSX.Element {
  const { expandedPaths, selectedPath, toggleExpanded, setSelected, addToast, refresh } = useFileStore()
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const paddingLeft = String(depth * 16 + 4) + 'px'

  const handleClick = () => {
    setSelected(node.path)
    if (node.isDirectory) {
      toggleExpanded(node.path)
    }
  }

  const handleDoubleClick = () => {
    if (node.isFile) {
      addToast({ message: `Opened ${node.name}`, type: 'info', duration: 2000 })
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelected(node.path)
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleNewFile = async () => {
    if (!window.electronAPI) return
    const newPath = `${node.path}/new-file.txt`
    const result = await window.electronAPI.createFile(newPath)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
    } else {
      addToast({ message: 'File created', type: 'success' })
      refresh()
    }
  }

  const handleNewFolder = async () => {
    if (!window.electronAPI) return
    const newPath = `${node.path}/new-folder`
    const result = await window.electronAPI.createDir(newPath)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
    } else {
      addToast({ message: 'Folder created', type: 'success' })
      refresh()
    }
  }

  const handleRename = async () => {
    if (!window.electronAPI) return
    const newName = prompt('Enter new name:', node.name)
    if (!newName || newName === node.name) return
    const parentPath = node.path.slice(0, node.path.lastIndexOf('/'))
    const newPath = `${parentPath}/${newName}`
    const result = await window.electronAPI.rename(node.path, newPath)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
    } else {
      addToast({ message: 'Renamed successfully', type: 'success' })
      refresh()
    }
  }

  const handleDelete = async () => {
    if (!window.electronAPI) return
    if (!confirm(`Are you sure you want to delete "${node.name}"?`)) return
    const result = await window.electronAPI.delete(node.path)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
    } else {
      addToast({ message: 'Deleted successfully', type: 'success' })
      refresh()
    }
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.path).then(() => {
      addToast({ message: 'Path copied to clipboard', type: 'success' })
    }).catch(() => {
      addToast({ message: 'Failed to copy path', type: 'error' })
    })
  }

  const menuItems = node.isDirectory
    ? [
        { label: 'New File', icon: '📄', action: handleNewFile },
        { label: 'New Folder', icon: '📁', action: handleNewFolder },
        { separator: true, label: '', action: () => {} },
        { label: 'Rename', icon: '✏️', action: handleRename },
        { label: 'Delete', icon: '🗑️', action: handleDelete, danger: true },
        { separator: true, label: '', action: () => {} },
        { label: 'Copy Path', icon: '📋', action: handleCopyPath },
        { label: 'Refresh', icon: '🔄', action: refresh },
      ]
    : [
        { label: 'Rename', icon: '✏️', action: handleRename },
        { label: 'Delete', icon: '🗑️', action: handleDelete, danger: true },
        { separator: true, label: '', action: () => {} },
        { label: 'Copy Path', icon: '📋', action: handleCopyPath },
      ]

  return (
    <div>
      <div
        className={[
          'flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-sm',
          isSelected ? 'bg-[#4E5254] text-[#DFE1E5]' : 'text-[#A9B7C6] hover:bg-[#3C3F41]',
        ].join(' ')}
        style={{ paddingLeft }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {node.isDirectory && (
          <span className="text-[10px] text-[#8C8C8C]">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {node.isDirectory ? (
          <FolderIcon expanded={isExpanded} size={16} className="shrink-0" />
        ) : (
          <FileIcon name={node.name} size={16} className="shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
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
