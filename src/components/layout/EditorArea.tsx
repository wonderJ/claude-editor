import type { JSX } from 'react'
import { useCallback, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { EditorPanel } from '../editor/EditorPanel'
import { ResizableSplitter } from './ResizableSplitter'

const MIN_WIDTH = 200

export function EditorArea(): JSX.Element {
  const { splitTabPaths, closeAllSplitTabs } = useEditorStore()
  const [splitWidth, setSplitWidth] = useState(400)

  const handleResize = useCallback((delta: number) => {
    setSplitWidth((w) => Math.max(MIN_WIDTH, w - delta))
  }, [])

  if (splitTabPaths.length === 0) {
    return <EditorPanel />
  }

  const currentSplitPath = splitTabPaths[splitTabPaths.length - 1] ?? null

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <EditorPanel />
      </div>
      <ResizableSplitter direction="horizontal" onResize={handleResize} />
      <div
        className="relative flex shrink-0 flex-col overflow-hidden"
        style={{ width: splitWidth }}
      >
        <button
          type="button"
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded bg-[#3C3F41] text-[#8C8C8C] hover:text-[#DFE1E5]"
          onClick={() => { closeAllSplitTabs() }}
          title="Close split editor"
        >
          ×
        </button>
        <EditorPanel forcedTabPath={currentSplitPath} />
      </div>
    </div>
  )
}
