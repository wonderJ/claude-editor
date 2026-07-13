import {
  File,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Image,
} from 'lucide-react'
import type { JSX } from 'react'

interface FileIconProps {
  name: string
  size?: number
  className?: string
}

export function FileIcon({ name, size = 16, className = '' }: FileIconProps): JSX.Element {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''

  switch (ext) {
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
    case 'html':
    case 'css':
      return <FileCode size={size} className={className} />
    case 'json':
      return <FileJson size={size} className={className} />
    case 'md':
    case 'txt':
      return <FileText size={size} className={className} />
    case 'svg':
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
      return <Image size={size} className={className} />
    default:
      return <File size={size} className={className} />
  }
}

interface FolderIconProps {
  expanded: boolean
  size?: number
  className?: string
}

export function FolderIcon({ expanded, size = 16, className = '' }: FolderIconProps): JSX.Element {
  return expanded ? (
    <FolderOpen size={size} className={className} />
  ) : (
    <Folder size={size} className={className} />
  )
}
