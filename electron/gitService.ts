import { ipcMain } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// ── Shared types (mirrored in electron/preload.ts) ──────────────────────────

export type GitFileStatus =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'ignored'
  | 'conflict'
  | 'unmodified'

export interface GitFileEntry {
  path: string
  indexStatus: GitFileStatus
  worktreeStatus: GitFileStatus
  originalPath?: string
}

export interface GitStatus {
  branch: string | null
  ahead: number
  behind: number
  tracking?: string
  files: GitFileEntry[]
}

export interface GitBranch {
  name: string
  current: boolean
  remote?: string
}

export interface GitCommit {
  hash: string
  shortHash: string
  subject: string
  authorName: string
  authorEmail: string
  authorDate: number
  refs: string[]
  parents: string[]
}

export type DiffMode = 'working' | 'staged'

export interface GitRemote {
  name: string
  url: string
}

// ── Git runner ──────────────────────────────────────────────────────────────

interface RunResult {
  code: number
  stdout: string
  stderr: string
}

function runGitRaw(repoPath: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: repoPath, windowsHide: true })
    let stdout = ''
    let stderr = ''
    // Guard against a hung git process freezing the app.
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`git ${args.join(' ')} timed out`))
    }, 30000)
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString('utf-8') })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf-8') })
    child.on('error', (err) => { clearTimeout(timer); reject(err) })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? 0, stdout, stderr })
    })
  })
}

/** Run git and reject (with stderr) on non-zero exit. */
async function runGit(repoPath: string, args: string[]): Promise<string> {
  const res = await runGitRaw(repoPath, args)
  if (res.code !== 0) {
    throw new Error(res.stderr.trim() || `git ${args.join(' ')} exited ${String(res.code)}`)
  }
  return res.stdout
}

// ── Parsers ──────────────────────────────────────────────────────────────────

function mapCode(code: string): GitFileStatus {
  switch (code) {
    case 'M': return 'modified'
    case 'A': return 'added'
    case 'D': return 'deleted'
    case 'R': return 'renamed'
    case 'C': return 'added'
    case 'U': return 'conflict'
    case '?': return 'untracked'
    case '!': return 'ignored'
    case ' ': return 'unmodified'
    default: return 'unmodified'
  }
}

function parseStatus(raw: string): GitStatus {
  const status: GitStatus = { branch: null, ahead: 0, behind: 0, files: [] }
  const lines = raw.split('\n')
  for (const line of lines) {
    if (line.length === 0) continue
    if (line.startsWith('## ')) {
      const header = line.slice(3)
      // e.g. "main...origin/main [ahead 1, behind 2]"
      const trackMatch = /^(.+?)(?:\.\.\.(\S+))?(?:\s+\[(.+)\])?$/.exec(header)
      if (trackMatch) {
        const rawBranch = trackMatch[1]
        status.branch = rawBranch && rawBranch !== 'HEAD (no branch)' ? rawBranch : null
        if (trackMatch[2]) status.tracking = trackMatch[2]
        const meta = trackMatch[3]
        if (meta) {
          const a = /ahead (\d+)/.exec(meta)
          const b = /behind (\d+)/.exec(meta)
          if (a) status.ahead = Number(a[1])
          if (b) status.behind = Number(b[1])
        }
      }
      continue
    }
    const indexCode = line[0] ?? ' '
    const worktreeCode = line[1] ?? ' '
    let filePath = line.slice(3)
    let originalPath: string | undefined
    // Renamed entries: "R  old -> new"
    if (filePath.includes(' -> ')) {
      const arrowParts = filePath.split(' -> ')
      if (arrowParts.length === 2) {
        originalPath = arrowParts[0]
        filePath = arrowParts[1] ?? filePath
      }
    }
    status.files.push({
      path: filePath,
      indexStatus: mapCode(indexCode),
      worktreeStatus: mapCode(worktreeCode),
      ...(originalPath ? { originalPath } : {}),
    })
  }
  return status
}

function parseBranches(raw: string): GitBranch[] {
  const branches: GitBranch[] = []
  const lines = raw.split('\n')
  for (const line of lines) {
    if (line.trim().length === 0) continue
    const current = line.startsWith('*')
    const rest = line.slice(2).trim()
    // "name hash [remote: ahead] subject" — take first token as name
    const name = rest.split(/\s+/)[0]
    if (!name || name === '->') continue
    const remoteMatch = /\[([^\]:]+)/.exec(rest)
    branches.push({
      name,
      current,
      ...(remoteMatch ? { remote: remoteMatch[1] } : {}),
    })
  }
  return branches
}

function parseLog(raw: string): GitCommit[] {
  const commits: GitCommit[] = []
  const lines = raw.split('\n')
  for (const line of lines) {
    if (line.length === 0) continue
    const parts = line.split('\x00')
    if (parts.length < 8) continue
    const [hash, shortHash, subject, authorName, authorEmail, authorDate, refs, parents] = parts
    if (!hash) continue
    commits.push({
      hash,
      shortHash: shortHash ?? '',
      subject: subject ?? '',
      authorName: authorName ?? '',
      authorEmail: authorEmail ?? '',
      authorDate: Number(authorDate ?? 0) * 1000,
      refs: refs ? refs.split(',').map((r) => r.trim()).filter(Boolean) : [],
      parents: parents ? parents.split(' ').filter(Boolean) : [],
    })
  }
  return commits
}

// ── show helpers for diff ────────────────────────────────────────────────────

function toGitPath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

async function gitShow(repoPath: string, ref: string): Promise<string> {
  const res = await runGitRaw(repoPath, ['show', ref])
  // Missing object (new file) → empty original instead of error.
  if (res.code !== 0) return ''
  return res.stdout
}

// ── IPC registration ──────────────────────────────────────────────────────────

export function registerGitHandlers(): void {
  ipcMain.handle('git:isRepo', async (_e, repoPath: string) => {
    try {
      const res = await runGitRaw(repoPath, ['rev-parse', '--is-inside-work-tree'])
      return { isRepo: res.code === 0 && res.stdout.trim() === 'true' }
    } catch {
      return { isRepo: false }
    }
  })

  ipcMain.handle('git:init', async (_e, repoPath: string) => {
    try {
      await runGit(repoPath, ['init'])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:clone', async (_e, url: string, targetPath: string) => {
    try {
      const parent = path.dirname(targetPath)
      await fs.promises.mkdir(parent, { recursive: true })
      await runGit(parent, ['clone', url, path.basename(targetPath)])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:status', async (_e, repoPath: string) => {
    try {
      // --untracked-files=normal (not =all) avoids recursing into large untracked
      // dirs (e.g. node_modules), which can freeze the main process.
      const raw = await runGit(repoPath, [
        '--no-optional-locks',
        'status', '--porcelain=v1', '--branch', '--untracked-files=normal',
      ])
      return { status: parseStatus(raw) }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:diff', async (_e, repoPath: string, filePath: string, mode: DiffMode) => {
    try {
      const gp = toGitPath(filePath)
      const original = await gitShow(repoPath, `HEAD:${gp}`)
      let modified: string
      if (mode === 'staged') {
        modified = await gitShow(repoPath, `:${gp}`)
      } else {
        try {
          modified = await fs.promises.readFile(filePath, 'utf-8')
        } catch {
          modified = ''
        }
      }
      return { original, modified }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:stage', async (_e, repoPath: string, filePaths: string[]) => {
    try {
      await runGit(repoPath, ['add', '--', ...filePaths.map(toGitPath)])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:unstage', async (_e, repoPath: string, filePaths: string[]) => {
    try {
      await runGit(repoPath, ['reset', 'HEAD', '--', ...filePaths.map(toGitPath)])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:discard', async (_e, repoPath: string, filePaths: string[]) => {
    try {
      // Restore tracked changes; untracked files are left to the caller.
      await runGit(repoPath, ['checkout', '--', ...filePaths.map(toGitPath)])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:commit', async (_e, repoPath: string, message: string) => {
    try {
      await runGit(repoPath, ['commit', '-m', message])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:push', async (_e, repoPath: string, remote?: string, branch?: string) => {
    try {
      const args = ['push']
      if (remote) args.push(remote)
      if (branch) args.push(branch)
      await runGit(repoPath, args)
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:pull', async (_e, repoPath: string, remote?: string, branch?: string) => {
    try {
      const args = ['pull']
      if (remote) args.push(remote)
      if (branch) args.push(branch)
      await runGit(repoPath, args)
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:fetch', async (_e, repoPath: string, remote?: string) => {
    try {
      const args = ['fetch']
      if (remote) args.push(remote)
      await runGit(repoPath, args)
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:branches', async (_e, repoPath: string) => {
    try {
      const raw = await runGit(repoPath, ['branch', '-a', '-vv'])
      return { branches: parseBranches(raw) }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:branchCreate', async (_e, repoPath: string, name: string, startPoint?: string) => {
    try {
      const args = ['branch', name]
      if (startPoint) args.push(startPoint)
      await runGit(repoPath, args)
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:branchCheckout', async (_e, repoPath: string, name: string) => {
    try {
      await runGit(repoPath, ['checkout', name])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:branchMerge', async (_e, repoPath: string, name: string) => {
    try {
      await runGit(repoPath, ['merge', name])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:branchDelete', async (_e, repoPath: string, name: string, force?: boolean) => {
    try {
      await runGit(repoPath, ['branch', force ? '-D' : '-d', name])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:log', async (_e, repoPath: string, maxCount?: number) => {
    try {
      const fmt = '%H%x00%h%x00%s%x00%an%x00%ae%x00%at%x00%D%x00%P'
      const raw = await runGit(repoPath, [
        'log', `--pretty=format:${fmt}`, `--max-count=${String(maxCount ?? 100)}`,
      ])
      return { commits: parseLog(raw) }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:remotes', async (_e, repoPath: string) => {
    try {
      const raw = await runGit(repoPath, ['remote', '-v'])
      const remotes: GitRemote[] = []
      const seen = new Set<string>()
      for (const line of raw.split('\n')) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 2 && !seen.has(parts[0]!)) {
          remotes.push({ name: parts[0]!, url: parts[1]! })
          seen.add(parts[0]!)
        }
      }
      return { remotes }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:remoteAdd', async (_e, repoPath: string, name: string, url: string) => {
    try {
      await runGit(repoPath, ['remote', 'add', name, url])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('git:remoteRemove', async (_e, repoPath: string, name: string) => {
    try {
      await runGit(repoPath, ['remote', 'remove', name])
      return { success: true }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })
}
