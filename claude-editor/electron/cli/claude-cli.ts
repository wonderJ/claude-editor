import { spawn, execSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'

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
  private process: ChildProcessWithoutNullStreams | null = null
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
    if (this.process && !this.process.killed) {
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

      console.log('[CLI] Spawning:', cliPath, 'cwd:', os.homedir(), 'shell: true')
      this.process = spawn(cliPath, [], {
        cwd: os.homedir(),
        env: { ...process.env, CLAUDE_CODE_JSON_MODE: '1' },
        shell: true,
      })
      console.log('[CLI] Spawn returned, pid:', this.process.pid)

      this.process.stdout.on('data', (data: Buffer) => {
        const str = data.toString()
        console.log('[CLI] stdout:', str.slice(0, 200))
        this.handleStdout(str)
      })

      this.process.stderr.on('data', (data: Buffer) => {
        const err = data.toString().trim()
        console.log('[CLI] stderr:', err.slice(0, 200))
        if (err) {
          this.onErrorCallback?.(err)
        }
      })

      this.process.on('exit', (code, signal) => {
        console.log('[CLI] exit, code:', code, 'signal:', signal)
        this.setStatus('offline')
        this.process = null
        if (code !== 0 && this.restartAttempts < this.maxRestarts) {
          this.restartAttempts++
          console.log('[CLI] Auto-restart attempt', this.restartAttempts)
          setTimeout(() => this.start(), 2000)
        }
      })

      this.process.on('error', (err) => {
        console.log('[CLI] process error:', err.message)
        this.setStatus('error')
        this.onErrorCallback?.('CLI process error: ' + err.message)
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
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM')
      this.process = null
    }
    this.setStatus('offline')
  }

  restart(): boolean {
    this.stop()
    return this.start()
  }

  sendMessage(message: CliMessage): boolean {
    if (!this.process || this.process.killed) {
      return false
    }

    try {
      this.setStatus('thinking')
      const payload = JSON.stringify(message) + '\n'
      this.process.stdin.write(payload)
      return true
    } catch (err) {
      this.onErrorCallback?.('Failed to send message: ' + String(err))
      return false
    }
  }

  private handleStdout(data: string): void {
    this.buffer += data
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue

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
