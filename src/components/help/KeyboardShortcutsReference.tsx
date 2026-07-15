import type { JSX } from 'react'
import { Modal } from '../common/Modal'

const SHORTCUTS: { label: string; shortcut: string }[] = [
  { label: 'New File', shortcut: 'Ctrl+N' },
  { label: 'New Folder', shortcut: 'Ctrl+Shift+N' },
  { label: 'Open Folder', shortcut: 'Ctrl+K Ctrl+O' },
  { label: 'Save', shortcut: 'Ctrl+S' },
  { label: 'Save All', shortcut: 'Ctrl+K S' },
  { label: 'Close Editor', shortcut: 'Ctrl+W' },
  { label: 'Close Folder', shortcut: 'Ctrl+K F' },
  { label: 'Settings', shortcut: 'Ctrl+,' },
  { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S' },
  { label: 'Undo', shortcut: 'Ctrl+Z' },
  { label: 'Redo', shortcut: 'Ctrl+Shift+Z' },
  { label: 'Cut', shortcut: 'Ctrl+X' },
  { label: 'Copy', shortcut: 'Ctrl+C' },
  { label: 'Paste', shortcut: 'Ctrl+V' },
  { label: 'Find', shortcut: 'Ctrl+F' },
  { label: 'Replace', shortcut: 'Ctrl+H' },
  { label: 'Find in Files', shortcut: 'Ctrl+Shift+F' },
  { label: 'Replace in Files', shortcut: 'Ctrl+Shift+H' },
  { label: 'Sidebar', shortcut: 'Ctrl+B' },
  { label: 'Terminal', shortcut: 'Ctrl+`' },
  { label: 'Command Palette', shortcut: 'Ctrl+Shift+P' },
  { label: 'Zoom In', shortcut: 'Ctrl+=' },
  { label: 'Zoom Out', shortcut: 'Ctrl+-' },
  { label: 'Reset Zoom', shortcut: 'Ctrl+0' },
  { label: 'Go to File', shortcut: 'Ctrl+P' },
  { label: 'Go to Symbol', shortcut: 'Ctrl+Shift+O' },
  { label: 'Go to Line', shortcut: 'Ctrl+G' },
  { label: 'Go to Definition', shortcut: 'F12' },
  { label: 'Format Document', shortcut: 'Shift+Alt+F' },
  { label: 'Format Selection', shortcut: 'Ctrl+K Ctrl+F' },
  { label: 'Commit', shortcut: 'Ctrl+K' },
  { label: 'Push', shortcut: 'Ctrl+Shift+K' },
  { label: 'Update Project', shortcut: 'Ctrl+T' },
  { label: 'New Terminal', shortcut: 'Ctrl+Shift+`' },
]

interface KeyboardShortcutsReferenceProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsReference({
  isOpen,
  onClose,
}: KeyboardShortcutsReferenceProps): JSX.Element | null {
  if (!isOpen) return null
  return (
    <Modal title="Keyboard Shortcuts Reference" onClose={onClose} widthClass="w-[480px]">
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full text-left text-xs">
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.label} className="border-b border-[#4E5254] last:border-0">
                <td className="py-1.5 pr-4 text-[#DFE1E5]">{s.label}</td>
                <td className="py-1.5 text-right text-[#8C8C8C]">{s.shortcut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
