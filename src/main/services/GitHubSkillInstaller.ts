import fs from 'fs'
import path from 'path'
import os from 'os'
import decompress from 'decompress'
import type { ParsedGitHubUrl, GitHubParseResult } from '../../shared/types'
import { BACKGROUND_TASK_TIMEOUT_MS } from '../../shared/constants'
import { getSettings } from './StoreService'
import { localSkillInstaller } from './LocalSkillInstaller'
import { downloadWithProgress } from '../utils/download'
import type { IExtractableSkillInstaller } from './ISkillSourceInstaller'
import { isPathInside } from '../utils/pathSecurity'

export class GitHubSkillInstaller implements IExtractableSkillInstaller {
  readonly name = 'github'
  private abortController: AbortController | null = null

  parseUrl(url: string): ParsedGitHubUrl | null {
    const clean = url.trim().replace(/\.git$/, '')

    const patterns = [
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/,
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/
    ]

    for (const pattern of patterns) {
      const match = clean.match(pattern)
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
          branch: match[3] || 'main',
          subPath: match[4] || ''
        }
      }
    }

    return null
  }

  private validateRef(ref: string): void {
    const SAFE_REF = /^[a-zA-Z0-9_.\-/]+$/
    if (!SAFE_REF.test(ref)) {
      throw new Error(`Invalid GitHub reference: ${ref}`)
    }
  }

  private buildZipballUrl(owner: string, repo: string, branch: string): string {
    this.validateRef(owner)
    this.validateRef(repo)
    this.validateRef(branch)
    const proxyUrl = getSettings().proxyUrl
    const base = `https://github.com/${owner}/${repo}/archive/${branch}.zip`
    if (proxyUrl) {
      return `${proxyUrl}/${base}`
    }
    return base
  }

  async downloadZipball(
    owner: string,
    repo: string,
    branch: string,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const zipUrl = this.buildZipballUrl(owner, repo, branch)
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'skills-github-'))
    const zipPath = path.join(tempDir, 'download.zip')

    this.abortController = new AbortController()

    try {
      const result = await downloadWithProgress(zipUrl, zipPath, {
        onProgress,
        signal: this.abortController.signal,
        timeout: BACKGROUND_TASK_TIMEOUT_MS
      })
      return result
    } catch (e) {
      await localSkillInstaller.cleanupTempDir(tempDir)
      throw e
    } finally {
      this.abortController = null
    }
  }

  private async extractZip(
    zipPath: string,
    destDir: string
  ): Promise<ReturnType<typeof decompress>> {
    return await decompress(zipPath, destDir)
  }

  async extractAndScan(
    zipPath: string,
    subPath?: string,
    repo?: string,
    branch?: string,
    parsedUrl?: ParsedGitHubUrl
  ): Promise<GitHubParseResult> {
    const extractDir = path.join(path.dirname(zipPath), 'extracted')
    try {
      const files = await this.extractZip(zipPath, extractDir)

      for (const f of files) {
        const extractedPath = path.resolve(extractDir, f.path)
        if (!isPathInside(extractDir, extractedPath)) {
          throw new Error('Archive contains entries outside the target directory')
        }
      }

      const entries = await fs.promises.readdir(extractDir, { withFileTypes: true })
      const expectedDir = repo && branch ? `${repo}-${branch}` : null
      const expectedEntry = expectedDir
        ? entries.find((e) => e.name === expectedDir && e.isDirectory())
        : null
      const firstDir = entries.find((e) => e.isDirectory())
      let scanDir = expectedEntry
        ? path.join(extractDir, expectedEntry.name)
        : firstDir
          ? path.join(extractDir, firstDir.name)
          : extractDir

      if (subPath) {
        const normalizedSubPath = path.normalize(subPath).replace(/^[\\/]+/, '')
        if (normalizedSubPath.includes('..')) {
          throw new Error('Invalid subPath in GitHub URL')
        }
        scanDir = path.join(scanDir, normalizedSubPath)
        if (!isPathInside(extractDir, scanDir)) {
          throw new Error('Invalid subPath in GitHub URL')
        }
      }

      const skills = await localSkillInstaller.scanSkills(scanDir)
      return {
        skills,
        tempDir: path.dirname(zipPath),
        parsedUrl: parsedUrl ?? {
          owner: '',
          repo: repo ?? '',
          branch: branch ?? 'main',
          subPath: subPath ?? ''
        }
      }
    } catch (e) {
      await localSkillInstaller.cleanupTempDir(path.dirname(zipPath))
      throw e
    }
  }

  cancel(): void {
    this.abortController?.abort()
  }
}

export const githubSkillInstaller = new GitHubSkillInstaller()
