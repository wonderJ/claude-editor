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
  const onDataRef = useRef(onData)
  onDataRef.current = onData
  const selectionRef = useRef<string>('')

  const syncPtySize = useCallback((cols: number, rows: number) => {
    void window.electronAPI?.terminalResize(id, cols, rows)
  }, [id])

  const manualFit = useCallback(() => {
    const term = termRef.current
    const fitAddon = fitAddonRef.current
    if (!term || !fitAddon) return

    const dims = fitAddon.proposeDimensions()
    if (dims && dims.cols > 0 && dims.rows > 0) {
      term.resize(dims.cols, dims.rows)
      syncPtySize(dims.cols, dims.rows)
    }
  }, [syncPtySize])

  const initTerminal = useCallback(() => {
    if (!containerRef.current || termRef.current) return

    let isTypingCommand = false
    let lastDataTime = 0

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
      rightClickSelectsWord: false,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(containerRef.current)
    requestAnimationFrame(() => {
      manualFit()
      term.focus()
    })

    document.fonts.ready.then(() => {
      manualFit()
    })

    term.onData((data) => {
      onDataRef.current(id, data)
    })

    // Save selection on change, auto-copy to clipboard
    term.onSelectionChange(() => {
      const selection = term.getSelection()
      selectionRef.current = selection
      if (selection && selection.length > 0) {
        void navigator.clipboard.writeText(selection).catch(() => {
          // Ignore clipboard errors
        })
      }
    })

    termRef.current = term
    fitAddonRef.current = fitAddon
  }, [id, settings, manualFit])

  useEffect(() => {
    initTerminal()

    const handleResize = () => {
      manualFit()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      termRef.current?.dispose()
      termRef.current = null
      fitAddonRef.current = null
    }
  }, [initTerminal, manualFit])

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
    return () => { cleanup?.() }
  }, [id])

  // Listen for terminal exit
  useEffect(() => {
    const cleanup = window.electronAPI?.onTerminalExit((termId) => {
      if (termId === id) {
        termRef.current?.dispose()
        termRef.current = null
      }
    })
    return () => { cleanup?.() }
  }, [id])

  // Listen for resize events from parent
  useEffect(() => {
    const handleResize = () => {
      manualFit()
    }
    window.addEventListener('terminal:resize', handleResize)
    return () => { window.removeEventListener('terminal:resize', handleResize) }
  }, [manualFit])

  // ResizeObserver for container size changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      manualFit()
    })
    observer.observe(el)
    return () => { observer.disconnect() }
  }, [manualFit])

  // Right-click to paste directly
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleContextMenu = async (e: MouseEvent) => {
      e.preventDefault()
      const term = termRef.current
      if (!term) return
      try {
        const text = await navigator.clipboard.readText()
        if (text) {
          term.paste(text)
        }
      } catch {
        // Ignore clipboard errors
      }
    }

    el.addEventListener('contextmenu', handleContextMenu)
    return () => {
      el.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  // Mouse down: focus terminal before selection starts
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleMouseDown = () => {
      termRef.current?.focus()
    }

    el.addEventListener('mousedown', handleMouseDown)
    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Expose resize and focus methods for parent
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    ;(el as unknown as Record<string, unknown>).focus = () => {
      termRef.current?.focus()
    }
    ;(el as unknown as Record<string, unknown>).resize = () => {
      manualFit()
      const dims = fitAddonRef.current?.proposeDimensions()
      return dims ?? { cols: 80, rows: 24 }
    }
  }, [manualFit])

  return <div ref={containerRef} className="h-full w-full" />
}
