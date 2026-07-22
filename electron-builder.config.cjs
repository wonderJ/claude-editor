/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.claude.editor',
  productName: 'Claude Editor',
  directories: {
    output: 'D:/release',
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
    '!node_modules/**/*',
    '!release/**/*',
    '!.claude/**/*',
    '!dist/win-unpacked.tmp',
    'node_modules/node-pty/**/*',
  ],
  asarUnpack: [
    'node_modules/node-pty/**/*.node',
  ],
  mac: {
    target: 'dmg',
  },
  win: {
    target: 'portable',
    signExecutable: false,
  },
  linux: {
    target: 'AppImage',
  },
  npmRebuild: false,
  nodeGypRebuild: false,
}
