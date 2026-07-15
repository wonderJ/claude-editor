import type { JSX } from 'react'
import { Modal } from '../common/Modal'

interface ReleaseNotesDialogProps {
  isOpen: boolean
  onClose: () => void
  version?: string
}

export function ReleaseNotesDialog({
  isOpen,
  onClose,
  version,
}: ReleaseNotesDialogProps): JSX.Element | null {
  if (!isOpen) return null
  return (
    <Modal title={`Release Notes - ${version ?? '0.0.0'}`} onClose={onClose} widthClass="w-[480px]">
      <div className="space-y-3 text-sm text-[#DFE1E5]">
        <p className="font-medium">Latest changes:</p>
        <ul className="list-inside list-disc space-y-1 text-xs text-[#A9B7C6]">
          <li>Added full menu bar with IDE-style shortcuts.</li>
          <li>Added Git menu, command palette, and terminal actions.</li>
          <li>Added editor context menus and tab context menus.</li>
          <li>Added recent projects and theme settings.</li>
        </ul>
      </div>
    </Modal>
  )
}
