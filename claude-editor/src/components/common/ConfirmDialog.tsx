import { useEffect } from 'react'
import type { JSX } from 'react'
import { Modal } from '../common/Modal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [onConfirm])

  return (
    <Modal
      title={title}
      onClose={onCancel}
      widthClass="w-[400px]"
      footer={
        <>
          <button
            type="button"
            className="flex h-7 items-center justify-center rounded px-3 text-xs leading-none text-[#DFE1E5] hover:bg-[#3C3F41]"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={[
              'flex h-7 items-center justify-center rounded px-3 text-xs leading-none text-white',
              danger ? 'bg-[#E53E3E] hover:bg-[#F56565]' : 'bg-[#3574F0] hover:bg-[#4682F5]',
            ].join(' ')}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-[#DFE1E5]">{message}</p>
    </Modal>
  )
}
