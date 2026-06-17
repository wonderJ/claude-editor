import { useEffect } from 'react'
import type { JSX } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useFileStore } from '../../stores/fileStore'
import { TabBar } from './TabBar'
import { MonacoEditor } from './MonacoEditor'
import { WelcomePage } from './WelcomePage'

export function EditorPanel(): JSX.Element {
  const { tabs, activeTabPath, isLoading, openTab } = useEditorStore()
  const { selectedPath } = useFileStore()

  // Open file from file tree when selected path changes
  useEffect(() => {
    if (!selectedPath) return
    const loadFile = async () => {
      if (!window.electronAPI) return
      const result = await window.electronAPI.readFile(selectedPath)
      if ('content' in result) {
        const name = selectedPath.split('/').pop() ?? selectedPath
        openTab(selectedPath, name, result.content)
      }
    }
    void loadFile()
  }, [selectedPath, openTab])

  const activeTab = tabs.find((t) => t.path === activeTabPath)

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#1E1F22]">
      <TabBar />

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-[#8C8C8C]">
            Loading...
          </div>
        ) : activeTab ? (
          <MonacoEditor
            key={activeTab.path}
            path={activeTab.path}
            content={activeTab.content}
            language={activeTab.language}
          />
        ) : (
          <WelcomePage />
        )}
      </div>
    </div>
  )
}
