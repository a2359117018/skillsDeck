import { ipcMain } from 'electron'
import { getSettings, setSettings } from '../services/StoreService'

export function registerStoreIpc(): void {
  ipcMain.handle('store:get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('store:set-settings', (_, partial) => {
    setSettings(partial)
  })
}
