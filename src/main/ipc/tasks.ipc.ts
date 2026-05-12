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
}
