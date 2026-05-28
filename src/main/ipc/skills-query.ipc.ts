import { ipcMain } from 'electron'
import type { IpcError } from '../../shared/types'
import { skillsService } from '../services/SkillsService'
import { agentScanner } from '../services/AgentScanner'
import { CommandError } from '../services/CommandRunner'
import { searchSkillsApi } from '../api/skills'

function serializeError(e: unknown): IpcError {
  if (e instanceof CommandError) {
    return e.toJSON()
  }
  return {
    message: e instanceof Error ? e.message : String(e)
  }
}

/**
 * 注册技能查询相关的 IPC handler。
 *
 * 包括：搜索技能、列出已安装技能、读取技能文档。
 */
export function registerSkillsQueryIpc(): void {
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

  ipcMain.handle('skills:read-doc', async (_, name: string) => {
    try {
      return { ok: true, data: await skillsService.readDoc(name) }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })
}
