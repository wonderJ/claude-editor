import type { JSX } from 'react'
import { useCallback, useEffect } from 'react'
import { useLayoutStore } from '../../stores/layoutStore'
import { Sidebar } from './Sidebar'
import { EditorArea } from './EditorArea'
import { TerminalPanel } from './TerminalPanel'
import { ChatPanel } from '../chat/ChatPanel'
import { StatusBar } from './StatusBar'
import { ResizableSplitter } from './ResizableSplitter'

export function MainLayout(): JSX.Element {
  const {
    sidebarVisible,
    sidebarWidth,
    sidebarCollapsed,
    setSidebarWidth,
    setSidebarCollapsed,
    terminalVisible,
    terminalHeight,
    terminalCollapsed,
    setTerminalHeight,
    setTerminalCollapsed,
    chatVisible,
    chatWidth,
    setChatWidth,
    toggleChat,
  } = useLayoutStore()

  // Responsive: <1024px collapse sidebar and terminal
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 1024) {
        setSidebarCollapsed(true)
        setTerminalCollapsed(true)
      } else {
        setSidebarCollapsed(false)
        setTerminalCollapsed(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [setSidebarCollapsed, setTerminalCollapsed])

  const handleSidebarResize = useCallback(
    (delta: number) => {
      const newWidth = sidebarWidth + delta
      if (newWidth < 100) {
        setSidebarCollapsed(true)
      } else {
        setSidebarWidth(Math.max(200, Math.min(400, newWidth)))
      }
    },
    [sidebarWidth, setSidebarWidth, setSidebarCollapsed]
  )

  const handleTerminalResize = useCallback(
    (delta: number) => {
      const newHeight = terminalHeight - delta
      if (newHeight < 60) {
        setTerminalCollapsed(true)
      } else {
        setTerminalHeight(Math.max(150, newHeight))
      }
    },
    [terminalHeight, setTerminalHeight, setTerminalCollapsed]
  )

  const handleChatResize = useCallback(
    (delta: number) => {
      const newWidth = chatWidth - delta
      setChatWidth(Math.max(300, Math.min(500, newWidth)))
    },
    [chatWidth, setChatWidth]
  )

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#1E1F22]">
      {/* Title bar placeholder */}
      <div className="flex h-[42px] shrink-0 items-center border-b border-[#4E5254] bg-[#2B2D30] px-3">
        <div className="flex items-center gap-4 text-xs text-[#DFE1E5]">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>AI</span>
          <span>Terminal</span>
          <span>Help</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-[#8C8C8C] hover:bg-[#3C3F41] hover:text-[#DFE1E5]"
            onClick={() => {
              toggleChat()
            }}
          >
            🤖
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Sidebar splitter */}
        {sidebarVisible && !sidebarCollapsed && (
          <ResizableSplitter
            direction="horizontal"
            onResize={handleSidebarResize}
          />
        )}

        {/* Center area: Editor + Terminal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            {/* Editor */}
            <EditorArea />

            {/* Chat splitter */}
            {chatVisible && (
              <ResizableSplitter
                direction="horizontal"
                onResize={handleChatResize}
              />
            )}

            {/* Chat panel */}
            <ChatPanel />
          </div>

          {/* Terminal splitter */}
          {terminalVisible && !terminalCollapsed && (
            <ResizableSplitter
              direction="vertical"
              onResize={handleTerminalResize}
            />
          )}

          {/* Terminal */}
          <TerminalPanel />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
