import { ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { registerSkillsIpc } from './skills.ipc'
import { registerEnvIpc } from './env.ipc'
import { registerStoreIpc } from './store.ipc'
import { registerAgentsIpc } from './agents.ipc'
import { registerTasksIpc } from './tasks.ipc'
import { registerUpdaterIpc } from './updater.ipc'
import { getMainWindow } from '../services/WindowManager'
import { expandTildePath } from '../utils/path'

function registerShellIpc(): void {
  ipcMain.handle(
    'shell:open-path',
    async (_, rawPath: string): Promise<{ success: boolean; error?: string }> => {
      if (!rawPath || typeof rawPath !== 'string') {
        return { success: false, error: '无效路径' }
      }
      const resolved = expandTildePath(rawPath)
      if (!fs.existsSync(resolved)) {
        const parent = path.dirname(resolved)
        if (fs.existsSync(parent)) {
          await shell.openPath(parent)
          return { success: true }
        }
        return { success: false, error: `路径不存在: ${rawPath}` }
      }
      const stat = fs.statSync(resolved)
      if (stat.isDirectory()) {
        await shell.openPath(resolved)
      } else {
        shell.showItemInFolder(resolved)
      }
      return { success: true }
    }
  )
}

export function registerIpcHandlers(): void {
  registerSkillsIpc(getMainWindow)
  registerEnvIpc()
  registerStoreIpc()
  registerShellIpc()
  registerAgentsIpc()
  registerTasksIpc(getMainWindow)
  registerUpdaterIpc()
}
