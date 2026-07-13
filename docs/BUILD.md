# Build Guide

## Environment

| Component | Version | Path |
|-----------|---------|------|
| OS | Windows 10 Pro 10.0.19045 | - |
| Node.js | 22.22.3 | - |
| npm | 10.x | - |
| Electron | 35.7.5 | - |
| VS Build Tools | 2022 14.44.35207 | `D:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools` |
| MSVC | v143 14.44.35207 | `VC\Tools\MSVC\14.44.35207` |
| cl.exe (x64) | 14.44.35207 | `VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64\cl.exe` |
| Git | 2.49.0.windows.1 | - |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Electron 35 + React 19 + TypeScript 6 |
| Bundler | Vite 8 (rolldown) |
| Styling | Tailwind CSS 4 |
| Editor | Monaco Editor (@monaco-editor/react) |
| Terminal | xterm.js + @xterm/addon-fit + node-pty |
| State | Zustand |
| IPC | contextBridge |

## Prerequisites

- Node.js 22+ (LTS recommended)
- npm 10+ (or pnpm 9+)
- Windows: Visual Studio Build Tools 2022 with:
  - **Desktop development with C++** workload
  - **MSVC v143 - VS 2022 C++ x64/x86 build tools**
  - **MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libraries** (required for node-pty)
  - **Windows 11 SDK** (or Windows 10 SDK)
- macOS/Linux: Xcode Command Line Tools / build-essential

## Install Dependencies

```bash
npm install
```

> Windows users: If you encounter symlink issues with pnpm, use `npm install` instead.

## Native Module Setup (node-pty)

`node-pty` requires native compilation for Electron. After installing VS Build Tools:

```bash
# Compile for current Electron version
npx electron-rebuild

# Or compile for specific Electron version
npx electron-rebuild -f -w node-pty
```

### node-pty Build Fixes Applied

The following manual fixes were applied to `node_modules/node-pty` to resolve build issues:

1. **`winpty.gyp`**: Replaced `GetCommitHash.bat` and `UpdateGenVersion.bat` calls with static values and direct `gen` include path, because `gyp` executes scripts from wrong working directory.
2. **`binding.gyp`**: Kept `SpectreMitigation: 'Spectre'` (requires Spectre-mitigated libs installed).

**Note**: These fixes are in `node_modules/` and will be lost on `npm install`. Consider using `patch-package` to persist them.

## Development Mode

```bash
npm run dev
```

- Starts Vite dev server on `http://localhost:5173`
- Electron window opens automatically
- Hot reload enabled for renderer and main process

## Production Build

```bash
npm run build
```

This runs three steps:
1. `tsc -b` — TypeScript compilation check
2. `vite build` — Bundle renderer + main + preload
3. `electron-builder` — Package into distributable app

### Output Directories

| Directory | Contents |
|-----------|----------|
| `dist/` | Renderer bundle (HTML, CSS, JS, assets) |
| `dist-electron/` | Main process + preload scripts |
| `release/` | Packaged app (after `electron-builder` success) |

### Vite Config Notes

`vite.config.ts` marks `node-pty` as `external` in the main process build to prevent bundling its CJS code into ESM output:

```ts
electron([
  {
    entry: 'electron/main.ts',
    vite: {
      build: {
        rollupOptions: {
          external: ['node-pty'],
        },
      },
    },
  },
])
```

**Note:** `vite-plugin-electron` with Vite 8 / rolldown may ignore `rollupOptions.external`. Use `createRequire` in `main.ts` to force runtime loading:

```ts
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { spawn } = require('node-pty') as typeof import('node-pty')
```

This ensures `node-pty` is loaded at runtime from `node_modules/`, not bundled.

## Packaging

### Unpacked (for testing)

```bash
npx electron-builder --dir
```

Output: `release/win-unpacked/Claude Editor.exe`

### Installer (NSIS)

```bash
npx electron-builder --win nsis
```

Output: `release/Claude Editor Setup.exe`

> NSIS download may timeout on slow networks. Retry or use unpacked version.

## Known Build Issues

### Windows: `node-pty` native compilation

**Error:** `Could not find any Visual Studio installation to use`

**Fix:** Install Visual Studio Build Tools 2022 with "Desktop development with C++" workload, then:

```bash
npx electron-rebuild
```

**Error:** `MSB8040: 此项目需要缓解了 Spectre 漏洞的库`

**Fix:** Open VS Installer → Modify Build Tools → Individual Components → check **"MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libraries"**

### Electron binary download timeout

**Error:** `connect ETIMEDOUT` during install

**Fix:** Set proxy or skip download then manual install:

```bash
# Skip during npm install
set ELECTRON_SKIP_BINARY_DOWNLOAD=1
npm install

# Manual download after
node node_modules/electron/install.js
```

### `electron-builder` EPERM on Windows

**Error:** `EPERM: operation not permitted, rename 'release\win-unpacked.tmp'`

**Fix:** Kill all Electron processes before building:

```powershell
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
```

### `node-pty` `require` error in bundled app

**Error:** `Calling \`require\` for "events" in an environment that doesn't expose the \`require\` function`

**Fix:** Add `node-pty` to `external` in `vite.config.ts` (see Vite Config Notes above).

## Scripts Summary

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Development mode |
| `build` | `tsc -b && vite build && electron-builder` | Full production build |
| `lint` | `eslint .` | Lint check |
| `preview` | `vite preview` | Preview production build |

## Git Workflow

| Type | Prefix |
|------|--------|
| New feature | `feat:` |
| Bug fix | `fix:` |
| Refactor | `refactor:` |
| Documentation | `docs:` |

## Project Structure

```
claude-editor/
├── electron/           # Main process
│   ├── main.ts         # Entry + IPC handlers
│   ├── preload.ts      # contextBridge API
│   └── cli/
│       └── claude-cli.ts  # CLI process manager
├── src/
│   ├── components/     # React components
│   │   ├── layout/     # MainLayout, Sidebar, etc.
│   │   ├── file-tree/  # FileTree, FileTreeNode
│   │   ├── terminal/   # XTerm, TerminalPanel
│   │   ├── chat/       # ChatPanel, ChatInput, ImageUploader
│   │   └── editor/     # MonacoEditor
│   └── stores/         # Zustand stores
│       ├── layoutStore.ts
│       ├── fileStore.ts
│       ├── terminalStore.ts
│       ├── chatStore.ts
│       └── cliStore.ts
├── dist/               # Renderer bundle (vite build)
├── dist-electron/      # Main + preload bundle (vite build)
├── release/            # Packaged app (electron-builder)
└── docs/
    └── BUILD.md        # This file
```
