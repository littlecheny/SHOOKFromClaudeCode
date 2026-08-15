import { Menu, Tray, app, nativeImage, type BrowserWindow } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPanelSize } from './window.js'

let tray: Tray | null = null

function resolveIconPath(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  // dev/preview 下产物在 gui/out/main，资源在 gui/resources
  return join(here, '../../resources/trayIconTemplate.png')
}

export function createTray(win: BrowserWindow): Tray {
  const icon = nativeImage.createFromPath(resolveIconPath())
  icon.setTemplateImage(true)
  tray = new Tray(icon)
  tray.setTitle('shook')
  tray.setToolTip('shook')

  tray.on('click', () => toggleWindow(win))
  tray.on('right-click', () => {
    tray?.popUpContextMenu(
      Menu.buildFromTemplate([
        { label: '显示 shook', click: () => showWindowUnderTray(win) },
        { type: 'separator' },
        { label: '退出', click: () => app.quit() },
      ]),
    )
  })
  return tray
}

export function toggleWindow(win: BrowserWindow): void {
  if (win.isVisible()) {
    win.hide()
  } else {
    showWindowUnderTray(win)
  }
}

export function showWindowUnderTray(win: BrowserWindow): void {
  if (!tray) return
  const bounds = tray.getBounds()
  const { width } = getPanelSize()
  win.setPosition(Math.round(bounds.x + bounds.width / 2 - width / 2), bounds.y + bounds.height + 4)
  win.show()
  win.focus()
}

export function setTrayBusy(busy: boolean): void {
  tray?.setTitle(busy ? 'shook ●' : 'shook')
}
