import type { FileNode, Toast } from '../stores/fileStore'

export type AddToast = (toast: Omit<Toast, 'id'>) => void

export function getParentPath(p: string): string {
  const lastSep = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return lastSep >= 0 ? p.slice(0, lastSep) : p
}

export function getBaseName(p: string): string {
  const lastSep = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return lastSep >= 0 ? p.slice(lastSep + 1) : p
}

export function joinPath(parent: string, name: string): string {
  const sep = parent.endsWith('/') || parent.endsWith('\\') ? '' : '/'
  return parent + sep + name
}

export async function generateUniquePath(parentPath: string, baseName: string): Promise<string> {
  if (!window.electronAPI) return joinPath(parentPath, baseName)
  const result = await window.electronAPI.readDir(parentPath)
  if ('error' in result) return joinPath(parentPath, baseName)
  const existing = new Set(result.map((e) => e.name))
  if (!existing.has(baseName)) return joinPath(parentPath, baseName)

  const dot = baseName.lastIndexOf('.')
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName
  const ext = dot > 0 ? baseName.slice(dot) : ''
  let idx = 1
  while (existing.has(`${stem}-${String(idx)}${ext}`)) {
    idx++
  }
  return joinPath(parentPath, `${stem}-${String(idx)}${ext}`)
}

export async function pasteInto(
  destDir: string,
  srcPath: string,
  mode: 'cut' | 'copy',
  addToast: AddToast
): Promise<boolean> {
  if (!window.electronAPI) {
    addToast({ message: 'Electron API not available', type: 'error' })
    return false
  }
  const dest = await generateUniquePath(destDir, getBaseName(srcPath))
  const result = mode === 'copy'
    ? await window.electronAPI.copyPath(srcPath, dest)
    : await window.electronAPI.rename(srcPath, dest)
  if ('error' in result) {
    addToast({ message: result.error, type: 'error' })
    return false
  }
  addToast({ message: mode === 'copy' ? 'Pasted (copy)' : 'Pasted (moved)', type: 'success' })
  return true
}

export async function openInExplorer(targetPath: string, addToast: AddToast): Promise<void> {
  if (!window.electronAPI) {
    addToast({ message: 'Electron API not available', type: 'error' })
    return
  }
  const result = await window.electronAPI.openInExplorer(targetPath)
  if ('error' in result) addToast({ message: result.error, type: 'error' })
}

export function copyReference(rootPath: string | null, absPath: string, addToast: AddToast): void {
  const rel = rootPath && absPath.startsWith(rootPath)
    ? absPath.slice(rootPath.length).replace(/^[\\/]/, '')
    : absPath
  navigator.clipboard.writeText(rel).then(
    () => { addToast({ message: 'Reference copied', type: 'success' }) },
    () => { addToast({ message: 'Failed to copy reference', type: 'error' }) }
  )
}

export function findNode(nodes: FileNode[], target: string): FileNode | null {
  for (const n of nodes) {
    if (n.path === target) return n
    if (n.children) {
      const found = findNode(n.children, target)
      if (found) return found
    }
  }
  return null
}

export function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)
}
