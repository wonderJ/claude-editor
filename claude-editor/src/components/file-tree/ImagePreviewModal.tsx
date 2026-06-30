import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { Modal } from '../common/Modal'
import { useFileStore } from '../../stores/fileStore'

interface ImagePreviewModalProps {
  path: string
  name: string
  onClose: () => void
}

export function ImagePreviewModal({ path, name, onClose }: ImagePreviewModalProps): JSX.Element {
  const { addToast } = useFileStore()
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!window.electronAPI) return
      const result = await window.electronAPI.readFileBase64(path)
      if (cancelled) return
      if ('error' in result) {
        addToast({ message: `Failed to load image: ${result.error}`, type: 'error' })
        onClose()
        return
      }
      setSrc(`data:${result.mime};base64,${result.data}`)
    }
    void load()
    return () => { cancelled = true }
  }, [path, addToast, onClose])

  return (
    <Modal title={name} onClose={onClose} widthClass="w-[720px]">
      <div className="flex min-h-[200px] items-center justify-center">
        {src ? (
          <img src={src} alt={name} className="max-h-[70vh] max-w-full object-contain" />
        ) : (
          <span className="text-sm text-[#8C8C8C]">Loading image...</span>
        )}
      </div>
    </Modal>
  )
}
