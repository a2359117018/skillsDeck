import { app, BrowserWindow, ipcMain, net } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { createMainWindow, getMainWindow } from './services/WindowManager'
import { checkAll } from './services/EnvService'
import { registerIpcHandlers } from './ipc'
import { getSettings, setSettings, setEnvStatus, migrateProxySettings } from './services/StoreService'

/** 定期向所有窗口广播网络状态 */
function broadcastNetworkStatus(): void {
  const online = net.isOnline()
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('network:status', online)
    }
  }
}

/** Remove leftover skills-* temp directories from previous sessions. */
function cleanupOrphanedTempDirs(): void {
  const tmpDir = os.tmpdir()
  try {
    const entries = fs.readdirSync(tmpDir, { withFileTypes: true })
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        (entry.name.startsWith('skills-github-') || entry.name.startsWith('skills-archive-'))
      ) {
        fs.rmSync(path.join(tmpDir, entry.name), { recursive: true, force: true })
      }
    }
  } catch {
    // ignore cleanup errors
  }
}

app.whenReady().then(() => {
  cleanupOrphanedTempDirs()
  migrateProxySettings()
  electronApp.setAppUserModelId('com.skilldeck.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()

  ipcMain.handle(
    'close:action',
    (_, opts: { action: 'tray' | 'quit'; remember: boolean }) => {
      if (opts.remember) {
        setSettings({ closeAction: opts.action })
      }
      const win = getMainWindow()
      if (opts.action === 'tray') {
        win?.hide()
      } else {
        win?.destroy()
      }
    }
  )

  createMainWindow()

  broadcastNetworkStatus()
  setInterval(broadcastNetworkStatus, 30_000)

  const settings = getSettings()
  if (settings.autoCheckEnv) {
    checkAll().then((status) => {
      setEnvStatus(status)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
