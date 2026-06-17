import { X } from 'lucide-react'
import type { JSX } from 'react'
import { useFileStore } from '../../stores/fileStore'

const TYPE_COLORS = {
  success: 'border-l-[#36B37E]',
  error: 'border-l-[#E53E3E]',
  warning: 'border-l-[#F2C94C]',
  info: 'border-l-[#4299E1]',
}

export function ToastContainer(): JSX.Element {
  const { toasts } = useFileStore()

  if (toasts.length === 0) return <div className="hidden" />

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function ToastItem({ toast }: { toast: { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' } }): JSX.Element {
  const { removeToast } = useFileStore()

  return (
    <div
      className={[
        'flex items-center gap-2 rounded-md border border-[#4E5254] border-l-4 bg-[#2B2D30] px-3 py-2 shadow-md',
        TYPE_COLORS[toast.type],
      ].join(' ')}
    >
      <span className="text-sm text-[#DFE1E5]">{toast.message}</span>
      <button
        type="button"
        className="ml-2 text-[#8C8C8C] hover:text-[#DFE1E5]"
        onClick={() => {
          removeToast(toast.id)
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
