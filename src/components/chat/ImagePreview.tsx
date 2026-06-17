import { useState } from 'react'
import type { JSX } from 'react'
import { X, ZoomIn } from 'lucide-react'

interface ImagePreviewProps {
  images: string[]
}

export function ImagePreview({ images }: ImagePreviewProps): JSX.Element {
  const [enlarged, setEnlarged] = useState<number | null>(null)

  if (images.length === 0) return <div className="hidden" />

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((img, idx) => (
        <div key={idx} className="relative group">
          <img
            src={img}
            alt="Attached"
            className="h-[120px] max-w-[200px] cursor-pointer rounded-md object-cover transition-transform hover:scale-[1.02]"
            onClick={() => { setEnlarged(idx) }}
          />
          <div className="absolute inset-0 hidden items-center justify-center rounded-md bg-black/30 group-hover:flex">
            <ZoomIn size={16} className="text-white" />
          </div>
        </div>
      ))}

      {enlarged !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => { setEnlarged(null) }}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#2B2D30] text-white hover:bg-[#4E5254]"
          >
            <X size={16} />
          </button>
          <img
            src={images[enlarged]}
            alt="Enlarged"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => { e.stopPropagation() }}
          />
        </div>
      )}
    </div>
  )
}
