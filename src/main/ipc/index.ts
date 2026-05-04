import { ipcMain, shell } from 'electron'
import { registerSkillsIpc } from './skills.ipc'
import { registerEnvIpc } from './env.ipc'
import { registerStoreIpc } from './store.ipc'

function registerShellIpc(): void {
  ipcMain.handle('shell:open-path', async (_, path: string) => {
    if (!path || typeof path !== 'string') return
    shell.showItemInFolder(path)
  })
}

export function registerIpcHandlers(): void {
  registerSkillsIpc()
  registerEnvIpc()
  registerStoreIpc()
  registerShellIpc()
}
