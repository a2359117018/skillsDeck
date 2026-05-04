import { ipcMain } from 'electron'
import {
  searchSkillsApi,
  listSkills,
  installSkill,
  updateSkill,
  updateAllSkills,
  removeSkill
} from '../services/SkillsService'

export function registerSkillsIpc(): void {
  ipcMain.handle('skills:search', async (_, keyword: string) => {
    return searchSkillsApi(keyword)
  })

  ipcMain.handle('skills:list', async (_, opts?: { global?: boolean }) => {
    return listSkills(opts?.global)
  })

  ipcMain.handle(
    'skills:install',
    async (_, opts: { packageRef: string; agents: string[]; global?: boolean }) => {
      return installSkill(opts.packageRef, opts.agents, opts.global)
    }
  )

  ipcMain.handle('skills:update', async (_, opts: { packageRef: string; global?: boolean }) => {
    return updateSkill(opts.packageRef, opts.global)
  })

  ipcMain.handle('skills:update-all', async (_, opts?: { global?: boolean }) => {
    return updateAllSkills(opts?.global)
  })

  ipcMain.handle(
    'skills:remove',
    async (_, opts: { packageRef: string; agent?: string; global?: boolean }) => {
      return removeSkill(opts.packageRef, opts.agent, opts.global)
    }
  )
}
