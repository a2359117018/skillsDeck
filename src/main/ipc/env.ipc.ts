import { ipcMain, BrowserWindow } from 'electron'
import { checkAll, downloadNode, extractAndRegisterNode } from '../services/EnvService'
import { setEnvStatus } from '../services/StoreService'
import { closeEnvWindow, createSettingsWindow } from '../services/WindowManager'

export function registerEnvIpc(): void {
  ipcMain.handle('env:check', async () => {
    const status = await checkAll()
    setEnvStatus(status)
    return status
  })

  ipcMain.handle('env:install-node', async (event) => {
    try {
      const archivePath = await downloadNode((percent) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win?.webContents.send('env:download-progress', percent)
      })
      await extractAndRegisterNode(archivePath)
      const status = await checkAll()
      setEnvStatus(status)
      if (status.nodeInstalled && status.npxInstalled && status.skillsInstalled) {
        closeEnvWindow()
      }
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('window:open-settings', () => {
    createSettingsWindow()
  })
}
