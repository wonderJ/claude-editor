import { useState } from 'react'
import type { JSX } from 'react'

function App(): JSX.Element {
  const [count, setCount] = useState(0)

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-neutral-900 text-white">
      <h1 className="text-3xl font-bold">Claude Editor</h1>
      <p className="mt-4 text-neutral-400">Electron + React + TypeScript + Tailwind CSS</p>
      <button
        type="button"
        className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        onClick={() => {
          setCount((c) => c + 1)
        }}
      >
        Count: {count}
      </button>
    </div>
  )
}

export default App
