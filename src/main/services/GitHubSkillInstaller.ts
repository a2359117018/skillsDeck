import fs from 'fs'
import path from 'path'
import os from 'os'
import decompress from 'decompress'
import type { ScannedSkill, ParsedGitHubUrl } from '../../shared/types'
import { getSettings } from './StoreService'
import { localSkillInstaller } from './LocalSkillInstaller'

export class GitHubSkillInstaller {
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

  private buildZipballUrl(owner: string, repo: string, branch: string): string {
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
    const timeout = setTimeout(() => {
      this.abortController?.abort()
    }, 30000)

    try {
      const response = await fetch(zipUrl, {
        signal: this.abortController.signal,
        headers: { Accept: 'application/zip' }
      })

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`)
      }

      const totalLength = Number(response.headers.get('content-length')) || 0
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应体')
      }

      const chunks: Uint8Array[] = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        receivedLength += value.length
        if (totalLength > 0 && onProgress) {
          onProgress(Math.round((receivedLength / totalLength) * 100))
        }
      }

      const allChunks = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        allChunks.set(chunk, position)
        position += chunk.length
      }

      await fs.promises.writeFile(zipPath, allChunks)
      return zipPath
    } catch (e) {
      await localSkillInstaller.cleanupTempDir(tempDir)
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('下载已取消或超时')
      }
      throw e
    } finally {
      clearTimeout(timeout)
      this.abortController = null
    }
  }

  async extractAndScan(zipPath: string, subPath?: string): Promise<ScannedSkill[]> {
    const extractDir = path.join(path.dirname(zipPath), 'extracted')
    await decompress(zipPath, extractDir)

    const entries = await fs.promises.readdir(extractDir, { withFileTypes: true })
    const subDir = entries.find((e) => e.isDirectory())
    let scanDir = subDir ? path.join(extractDir, subDir.name) : extractDir

    if (subPath) {
      scanDir = path.join(scanDir, subPath)
    }

    return localSkillInstaller.scanSkills(scanDir)
  }

  cancelDownload(): void {
    this.abortController?.abort()
  }
}

export const githubSkillInstaller = new GitHubSkillInstaller()
