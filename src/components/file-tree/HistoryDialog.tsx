import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import type { HistoryVersion } from '../../../electron/preload'
import { Modal } from '../common/Modal'
import { useFileStore } from '../../stores/fileStore'
import { useEditorStore } from '../../stores/editorStore'

interface HistoryDialogProps {
  path: string
  name: string
  onClose: () => void
}

export function HistoryDialog({ path, name, onClose }: HistoryDialogProps): JSX.Element {
  const { addToast, refresh } = useFileStore()
  const { tabs, updateContent, markSaved } = useEditorStore()
  const [versions, setVersions] = useState<HistoryVersion[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [current, setCurrent] = useState('')
  const [snapshot, setSnapshot] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!window.electronAPI) return
      const [list, cur] = await Promise.all([
        window.electronAPI.historyList(path),
        window.electronAPI.readFile(path),
      ])
      if (cancelled) return
      if ('error' in list) {
        addToast({ message: list.error, type: 'error' })
        return
      }
      if ('content' in cur) setCurrent(cur.content)
      setVersions(list.versions)
      if (list.versions.length > 0) {
        setSelectedId(list.versions[0]?.id ?? null)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [path, addToast])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!selectedId || !window.electronAPI) return
      const result = await window.electronAPI.historyRead(path, selectedId)
      if (cancelled) return
      if ('error' in result) {
        addToast({ message: result.error, type: 'error' })
        return
      }
      setSnapshot(result.content)
    }
    void load()
    return () => { cancelled = true }
  }, [selectedId, path, addToast])

  const handleRollback = async () => {
    if (!selectedId || !window.electronAPI) return
    const result = await window.electronAPI.historyRollback(path, selectedId)
    if ('error' in result) {
      addToast({ message: result.error, type: 'error' })
      return
    }
    if (tabs.some((t) => t.path === path)) {
      updateContent(path, result.content)
      markSaved(path)
    }
    addToast({ message: 'Rolled back', type: 'success' })
    refresh()
    onClose()
  }

  return (
    <Modal
      title={`History — ${name}`}
      onClose={onClose}
      widthClass="w-[900px]"
      footer={
        <>
          <button
            type="button"
            className="rounded px-3 py-1 text-xs text-[#DFE1E5] hover:bg-[#3C3F41]"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            disabled={!selectedId}
            className="rounded bg-[#3574F0] px-3 py-1 text-xs text-white hover:bg-[#4682F5] disabled:opacity-50"
            onClick={() => { void handleRollback() }}
          >
            Rollback to this version
          </button>
        </>
      }
    >
      <div className="flex h-[60vh] gap-2">
        <div className="w-48 shrink-0 overflow-auto border-r border-[#4E5254] pr-2">
          {versions.length === 0 ? (
            <span className="text-sm text-[#8C8C8C]">No history yet</span>
          ) : (
            versions.map((v) => (
              <button
                key={v.id}
                type="button"
                className={[
                  'block w-full truncate rounded px-2 py-1 text-left text-xs',
                  v.id === selectedId ? 'bg-[#4E5254] text-[#DFE1E5]' : 'text-[#A9B7C6] hover:bg-[#3C3F41]',
                ].join(' ')}
                onClick={() => { setSelectedId(v.id) }}
              >
                {new Date(v.timestamp).toLocaleString()}
              </button>
            ))
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <DiffEditor
            height="100%"
            theme="vs-dark"
            original={snapshot}
            modified={current}
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </Modal>
  )
}
