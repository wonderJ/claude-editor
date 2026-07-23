import { useEffect, useState, lazy, Suspense } from 'react'
import type { JSX } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useFileStore } from '../../stores/fileStore'
import { TabBar } from './TabBar'
import { MonacoEditor } from './MonacoEditor'
import { ImagePreviewPanel } from './ImagePreviewPanel'
import { WelcomePage } from './WelcomePage'
import { getBaseName, isImageFile } from '../../lib/fileTreeActions'

const DiffEditor = lazy(() => import('@monaco-editor/react').then((m) => ({ default: m.DiffEditor })))

function DiffEditorFallback(): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[#8C8C8C]">
      Loading diff editor...
    </div>
  )
}

interface EditorPanelProps {
  forcedTabPath?: string | null
}

export function EditorPanel({ forcedTabPath }: EditorPanelProps): JSX.Element {
  const { tabs, activeTabPath, isLoading, openTab, markExternalChange } = useEditorStore()
  const { selectedPath } = useFileStore()
  const [isDragOver, setIsDragOver] = useState(false)

  const isSplit = Boolean(forcedTabPath)
  const currentTabPath = forcedTabPath ?? activeTabPath

  // When switching to a tab that was marked as changed externally, ask the
  // store to resolve it (auto-reload if clean, prompt via event if modified).
  useEffect(() => {
    if (!currentTabPath) return
    const currentTab = useEditorStore.getState().tabs.find((t) => t.path === currentTabPath)
    if (currentTab?.hasExternalChange) {
      markExternalChange(currentTabPath)
    }
  }, [currentTabPath, markExternalChange])

  useEffect(() => {
    if (!selectedPath) return
    const name = selectedPath.split(/[\\/]/).pop() ?? selectedPath
    if (isImageFile(selectedPath)) {
      openTab(selectedPath, name, '')
      return
    }
    const loadFile = async () => {
      if (!window.electronAPI) return
      const result = await window.electronAPI.readFile(selectedPath)
      if ('content' in result) {
        openTab(selectedPath, name, result.content)
      }
    }
    void loadFile()
  }, [selectedPath, openTab])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!window.electronAPI) return

    const dt = e.dataTransfer
    if (!dt?.files?.length) return

    for (const file of Array.from(dt.files)) {
      const filePath = window.electronAPI.getPathForFile(file)
      if (!filePath) continue
      const name = getBaseName(filePath)
      if (isImageFile(filePath)) {
        openTab(filePath, name, '')
      } else {
        const result = await window.electronAPI.readFile(filePath)
        if ('content' in result) {
          openTab(filePath, name, result.content)
        }
      }
    }
  }

  const currentTab = tabs.find((t) => t.path === currentTabPath)
  const isImage = currentTab ? isImageFile(currentTab.path) : false

  return (
    <div
      className={[
        'flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#1E1F22]',
        isDragOver ? 'bg-[#3574F0]/10' : '',
      ].join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!isSplit && <TabBar variant="primary" />}
      {isSplit && <TabBar variant="split" />}

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-[#8C8C8C]">
            Loading...
          </div>
        ) : currentTab ? (
          currentTab.diff ? (
            <Suspense fallback={<DiffEditorFallback />}>
              <DiffEditor
                height="100%"
                theme="vs-dark"
                language={currentTab.language}
                original={currentTab.diff.original}
                modified={currentTab.diff.modified}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  automaticLayout: true,
                }}
              />
            </Suspense>
          ) : isImage ? (
            <ImagePreviewPanel path={currentTab.path} name={currentTab.name} />
          ) : (
            <MonacoEditor
              path={currentTab.path}
              content={currentTab.content}
              language={currentTab.language}
            />
          )
        ) : (
          <WelcomePage />
        )}
      </div>
    </div>
  )
}
