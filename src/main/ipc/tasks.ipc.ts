import { ipcMain } from 'electron'
import { backgroundTaskService } from '../services/BackgroundTaskService'
import type { BackgroundTask } from '../../shared/types'
import { toIpcError } from '../../shared/utils/error'

export function registerTasksIpc(getMainWindow: () => Electron.BrowserWindow | null): void {
  backgroundTaskService.on('update', (task: BackgroundTask) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('tasks:update', task)
    }
  })
  ipcMain.handle('tasks:start', async (_, { type }: { type: BackgroundTask['type'] }) => {
    try {
      const taskId = await backgroundTaskService.startBuiltin(type)
      return { taskId }
    } catch (error) {
      return { taskId: '', error: toIpcError(error).message }
    }
  })

  ipcMain.handle('tasks:cancel', (_, taskId: string) => {
    backgroundTaskService.cancel(taskId)
    return undefined
  })

  ipcMain.handle('tasks:get-all', () => {
    return backgroundTaskService.getAll()
  })

  ipcMain.handle('tasks:retry', async (_, { taskId }: { taskId: string }) => {
    try {
      backgroundTaskService.retryTask(taskId)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: toIpcError(error).message }
    }
  })

  ipcMain.handle('tasks:retry-skill-update', async (_, { taskId }: { taskId: string }) => {
    const task = backgroundTaskService.getStatus(taskId)
    if (!task || task.status !== 'error') {
      return { ok: false, error: 'Task not found or not in error state' }
    }

    if (task.type !== 'skill-update-all') {
      return { ok: false, error: '该任务类型不支持重试' }
    }

    try {
      backgroundTaskService.retryTask(taskId)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: toIpcError(error).message }
    }
  })
}
