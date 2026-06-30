import { useEffect } from 'react'
import type { JSX } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useFileStore } from '../../stores/fileStore'
import { TabBar } from './TabBar'
import { MonacoEditor } from './MonacoEditor'
import { ImagePreviewPanel } from './ImagePreviewPanel'
import { WelcomePage } from './WelcomePage'
import { isImageFile } from '../../lib/fileTreeActions'

export function EditorPanel(): JSX.Element {
  const { tabs, activeTabPath, isLoading, openTab } = useEditorStore()
  const { selectedPath } = useFileStore()

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

  const activeTab = tabs.find((t) => t.path === activeTabPath)
  const isImage = activeTab ? isImageFile(activeTab.path) : false

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#1E1F22]">
      <TabBar />

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-[#8C8C8C]">
            Loading...
          </div>
        ) : activeTab ? (
          isImage ? (
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
