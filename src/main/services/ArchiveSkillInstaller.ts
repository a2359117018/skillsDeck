import fs from 'fs'
import path from 'path'
import os from 'os'
import decompress from 'decompress'
import type { ArchiveScanResult } from '../../shared/types'
import { localSkillInstaller } from './LocalSkillInstaller'
import { isPathInside } from '../utils/pathSecurity'
import type { IExtractableSkillInstaller } from './ISkillSourceInstaller'

const SUPPORTED_EXTENSIONS = ['.zip', '.tar.gz', '.tgz']

export class ArchiveSkillInstaller implements IExtractableSkillInstaller {
  readonly name = 'archive'
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

  cancel(): void {
    // Archive extraction is synchronous; no-op
  }

  async extractAndScan(filePath: string): Promise<ArchiveScanResult> {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'skills-archive-'))
    try {
      const files = await decompress(filePath, tempDir)
      for (const f of files) {
        const extractedPath = path.resolve(tempDir, f.path)
        if (!isPathInside(tempDir, extractedPath)) {
          throw new Error('Archive contains entries outside the target directory')
        }
      }
      const skills = await localSkillInstaller.scanSkills(tempDir)
      return { skills, tempDir }
    } catch (e) {
      await localSkillInstaller.cleanupTempDir(tempDir)
      throw e
    }
  }
}

export const archiveSkillInstaller = new ArchiveSkillInstaller()
