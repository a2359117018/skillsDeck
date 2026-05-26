import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'

type ProgressInfo = { percent: number }

/**
 * Initialize electron-updater and wire events to renderer.
 * In dev mode, checkForUpdates is a no-op.
 * @param getMainWindow - Function to retrieve the main browser window
 */
export function initAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:update-not-available')
    }
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:download-progress', progress.percent)
    }
  })

  autoUpdater.on('update-downloaded', () => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:update-downloaded')
    }
  })

  autoUpdater.on('error', (err: Error) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:error', err.message)
    }
  })
}

/** Trigger a manual check for updates. No-op in dev mode. */
export async function checkForUpdates(): Promise<void> {
  if (is.dev) return
  await autoUpdater.checkForUpdates()
}

/** Quit and install the downloaded update. */
export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
