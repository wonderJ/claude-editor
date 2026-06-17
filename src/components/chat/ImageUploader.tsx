import { useState, useCallback } from 'react'
import type { JSX } from 'react'
import { X, ImagePlus } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useFileStore } from '../../stores/fileStore'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml']

export function ImageUploader(): JSX.Element {
  const { pendingImages, addPendingImage, removePendingImage } = useChatStore()
  const { addToast } = useFileStore()
  const [isDragging, setIsDragging] = useState(false)

  const validateFile = useCallback((file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      addToast({ message: `Unsupported format: ${file.type}. Use PNG/JPG/GIF/SVG.`, type: 'error' })
      return false
    }
    if (file.size > MAX_SIZE) {
      addToast({ message: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB > 5MB limit`, type: 'error' })
      return false
    }
    return true
  }, [addToast])

  const readFile = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => { resolve(reader.result as string) }
      reader.onerror = () => { reject(new Error('Failed to read file')) }
      reader.readAsDataURL(file)
    })
  }, [])

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      if (!validateFile(file)) continue
      try {
        const dataUrl = await readFile(file)
        addPendingImage(dataUrl)
      } catch {
        addToast({ message: `Failed to read ${file.name}`, type: 'error' })
      }
    }
  }, [validateFile, readFile, addPendingImage, addToast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    void handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  return (
    <div
      className={[
        'flex gap-2 overflow-x-auto p-2',
        isDragging ? 'bg-[#3574F0]/10' : '',
      ].join(' ')}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {pendingImages.map((img, idx) => (
        <div key={idx} className="relative shrink-0">
          <img
            src={img}
            alt="Preview"
            className="h-[80px] w-[80px] rounded-md object-cover"
          />
          <button
            type="button"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E53E3E] text-white"
            onClick={() => { removePendingImage(idx) }}
          >
            <X size={10} />
          </button>
        </div>
      ))}
      <div
        className="flex h-[80px] w-[80px] shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed border-[#4E5254] text-[#8C8C8C] hover:border-[#3574F0] hover:text-[#3574F0]"
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/png,image/jpeg,image/jpg,image/gif,image/svg+xml'
          input.multiple = true
          input.onchange = (e) => {
            void handleFiles((e.target as HTMLInputElement).files)
          }
          input.click()
        }}
      >
        <ImagePlus size={20} />
      </div>
    </div>
  )
}
