import type { JSX } from 'react'
import { Modal } from '../common/Modal'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
  version?: string
}

export function AboutDialog({ isOpen, onClose, version }: AboutDialogProps): JSX.Element | null {
  if (!isOpen) return null
  return (
    <Modal title="About Claude Editor" onClose={onClose} widthClass="w-[360px]">
      <div className="space-y-2 text-sm text-[#DFE1E5]">
        <p><strong>Claude Editor</strong></p>
        <p className="text-xs text-[#8C8C8C]">Version: {version ?? '0.0.0'}</p>
        <p className="text-xs text-[#8C8C8C]">A lightweight desktop code editor powered by Claude.</p>
      </div>
    </Modal>
  )
}
