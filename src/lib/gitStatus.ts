import type { GitFileStatus, GitFileEntry } from '../../electron/preload'

/** Filename colors keyed by git status (IDEA-like palette). */
export const STATUS_COLORS: Record<GitFileStatus, string | null> = {
  modified: '#3574F0',
  added: '#499C54',
  untracked: '#C75450',
  deleted: '#6B7280',
  renamed: '#9E7CD7',
  conflict: '#E53E3E',
  ignored: '#6B7280',
  unmodified: null,
}

/** The effective status of a file = worktree status, falling back to index status. */
function effectiveStatus(entry: GitFileEntry): GitFileStatus {
  if (entry.worktreeStatus !== 'unmodified') return entry.worktreeStatus
  return entry.indexStatus
}

/** Normalize a path to forward slashes for comparison. */
function norm(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '')
}

/**
 * Resolve the git status of a file-tree node.
 * @param nodePath absolute path of the node
 * @param rootPath repo root absolute path
 * @param files git status entries (repo-relative paths)
 */
export function getNodeGitStatus(
  nodePath: string,
  rootPath: string | null,
  files: GitFileEntry[]
): GitFileStatus | null {
  if (!rootPath) return null
  const root = norm(rootPath)
  const node = norm(nodePath)
  if (!node.startsWith(root + '/')) return null
  const rel = node.slice(root.length + 1)
  const match = files.find((f) => norm(f.path) === rel)
  return match ? effectiveStatus(match) : null
}
