import { useRef, useCallback, useEffect } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import type { JSX } from 'react'
import { useEditorStore, scheduleAutoSave } from '../../stores/editorStore'
import { useFileStore } from '../../stores/fileStore'
import { useGitStore } from '../../stores/gitStore'
import { useHistoryStore } from '../../stores/historyStore'
import { getBaseName } from '../../lib/fileTreeActions'

// Load Monaco from local assets instead of CDN so the packaged Electron app
// works offline and shows the editor immediately.
loader.config({
  paths: {
    vs: `${import.meta.env.BASE_URL}monaco-editor/vs`,
  },
})

interface MonacoEditorProps {
  path: string
  content: string
  language: string
}

type MonacoEditorInstance = Parameters<NonNullable<Parameters<typeof Editor>[0]['onMount']>>[0]

export function MonacoEditor({ path, content, language }: MonacoEditorProps): JSX.Element {
  const { updateContent, markSaved, openDiffTab } = useEditorStore()
  const { rootPath, addToast } = useFileStore()
  const { open: openHistory } = useHistoryStore()
  const editorRef = useRef<MonacoEditorInstance | null>(null)
  const pathRef = useRef(path)

  useEffect(() => {
    pathRef.current = path
  }, [path])

  /** Convert an absolute path to a repo-relative forward-slash path. */
  const toRepoRel = useCallback((nodePath: string): string | null => {
    if (!rootPath) return null
    const root = rootPath.replace(/\\/g, '/').replace(/\/+$/, '')
    const node = nodePath.replace(/\\/g, '/').replace(/\/+$/, '')
    if (!node.startsWith(root + '/')) return null
    return node.slice(root.length + 1)
  }, [rootPath])

  const handleMount = useCallback((editor: MonacoEditorInstance) => {
    editorRef.current = editor

    editor.addAction({
      id: 'claude-editor.showDiff',
      label: 'Show Diff',
      contextMenuGroupId: 'git',
      contextMenuOrder: 1,
      run: async () => {
        const p = pathRef.current
        const rel = toRepoRel(p)
        const { repoPath, statusMap } = useGitStore.getState()
        if (!repoPath || !rel) {
          addToast({ message: 'Not in a Git repository', type: 'info' })
          return
        }
        const status = statusMap.get(rel)
        if (!status || status === 'unmodified' || status === 'ignored') {
          addToast({ message: 'No changes to diff', type: 'info' })
          return
        }
        const mode: 'working' | 'staged' = status === 'added' ? 'staged' : 'working'
        if (!window.electronAPI) return
        const res = await window.electronAPI.gitDiff(repoPath, rel, mode)
        if ('error' in res) {
          addToast({ message: res.error, type: 'error' })
          return
        }
        openDiffTab(p, getBaseName(p), {
          mode,
          original: res.original,
          modified: res.modified,
          filePath: p,
        })
      },
    })

    editor.addAction({
      id: 'claude-editor.showHistory',
      label: 'Show History',
      contextMenuGroupId: 'git',
      contextMenuOrder: 2,
      run: () => {
        const p = pathRef.current
        openHistory(p, getBaseName(p))
      },
    })

    editor.addAction({
      id: 'claude-editor.discardChanges',
      label: 'Discard Changes',
      contextMenuGroupId: 'git',
      contextMenuOrder: 3,
      run: async () => {
        const p = pathRef.current
        const rel = toRepoRel(p)
        const { repoPath, statusMap, discardFiles } = useGitStore.getState()
        if (!repoPath || !rel) {
          addToast({ message: 'Not in a Git repository', type: 'info' })
          return
        }
        const status = statusMap.get(rel)
        if (!status || status === 'unmodified' || status === 'ignored') {
          addToast({ message: 'No changes to discard', type: 'info' })
          return
        }
        if (!window.confirm(`Discard changes for ${getBaseName(p)}? This cannot be undone.`)) return
        if (status === 'untracked') {
          if (!window.electronAPI) return
          const res = await window.electronAPI.delete(p)
          if ('error' in res) {
            addToast({ message: res.error, type: 'error' })
          } else {
            addToast({ message: 'Deleted untracked file', type: 'success' })
          }
          useFileStore.getState().refresh()
          void useGitStore.getState().refreshStatus()
          return
        }
        await discardFiles([rel])
      },
    })
  }, [addToast, openDiffTab, openHistory, toRepoRel])

  const runAction = useCallback((actionId: string) => {
    const editor = editorRef.current
    if (!editor) return
    const action = editor.getAction(actionId)
    if (action) {
      void action.run()
    }
  }, [])

  useEffect(() => {
    const handlers: Record<string, () => void> = {
      'editor:undo': () => { runAction('undo') },
      'editor:redo': () => { runAction('redo') },
      'editor:selectAll': () => { runAction('editor.action.selectAll') },
      'editor:find': () => { runAction('actions.find') },
      'editor:replace': () => { runAction('editor.action.startFindReplaceAction:') },
      'editor:gotoSymbol': () => { runAction('editor.action.quickOutline') },
      'editor:gotoLine': () => { runAction('editor.action.gotoLine') },
      'editor:gotoDefinition': () => { runAction('editor.action.revealDefinition') },
      'editor:format': () => { runAction('editor.action.formatDocument') },
      'editor:formatSelection': () => { runAction('editor.action.formatSelection') },
      'editor:comment': () => { runAction('editor.action.commentLine') },
    }
    const onEvent = (e: Event) => {
      const handler = handlers[(e as CustomEvent).type]
      if (handler) handler()
    }
    for (const type of Object.keys(handlers)) {
      window.addEventListener(type, onEvent)
    }
    return () => {
      for (const type of Object.keys(handlers)) {
        window.removeEventListener(type, onEvent)
      }
    }
  }, [runAction])

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
        unusualLineTerminators: 'auto',
      }}
      loading={
        <div className="flex h-full items-center justify-center text-sm text-[#8C8C8C]">
          Loading editor...
        </div>
      }
    />
  )
}
