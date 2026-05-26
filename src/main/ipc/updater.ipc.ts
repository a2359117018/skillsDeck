import { ipcMain, app } from 'electron'
import { checkForUpdates, installUpdate } from '../services/UpdateService'

export function registerUpdaterIpc(): void {
  ipcMain.handle('updater:check', async () => {
    await checkForUpdates()
  })

  ipcMain.handle('updater:install-update', () => {
    installUpdate()
  })

  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })
}
