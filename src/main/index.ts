import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow, createEnvWindow } from './services/WindowManager'
import { checkAll } from './services/EnvService'
import { registerIpcHandlers } from './ipc'
import { getSettings, setEnvStatus } from './services/StoreService'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.npx-skills-ui')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createMainWindow()

  const settings = getSettings()
  if (settings.autoCheckEnv) {
    checkAll().then((status) => {
      setEnvStatus(status)
      if (!status.nodeInstalled || !status.npxInstalled || !status.skillsInstalled) {
        createEnvWindow()
      }
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
