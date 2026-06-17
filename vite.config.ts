import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart: (options) => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (options.startup) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            options.startup()
            return
          }
          options.reload()
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart: () => {},
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  clearScreen: false,
})
