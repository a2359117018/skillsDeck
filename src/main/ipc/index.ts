import { ipcMain, shell } from 'electron'
import path from 'path'
import os from 'os'
import { registerSkillsIpc } from './skills.ipc'
import { registerEnvIpc } from './env.ipc'
import { registerStoreIpc } from './store.ipc'

function resolvePath(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(os.homedir(), p.slice(2))
  }
  return path.resolve(p)
}

function registerShellIpc(): void {
  ipcMain.handle('shell:open-path', async (_, rawPath: string) => {
    if (!rawPath || typeof rawPath !== 'string') return
    const resolved = resolvePath(rawPath)
    shell.showItemInFolder(resolved)
  })
}

export function registerIpcHandlers(): void {
  registerSkillsIpc()
  registerEnvIpc()
  registerStoreIpc()
  registerShellIpc()
}
