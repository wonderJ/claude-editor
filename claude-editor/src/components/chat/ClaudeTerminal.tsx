import { useRef, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface ClaudeTerminalProps {
  id: string
}

export function ClaudeTerminal({ id }: ClaudeTerminalProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const fitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const syncPtySize = useCallback((cols: number, rows: number) => {
    void window.electronAPI?.cliResize?.(cols, rows)
  }, [])

  const manualFit = useCallback(() => {
    if (fitTimeoutRef.current) clearTimeout(fitTimeoutRef.current)
    fitTimeoutRef.current = setTimeout(() => {
      const term = termRef.current
      const fitAddon = fitAddonRef.current
      if (!term || !fitAddon) return
      const dims = fitAddon.proposeDimensions()
      if (dims && dims.cols > 0 && dims.rows > 0) {
        term.resize(dims.cols, dims.rows)
        syncPtySize(dims.cols, dims.rows)
      }
      fitTimeoutRef.current = null
    }, 100)
  }, [syncPtySize])

  useEffect(() => {
    if (!containerRef.current || termRef.current) return

    const term = new Terminal({
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      cursorStyle: 'block',
      cursorBlink: true,
      theme: {
        background: '#1E1F22',
        foreground: '#DFE1E5',
        cursor: '#3574F0',
        selectionBackground: '#3574F0',
        selectionForeground: '#FFFFFF',
      },
      scrollback: 10000,
      convertEol: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    requestAnimationFrame(() => {
      manualFit()
      term.focus()
    })

    term.onData((data) => {
      void window.electronAPI?.cliWrite?.(data)
    })

    term.onResize(({ cols, rows }) => {
      syncPtySize(cols, rows)
    })

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Listen for CLI raw data
    const cleanupData = window.electronAPI?.onCliRawData?.((data: string) => {
      termRef.current?.write(data)
    })

    // Listen for CLI exit
    const cleanupExit = window.electronAPI?.onCliExit?.(() => {
      termRef.current?.writeln('\r\n\x1b[31m[CLI disconnected]\x1b[0m')
    })

    return () => {
      cleanupData?.()
      cleanupExit?.()
      term.dispose()
      termRef.current = null
      fitAddonRef.current = null
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current)
        fitTimeoutRef.current = null
      }
    }
  }, [id, manualFit, syncPtySize])

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => manualFit())
    observer.observe(el)
    return () => observer.disconnect()
  }, [manualFit])

  return <div ref={containerRef} className="h-full w-full" />
}
