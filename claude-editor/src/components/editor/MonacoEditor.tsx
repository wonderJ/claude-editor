import { useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import type { JSX } from 'react'
import { useEditorStore, scheduleAutoSave } from '../../stores/editorStore'
import { useFileStore } from '../../stores/fileStore'

interface MonacoEditorProps {
  path: string
  content: string
  language: string
}

export function MonacoEditor({ path, content, language }: MonacoEditorProps): JSX.Element {
  const { updateContent, markSaved } = useEditorStore()
  const { addToast } = useFileStore()
  const editorRef = useRef<Parameters<NonNullable<Parameters<typeof Editor>[0]['onMount']>>[0] | null>(null)

  const handleMount = useCallback((editor: Parameters<NonNullable<Parameters<typeof Editor>[0]['onMount']>>[0]) => {
    editorRef.current = editor
  }, [])

  const handleChange = useCallback((value: string | undefined) => {
    if (value === undefined) return
    updateContent(path, value)
    scheduleAutoSave(
      path,
      value,
      () => {
        markSaved(path)
      },
      (msg) => {
        addToast({ message: `Auto-save failed: ${msg}`, type: 'error' })
      }
    )
  }, [path, updateContent, markSaved, addToast])

  return (
    <Editor
      height="100%"
      path={path}
      language={language}
      value={content}
      theme="vs-dark"
      onMount={handleMount}
      onChange={handleChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        automaticLayout: true,
        padding: { top: 8 },
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
      }}
      loading={
        <div className="flex h-full items-center justify-center text-sm text-[#8C8C8C]">
          Loading editor...
        </div>
      }
    />
  )
}
