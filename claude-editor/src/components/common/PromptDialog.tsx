import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { Modal } from '../common/Modal'

interface PromptDialogProps {
  title: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function PromptDialog({
  title,
  defaultValue = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: PromptDialogProps): JSX.Element {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  return (
    <Modal
      title={title}
      onClose={onCancel}
      widthClass="w-[400px]"
      footer={
        <>
          <button
            type="button"
            className="rounded px-3 py-1 text-xs text-[#DFE1E5] hover:bg-[#3C3F41]"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="rounded bg-[#3574F0] px-3 py-1 text-xs text-white hover:bg-[#4682F5]"
            onClick={() => { onConfirm(value) }}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConfirm(value)
          if (e.key === 'Escape') onCancel()
        }}
        className="w-full rounded border border-[#4E5254] bg-[#1E1F22] px-2 py-1.5 text-sm text-[#DFE1E5] outline-none focus:border-[#3574F0]"
      />
    </Modal>
  )
}
