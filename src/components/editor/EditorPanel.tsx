import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { useEditorStore } from '../../stores/editorStore'
import { useFileStore } from '../../stores/fileStore'
import { TabBar } from './TabBar'
import { MonacoEditor } from './MonacoEditor'
import { ImagePreviewPanel } from './ImagePreviewPanel'
import { WelcomePage } from './WelcomePage'
import { getBaseName, isImageFile } from '../../lib/fileTreeActions'

export function EditorPanel(): JSX.Element {
  const { tabs, activeTabPath, isLoading, openTab, markExternalChange } = useEditorStore()
  const { selectedPath } = useFileStore()
  const [isDragOver, setIsDragOver] = useState(false)

  // When switching to a tab that was marked as changed externally, ask the
  // store to resolve it (auto-reload if clean, prompt via event if modified).
  useEffect(() => {
    if (!activeTabPath) return
    const activeTab = useEditorStore.getState().tabs.find((t) => t.path === activeTabPath)
    if (activeTab?.hasExternalChange) {
      markExternalChange(activeTabPath)
    }
  }, [activeTabPath, markExternalChange])

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

  const activeTab = tabs.find((t) => t.path === activeTabPath)
  const isImage = activeTab ? isImageFile(activeTab.path) : false

  return (
    <div
      className={[
        'flex flex-1 flex-col overflow-hidden bg-[#1E1F22]',
        isDragOver ? 'bg-[#3574F0]/10' : '',
      ].join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <TabBar />

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-[#8C8C8C]">
            Loading...
          </div>
        ) : activeTab ? (
          activeTab.diff ? (
            <DiffEditor
              height="100%"
              theme="vs-dark"
              language={activeTab.language}
              original={activeTab.diff.original}
              modified={activeTab.diff.modified}
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                automaticLayout: true,
              }}
            />
          ) : isImage ? (
            <ImagePreviewPanel path={activeTab.path} name={activeTab.name} />
          ) : (
            <MonacoEditor
              path={activeTab.path}
              content={activeTab.content}
              language={activeTab.language}
            />
          )
        ) : (
          <WelcomePage />
        )}
      </div>
    </div>
  )
}
