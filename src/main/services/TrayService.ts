import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import { requestForceQuit } from './WindowManager'
import icon from '../../../resources/icon.png?asset'
import { APP_NAME } from '../../shared/constants'

let tray: Tray | null = null

/**
 * Create and manage the system tray icon.
 * Shows a context menu with "显示 ${APP_NAME}" and "退出".
 * @param getMainWindow - Function to retrieve the main browser window
 * @returns The created Tray instance
 */
export function createTray(getMainWindow: () => BrowserWindow | null): Tray {
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  tray.setToolTip(APP_NAME)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `显示 ${APP_NAME}`,
      click: () => {
        const win = getMainWindow()
        if (win) {
          win.show()
          win.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        requestForceQuit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    const win = getMainWindow()
    if (win) {
      win.show()
      win.focus()
    }
  })

  return tray
}

/** Destroy the tray icon (called on app quit). */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
