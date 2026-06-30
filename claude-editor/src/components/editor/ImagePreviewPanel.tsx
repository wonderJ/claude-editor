import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useFileStore } from '../../stores/fileStore'

interface ImagePreviewPanelProps {
  path: string
  name: string
}

export function ImagePreviewPanel({ path, name }: ImagePreviewPanelProps): JSX.Element {
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
        return
      }
      setSrc(`data:${result.mime};base64,${result.data}`)
    }
    void load()
    return () => { cancelled = true }
  }, [path, addToast])

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      {src ? (
        <img src={src} alt={name} className="max-h-full max-w-full object-contain shadow-lg" />
      ) : (
        <span className="text-sm text-[#8C8C8C]">Loading image...</span>
      )}
    </div>
  )
}
