import { ipcMain } from 'electron'
import { backgroundTaskService } from '../services/BackgroundTaskService'
import type { BackgroundTask } from '../../shared/types'
import { toIpcError } from '../../shared/types'

export function registerTasksIpc(): void {
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
    const task = backgroundTaskService.getStatus(taskId)
    if (task && !['update-skills', 'install-node', 'install-skills'].includes(task.type)) {
      return { ok: false, error: '该任务类型不支持重试' }
    }
    try {
      backgroundTaskService.retryBuiltIn(taskId)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: toIpcError(error).message }
    }
  })
}
