import { ipcMain, dialog } from 'electron'
import path from 'path'
import os from 'os'
import type { IpcError } from '../../shared/types'
import { skillsService } from '../services/SkillsService'
import { githubSkillInstaller } from '../services/GitHubSkillInstaller'
import { archiveSkillInstaller } from '../services/ArchiveSkillInstaller'
import { localSkillInstaller } from '../services/LocalSkillInstaller'
import { CommandError } from '../services/CommandRunner'
import { isPathInside } from '../utils/pathSecurity'
import { validateInstallSource } from '../utils/validation'

function serializeError(e: unknown): IpcError {
  if (e instanceof CommandError) {
    return e.toJSON()
  }
  return {
    message: e instanceof Error ? e.message : String(e)
  }
}

/**
 * 注册技能安装相关的 IPC handler。
 *
 * 包括：直接安装、流式安装、取消安装、GitHub 解析与下载、
 * 压缩包选择与解压、本地安装、取消下载、清理临时文件。
 */
export function registerSkillsInstallIpc(getMainWindow: () => Electron.BrowserWindow | null): void {
  ipcMain.handle(
    'skills:install',
    async (_, opts: { source: string; agents: string[]; global?: boolean }) => {
      try {
        const source = validateInstallSource(opts.source)
        return {
          ok: true,
          data: await skillsService.install(source, opts.agents, opts.global)
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
          error: { message: 'Main window not available' }
        }
      }
      try {
        const source = validateInstallSource(opts.source)
        const onOutput = (text: string): void => {
          if (mainWindow.isDestroyed()) return
          mainWindow.webContents.send('skills:install-output', text)
        }
        return {
          ok: true,
          data: await skillsService.installStreaming(onOutput, source, opts.agents, opts.global)
        }
      } catch (e) {
        return { ok: false, error: serializeError(e) }
      }
    }
  )

  ipcMain.handle('skills:install-cancel', () => {
    skillsService.cancelInstall()
  })

  ipcMain.handle('skills:parse-github', async (_, url: string) => {
    const mainWindow = getMainWindow()
    let zipPath = ''
    try {
      const parsed = githubSkillInstaller.parseUrl(url)
      if (!parsed) {
        return {
          ok: false,
          error: { message: '无效的 GitHub URL，请检查格式' }
        }
      }

      const onProgress = (percent: number): void => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('skills:github-download-progress', percent)
        }
      }

      zipPath = await githubSkillInstaller.downloadZipball(
        parsed.owner,
        parsed.repo,
        parsed.branch,
        onProgress
      )
      const result = await githubSkillInstaller.extractAndScan(
        zipPath,
        parsed.subPath,
        parsed.repo,
        parsed.branch,
        parsed
      )
      return { ok: true, data: result }
    } catch (e) {
      if (zipPath) {
        await localSkillInstaller.cleanupTempDir(path.dirname(zipPath)).catch(() => {})
      }
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle('skills:select-archive', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: '压缩文件', extensions: ['zip', 'tar.gz', 'tgz'] }]
      })
      if (result.canceled || result.filePaths.length === 0) {
        return {
          ok: false,
          error: { message: '未选择文件' }
        }
      }
      return { ok: true, data: result.filePaths[0] }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle('skills:extract-archive', async (_, filePath: string) => {
    try {
      const validation = archiveSkillInstaller.validate(filePath)
      if (!validation.valid) {
        return {
          ok: false,
          error: { message: validation.error }
        }
      }
      const result = await archiveSkillInstaller.extractAndScan(filePath)
      return { ok: true, data: result }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle(
    'skills:install-local',
    async (_, opts: { skillDirs: string[]; agents: string[] }) => {
      try {
        const result = await localSkillInstaller.installSkills(opts.skillDirs, opts.agents)
        return { ok: true, data: result }
      } catch (e) {
        return { ok: false, error: serializeError(e) }
      }
    }
  )

  ipcMain.handle('skills:cancel-github-download', () => {
    githubSkillInstaller.cancel()
  })

  ipcMain.handle('skills:cleanup-temp', async (_, tempDirs: string[]) => {
    const tmpDir = os.tmpdir()
    for (const dir of tempDirs) {
      const resolved = path.resolve(dir)
      if (isPathInside(tmpDir, resolved) && path.basename(resolved).startsWith('skills-')) {
        await localSkillInstaller.cleanupTempDir(resolved)
      }
    }
  })
}
