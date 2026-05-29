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
 * 注册技能删除相关的 IPC handler。
 *
 * 包括：删除单个技能、批量删除后台任务。
 */
export function registerSkillsRemoveIpc(): void {
  ipcMain.handle(
    'skills:remove',
    async (_, opts: { packageRef: string; agent?: string; global?: boolean }) => {
      try {
        return {
          ok: true,
          data: await skillsService.remove(opts.packageRef, opts.agent, opts.global)
        }
      } catch (e) {
        return { ok: false, error: serializeError(e) }
      }
    }
  )

  ipcMain.handle(
    'skills:remove-batch-background',
    async (_, opts: { packageRefs: string[]; agentFlag?: string; global?: boolean }) => {
      try {
        if (!Array.isArray(opts.packageRefs) || opts.packageRefs.length === 0) {
          return { taskId: '', error: '未选择要删除的技能' }
        }
        const taskId = await backgroundTaskService.startTask('skill-remove-batch', opts)
        return { taskId }
      } catch (e) {
        return { taskId: '', error: e instanceof Error ? e.message : String(e) }
      }
    }
  )
}
