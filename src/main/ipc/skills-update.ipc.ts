import { ipcMain } from 'electron'
import type { IpcError } from '../../shared/types'
import { skillsService } from '../services/SkillsService'
import { backgroundTaskService } from '../services/BackgroundTaskService'
import { CommandError } from '../services/CommandRunner'

function serializeError(e: unknown): IpcError {
  if (e instanceof CommandError) {
    return e.toJSON()
  }
  return {
    message: e instanceof Error ? e.message : String(e)
  }
}

/**
 * 注册技能更新相关的 IPC handler。
 *
 * 包括：更新单个技能、更新全部技能、后台更新任务。
 */
export function registerSkillsUpdateIpc(): void {
  ipcMain.handle('skills:update', async (_, opts: { packageRef: string; global?: boolean }) => {
    try {
      return { ok: true, data: await skillsService.update(opts.packageRef, opts.global) }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle('skills:update-all', async (_, opts?: { global?: boolean }) => {
    try {
      return { ok: true, data: await skillsService.updateAll(opts?.global) }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle(
    'skills:update-background',
    async (_, opts: { packageRef: string; global?: boolean }) => {
      try {
        const taskId = await backgroundTaskService.startTask('skill-update', opts)
        return { taskId }
      } catch (e) {
        return { taskId: '', error: e instanceof Error ? e.message : String(e) }
      }
    }
  )

  ipcMain.handle('skills:update-all-background', async (_, opts?: { global?: boolean }) => {
    try {
      const taskId = await backgroundTaskService.startTask('skill-update-all', opts)
      return { taskId }
    } catch (e) {
      return { taskId: '', error: e instanceof Error ? e.message : String(e) }
    }
  })
}
