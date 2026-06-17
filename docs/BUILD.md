# Build Guide

## Prerequisites

- Node.js 22+ (LTS recommended)
- npm 10+ (or pnpm 9+)
- Windows: Visual Studio Build Tools 2022 (for native modules like `node-pty`)
- macOS/Linux: Xcode Command Line Tools / build-essential

## Install Dependencies

```bash
npm install
```

> Windows users: If you encounter symlink issues with pnpm, use `npm install` instead.

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

## Known Build Issues

### Windows: `node-pty` native compilation

**Error:** `Could not find any Visual Studio installation to use`

**Fix:** Install Visual Studio Build Tools 2022 with "Desktop development with C++" workload, then rebuild:

```bash
npm rebuild node-pty
npm run build
```

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

## Scripts Summary

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Development mode |
| `build` | `tsc -b && vite build && electron-builder` | Full production build |
| `lint` | `eslint .` | Lint check |
| `preview` | `vite preview` | Preview production build |
