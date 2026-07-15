import type { JSX } from 'react'
import { Modal } from '../common/Modal'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  theme: 'dark' | 'light'
  onThemeChange: (theme: 'dark' | 'light') => void
}

export function SettingsDialog({
  isOpen,
  onClose,
  theme,
  onThemeChange,
}: SettingsDialogProps): JSX.Element | null {
  if (!isOpen) return null
  return (
    <Modal title="Settings" onClose={onClose} widthClass="w-[480px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#DFE1E5]">Theme</span>
          <select
            value={theme}
            onChange={(e) => { onThemeChange(e.target.value as 'dark' | 'light') }}
            className="rounded border border-[#4E5254] bg-[#1E1F22] px-2 py-1 text-xs text-[#DFE1E5] outline-none focus:border-[#3574F0]"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        <p className="text-xs text-[#8C8C8C]">
          More settings will be added in future releases.
        </p>
      </div>
    </Modal>
  )
}
