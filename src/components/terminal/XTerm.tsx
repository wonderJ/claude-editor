import { useRef, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { TerminalSettings } from '../../stores/terminalStore'

interface XTermProps {
  id: string
  settings: TerminalSettings
  onData: (id: string, data: string) => void
}

export function XTerm({ id, settings, onData }: XTermProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  const initTerminal = useCallback(() => {
    if (!containerRef.current || termRef.current) return

    const term = new Terminal({
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      cursorStyle: settings.cursorStyle,
      cursorBlink: settings.cursorBlink,
      theme: {
        background: '#1E1F22',
        foreground: '#DFE1E5',
        cursor: '#3574F0',
        selectionBackground: '#3574F0',
        selectionForeground: '#FFFFFF',
        black: '#1E1F22',
        red: '#E53E3E',
        green: '#36B37E',
        yellow: '#FFC107',
        blue: '#3574F0',
        magenta: '#9C27B0',
        cyan: '#00BCD4',
        white: '#DFE1E5',
        brightBlack: '#4E5254',
        brightRed: '#FF6B6B',
        brightGreen: '#4CAF50',
        brightYellow: '#FFD54F',
        brightBlue: '#4682F5',
        brightMagenta: '#CE93D8',
        brightCyan: '#80DEEA',
        brightWhite: '#FFFFFF',
      },
      scrollback: 10000,
      convertEol: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(containerRef.current)
    fitAddon.fit()

    term.onData((data) => {
      onData(id, data)
    })

    termRef.current = term
    fitAddonRef.current = fitAddon
  }, [id, settings, onData])

  useEffect(() => {
    initTerminal()

    const handleResize = () => {
      fitAddonRef.current?.fit()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      termRef.current?.dispose()
      termRef.current = null
      fitAddonRef.current = null
    }
  }, [initTerminal])

  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.options.fontSize = settings.fontSize
    term.options.fontFamily = settings.fontFamily
    term.options.cursorStyle = settings.cursorStyle
    term.options.cursorBlink = settings.cursorBlink
  }, [settings])

  // Listen for terminal data from main process
  useEffect(() => {
    const cleanup = window.electronAPI?.onTerminalData((termId, data) => {
      if (termId === id) {
        termRef.current?.write(data)
      }
    })
    return cleanup
  }, [id])

  // Listen for terminal exit
  useEffect(() => {
    const cleanup = window.electronAPI?.onTerminalExit((termId) => {
      if (termId === id) {
        termRef.current?.dispose()
        termRef.current = null
      }
    })
    return cleanup
  }, [id])

  // Expose resize method for parent
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    ;(el as unknown as Record<string, unknown>).resize = () => {
      fitAddonRef.current?.fit()
      const dims = fitAddonRef.current?.proposeDimensions()
      return dims ?? { cols: 80, rows: 24 }
    }
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
}
