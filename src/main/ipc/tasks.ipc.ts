import { ipcMain } from 'electron'
import { backgroundTaskService } from '../services/BackgroundTaskService'
import type { BackgroundTask } from '../../shared/types'

export function registerTasksIpc(): void {
  ipcMain.handle('tasks:start', async (_, { type }: { type: BackgroundTask['type'] }) => {
    try {
      const taskId = await backgroundTaskService.startBuiltin(type)
      return { taskId }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { taskId: '', error: message }
    }
  })

  ipcMain.handle('tasks:cancel', (_, taskId: string) => {
    backgroundTaskService.cancel(taskId)
    return undefined
  })

  ipcMain.handle('tasks:get-all', () => {
    return backgroundTaskService.getAll()
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
      backgroundTaskService.retryBuiltIn(taskId)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })
}
