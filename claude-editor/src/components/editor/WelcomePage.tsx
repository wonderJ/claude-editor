import { FileCode, FolderOpen, Keyboard } from 'lucide-react'
import type { JSX } from 'react'

export function WelcomePage(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-[#8C8C8C]">
      <div className="flex flex-col items-center gap-2">
        <FileCode size={48} className="text-[#3574F0]" />
        <h2 className="text-lg font-medium text-[#DFE1E5]">Claude Editor</h2>
        <p className="text-sm">Open a file to start editing</p>
      </div>

      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-2">
          <FolderOpen size={14} />
          <span>Click a file in the sidebar to open</span>
        </div>
        <div className="flex items-center gap-2">
          <Keyboard size={14} />
          <span>Ctrl+O to open a folder</span>
        </div>
      </div>
    </div>
  )
}
