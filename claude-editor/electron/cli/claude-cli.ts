import { execSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { spawn } = require('node-pty') as typeof import('node-pty')

export type CliStatus = 'offline' | 'online' | 'thinking' | 'error'

export interface CliMessage {
  type: 'message' | 'image'
  content: string
  images?: string[] | undefined
  id: string
  model?: string
  provider?: string
  streamingEnabled?: boolean
  thinkingMode?: string
  mentionedFiles?: string[]
}

export interface CliResponse {
  type: 'text' | 'thinking' | 'error'
  content: string
  done: boolean
  messageId: string
}

export class ClaudeCliManager {
  private pty: import('node-pty').IPty | null = null
  private status: CliStatus = 'offline'
  private onDataCallback: ((response: CliResponse) => void) | null = null
  private onStatusCallback: ((status: CliStatus) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null
  private buffer = ''
  private restartAttempts = 0
  private maxRestarts = 3

  setCallbacks(
    onData: (response: CliResponse) => void,
    onStatus: (status: CliStatus) => void,
    onError: (error: string) => void
  ): void {
    this.onDataCallback = onData
    this.onStatusCallback = onStatus
    this.onErrorCallback = onError
  }

  getStatus(): CliStatus {
    return this.status
  }

  start(): boolean {
    if (this.pty) {
      console.log('[CLI] Already running, skip start')
      return true
    }

    try {
      const cliPath = this.findCliPath()
      console.log('[CLI] findCliPath result:', cliPath)
      if (!cliPath) {
        this.setStatus('error')
        this.onErrorCallback?.('Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code')
        return false
      }

      console.log('[CLI] Spawning pty:', cliPath, 'cwd:', process.cwd())
      this.pty = spawn(cliPath, [], {
        name: 'xterm-color',
        cwd: process.cwd(),
        env: process.env,
        cols: 80,
        rows: 30,
      })
      console.log('[CLI] pty spawned, pid:', this.pty.pid)

      this.pty.onData((data: string) => {
        console.log('[CLI] pty data:', data.slice(0, 200))
        this.handleStdout(data)
      })

      this.pty.onExit(({ exitCode, signal }) => {
        console.log('[CLI] pty exit, code:', exitCode, 'signal:', signal)
        this.setStatus('offline')
        this.pty = null
        if (exitCode !== 0 && this.restartAttempts < this.maxRestarts) {
          this.restartAttempts++
          console.log('[CLI] Auto-restart attempt', this.restartAttempts)
          setTimeout(() => this.start(), 2000)
        }
      })

      this.setStatus('online')
      this.restartAttempts = 0

      return true
    } catch (err) {
      console.log('[CLI] start exception:', err)
      this.setStatus('error')
      this.onErrorCallback?.('Failed to start CLI: ' + String(err))
      return false
    }
  }

  stop(): void {
    if (this.pty) {
      this.pty.kill()
      this.pty = null
    }
    this.setStatus('offline')
  }

  restart(): boolean {
    this.stop()
    return this.start()
  }

  sendMessage(message: CliMessage): boolean {
    if (!this.pty) {
      return false
    }

    try {
      this.setStatus('thinking')
      // In interactive mode, send message followed by Enter
      const payload = message.content + '\r'
      this.pty.write(payload)
      return true
    } catch (err) {
      this.onErrorCallback?.('Failed to send message: ' + String(err))
      return false
    }
  }

  private handleStdout(data: string): void {
    // For interactive mode, we get raw terminal output with ANSI codes
    // Strip ANSI codes for parsing
    const clean = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    console.log('[CLI] clean data:', clean.slice(0, 200))

    this.buffer += clean
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue

      // Try JSON first (if claude outputs JSON)
      try {
        const response = JSON.parse(line) as CliResponse
        if (response.type === 'thinking') {
          this.setStatus('thinking')
        } else if (response.done) {
          this.setStatus('online')
        }
        this.onDataCallback?.(response)
      } catch {
        // Not JSON, treat as plain text stream
        this.onDataCallback?.({
          type: 'text',
          content: line,
          done: false,
          messageId: 'stream-' + String(Date.now()),
        })
      }
    }
  }

  private setStatus(status: CliStatus): void {
    this.status = status
    this.onStatusCallback?.(status)
  }

  private findCliPath(): string | null {
    const candidates = [
      'claude',
      'claude-code',
      path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
      path.join(os.homedir(), '.npm-global', 'bin', 'claude-code'),
      '/usr/local/bin/claude',
      '/usr/local/bin/claude-code',
      '/usr/bin/claude',
      '/usr/bin/claude-code',
    ]

    for (const candidate of candidates) {
      try {
        const result = execSync(
          process.platform === 'win32' ? `where ${candidate}` : `which ${candidate}`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'], shell: true }
        )
        const firstLine = result.trim().split('\n')[0]?.trim()
        if (firstLine) {
          return firstLine
        }
      } catch {
        // Command not found, try next
      }
    }

    return null
  }
}

export const cliManager = new ClaudeCliManager()
