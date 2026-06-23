import { FolderOpen, RefreshCw } from 'lucide-react'
import type { JSX } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { FileTreeNode } from './FileTreeNode'
import { ToastContainer } from './ToastContainer'

export function FileTree(): JSX.Element {
  const { rootPath, files, setRootPath, refresh, isLoading } = useFileStore()

  const handleOpenFolder = () => {
    if (!window.electronAPI) return
    void window.electronAPI.selectFolder().then((path) => {
      if (path) {
        setRootPath(path)
      }
    })
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
      <div className="flex-1 overflow-auto p-1">
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

      {/* Root path indicator */}
      {rootPath && (
        <div className="shrink-0 truncate border-t border-[#4E5254] px-2 py-1 text-[10px] text-[#5C5C5C]">
          {rootPath}
        </div>
      )}
    </div>
  )
}
