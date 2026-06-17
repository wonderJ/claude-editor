import { spawn, execSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'

export type CliStatus = 'offline' | 'online' | 'thinking' | 'error'

export interface CliMessage {
  type: 'message' | 'image'
  content: string
  images?: string[] | undefined
  id: string
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
      return true
    }

    try {
      // Determine CLI path - look for claude-code CLI in common locations
      const cliPath = this.findCliPath()
      if (!cliPath) {
        this.setStatus('error')
        this.onErrorCallback?.('Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code')
        return false
      }

      this.process = spawn(cliPath, ['--json'], {
        cwd: os.homedir(),
        env: { ...process.env, CLAUDE_CODE_JSON_MODE: '1' },
        shell: false,
      })

      this.process.stdout.on('data', (data: Buffer) => {
        this.handleStdout(data.toString())
      })

      this.process.stderr.on('data', (data: Buffer) => {
        const err = data.toString().trim()
        if (err) {
          this.onErrorCallback?.(err)
        }
      })

      this.process.on('exit', (code) => {
        this.setStatus('offline')
        this.process = null
        if (code !== 0 && this.restartAttempts < this.maxRestarts) {
          this.restartAttempts++
          setTimeout(() => this.start(), 2000)
        }
      })

      this.process.on('error', (err) => {
        this.setStatus('error')
        this.onErrorCallback?.('CLI process error: ' + err.message)
      })

      this.setStatus('online')
      this.restartAttempts = 0
      return true
    } catch (err) {
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
      this.onErrorCallback?.('CLI not running')
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
        // Simple check if command exists in PATH
        const result = execSync(
          process.platform === 'win32' ? `where ${candidate}` : `which ${candidate}`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        )
        if (result.trim()) {
          return candidate
        }
      } catch {
        // Command not found, try next
      }
    }

    return null
  }
}

export const cliManager = new ClaudeCliManager()
