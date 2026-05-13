import { ipcMain } from 'electron'
import type { CommandErrorInfo } from '../../shared/types'
import { skillsService } from '../services/SkillsService'
import { agentScanner } from '../services/AgentScanner'
import { CommandError } from '../services/CommandRunner'
import { searchSkillsApi } from '../api/skills'
import { backgroundTaskService } from '../services/BackgroundTaskService'

function serializeError(e: unknown): CommandErrorInfo {
  if (e instanceof CommandError) {
    return e.toJSON()
  }
  return {
    code: 'UNKNOWN' as const,
    command: '',
    stderr: '',
    exitCode: null,
    message: e instanceof Error ? e.message : String(e)
  }
}

export function registerSkillsIpc(getMainWindow: () => Electron.BrowserWindow | null): void {
  ipcMain.handle('skills:search', async (_, keyword: string) => {
    try {
      return { ok: true, data: await searchSkillsApi(keyword) }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle('skills:list', async () => {
    try {
      return { ok: true, data: await agentScanner.scanInstalled() }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle(
    'skills:install',
    async (_, opts: { source: string; agents: string[]; global?: boolean }) => {
      try {
        return {
          ok: true,
          data: await skillsService.install(opts.source, opts.agents, opts.global)
        }
      } catch (e) {
        return { ok: false, error: serializeError(e) }
      }
    }
  )

  ipcMain.handle(
    'skills:install-streaming',
    async (_, opts: { source: string; agents: string[]; global?: boolean }) => {
      const mainWindow = getMainWindow()
      if (!mainWindow) {
        return {
          ok: false,
          error: {
            code: 'UNKNOWN',
            command: '',
            stderr: '',
            exitCode: null,
            message: 'Main window not available'
          }
        }
      }
      try {
        const onOutput = (text: string): void => {
          if (mainWindow.isDestroyed()) return
          mainWindow.webContents.send('skills:install-output', text)
        }
        return {
          ok: true,
          data: await skillsService.installStreaming(onOutput, opts.source, opts.agents, opts.global)
        }
      } catch (e) {
        return { ok: false, error: serializeError(e) }
      }
    }
  )

  ipcMain.handle('skills:install-cancel', () => {
    skillsService.cancelInstall()
  })

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

  function hasPendingTask(type: string): boolean {
    return Array.from(backgroundTaskService.getAll()).some(
      (t) => t.type === type && (t.status === 'pending' || t.status === 'running')
    )
  }

  ipcMain.handle(
    'skills:update-background',
    async (_, opts: { packageRef: string; global?: boolean }) => {
      if (hasPendingTask('skill-update')) {
        return { taskId: '', error: '更新任务正在进行中' }
      }
      const taskId = backgroundTaskService.register('skill-update')
      backgroundTaskService.markRunning(taskId)

      skillsService
        .update(opts.packageRef, opts.global)
        .then((result) => {
          if (result.success) {
            backgroundTaskService.markSuccess(taskId)
          } else {
            backgroundTaskService.markError(taskId, result.stderr || '更新失败')
          }
        })
        .catch((error) => {
          backgroundTaskService.markError(
            taskId,
            error instanceof Error ? error.message : String(error)
          )
        })

      return { taskId }
    }
  )

  ipcMain.handle('skills:update-all-background', async (_, opts?: { global?: boolean }) => {
    if (hasPendingTask('skill-update-all')) {
      return { taskId: '', error: '全部更新任务正在进行中' }
    }
    const taskId = backgroundTaskService.register('skill-update-all')
    backgroundTaskService.markRunning(taskId)

    skillsService
      .updateAll(opts?.global)
      .then((result) => {
        if (result.success) {
          backgroundTaskService.markSuccess(taskId)
        } else {
          backgroundTaskService.markError(taskId, result.stderr || '更新失败')
        }
      })
      .catch((error) => {
        backgroundTaskService.markError(
          taskId,
          error instanceof Error ? error.message : String(error)
        )
      })

    return { taskId }
  })
}
