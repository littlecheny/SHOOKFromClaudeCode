import { BrowserWindow } from 'electron'
import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const WINDOW_WIDTH = 380
const WINDOW_HEIGHT = 560

export function createPanelWindow(): BrowserWindow {
  const here = dirname(fileURLToPath(import.meta.url))
  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    backgroundColor: '#F7F6F3',
    webPreferences: {
      preload: join(here, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // dev 模式（renderer 走 vite server）保持常驻，方便调试；
  // 生产模式才启用失焦自动隐藏。
  const hideOnBlur = !process.env.ELECTRON_RENDERER_URL && !process.env.SHOOK_NO_HIDE
  win.on('blur', () => {
    if (hideOnBlur && !win.webContents.isDevToolsOpened()) {
      win.hide()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(here, '../renderer/index.html'))
  }
  return win
}

export function getPanelSize(): { width: number; height: number } {
  return { width: WINDOW_WIDTH, height: WINDOW_HEIGHT }
}
