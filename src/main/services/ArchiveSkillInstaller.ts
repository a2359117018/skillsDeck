import fs from 'fs'
import path from 'path'
import os from 'os'
import decompress from 'decompress'
import type { ScannedSkill } from '../../shared/types'
import { localSkillInstaller } from './LocalSkillInstaller'

const SUPPORTED_EXTENSIONS = ['.zip', '.tar.gz', '.tgz']

export class ArchiveSkillInstaller {
  private getExtension(filePath: string): string {
    if (filePath.endsWith('.tar.gz')) return '.tar.gz'
    if (filePath.endsWith('.tgz')) return '.tgz'
    if (filePath.endsWith('.zip')) return '.zip'
    return ''
  }

  validate(filePath: string): { valid: boolean; error?: string } {
    const ext = this.getExtension(filePath)
    if (!ext) {
      return {
        valid: false,
        error: `不支持的格式，仅支持: ${SUPPORTED_EXTENSIONS.join(', ')}`
      }
    }
    return { valid: true }
  }

  async extractAndScan(filePath: string): Promise<ScannedSkill[]> {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'skills-archive-'))
    try {
      await decompress(filePath, tempDir)
      return localSkillInstaller.scanSkills(tempDir)
    } catch (e) {
      await localSkillInstaller.cleanupTempDir(tempDir)
      throw e
    }
  }
}

export const archiveSkillInstaller = new ArchiveSkillInstaller()
