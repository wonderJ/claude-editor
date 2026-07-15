import type { JSX } from 'react'
import { useState } from 'react'
import { Modal } from '../common/Modal'

interface Remote {
  name: string
  url: string
}

interface ManageRemotesDialogProps {
  isOpen: boolean
  onClose: () => void
  remotes: Remote[]
  onAdd: (name: string, url: string) => void
  onRemove: (name: string) => void
}

export function ManageRemotesDialog({
  isOpen,
  onClose,
  remotes,
  onAdd,
  onRemove,
}: ManageRemotesDialogProps): JSX.Element | null {
  const [name, setName] = useState('origin')
  const [url, setUrl] = useState('')

  if (!isOpen) return null

  return (
    <Modal title="Manage Remotes" onClose={onClose} widthClass="w-[480px]"
      footer={
        <>
          <button
            type="button"
            className="rounded px-3 py-1 text-xs text-[#DFE1E5] hover:bg-[#3C3F41]"
            onClick={onClose}
          >
            Close
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="max-h-[180px] overflow-auto rounded border border-[#4E5254]">
          {remotes.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-[#8C8C8C]">No remotes configured.</div>
          )}
          {remotes.map((remote) => (
            <div
              key={remote.name}
              className="flex items-center justify-between border-b border-[#4E5254] px-3 py-1.5 text-xs last:border-0"
            >
              <div className="flex flex-col">
                <span className="text-[#DFE1E5]">{remote.name}</span>
                <span className="text-[#8C8C8C]">{remote.url}</span>
              </div>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-[#C75450] hover:bg-[#4E5254]"
                onClick={() => { onRemove(remote.name) }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value) }}
            placeholder="Name"
            className="w-28 rounded border border-[#4E5254] bg-[#1E1F22] px-2 py-1 text-xs text-[#DFE1E5] outline-none focus:border-[#3574F0]"
          />
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value) }}
            placeholder="URL"
            className="flex-1 rounded border border-[#4E5254] bg-[#1E1F22] px-2 py-1 text-xs text-[#DFE1E5] outline-none focus:border-[#3574F0]"
          />
          <button
            type="button"
            disabled={!name.trim() || !url.trim()}
            className="rounded bg-[#3574F0] px-3 py-1 text-xs text-white hover:bg-[#4682F5] disabled:opacity-50"
            onClick={() => {
              onAdd(name.trim(), url.trim())
              setName('origin')
              setUrl('')
            }}
          >
            Add
          </button>
        </div>
      </div>
    </Modal>
  )
}
