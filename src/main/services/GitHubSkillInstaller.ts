import fs from 'fs'
import path from 'path'
import os from 'os'
import * as yauzl from 'yauzl'
import type { ParsedGitHubUrl, GitHubParseResult } from '../../shared/types'
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

  private async extractZip(zipPath: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const symlinks: Array<{ dest: string; target: string }> = []

      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err)
          return
        }

        const readNext = (): void => zipfile.readEntry()

        zipfile.on('entry', (entry) => {
          if (entry.fileName.startsWith('__MACOSX/')) {
            readNext()
            return
          }

          const dest = path.join(destDir, entry.fileName)
          const mode = (entry.externalFileAttributes >> 16) & 0xffff
          const IFMT = 0o170000
          const IFDIR = 0o040000
          const IFLNK = 0o120000
          const isSymlink = (mode & IFMT) === IFLNK
          const isDir = (mode & IFMT) === IFDIR || entry.fileName.endsWith('/')

          if (isSymlink) {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                zipfile.close()
                reject(err)
                return
              }
              const chunks: Buffer[] = []
              readStream.on('data', (chunk: Buffer) => chunks.push(chunk))
              readStream.on('end', () => {
                symlinks.push({ dest, target: Buffer.concat(chunks).toString() })
                readNext()
              })
              readStream.on('error', (err) => {
                zipfile.close()
                reject(err)
              })
            })
            return
          }

          if (isDir) {
            fs.promises
              .mkdir(dest, { recursive: true })
              .then(() => readNext())
              .catch((err) => {
                zipfile.close()
                reject(err)
              })
            return
          }

          fs.promises
            .mkdir(path.dirname(dest), { recursive: true })
            .then(() => {
              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) {
                  zipfile.close()
                  reject(err)
                  return
                }
                const writeStream = fs.createWriteStream(dest)
                readStream.pipe(writeStream)
                writeStream.on('finish', readNext)
                writeStream.on('error', (err) => {
                  zipfile.close()
                  reject(err)
                })
              })
            })
            .catch((err) => {
              zipfile.close()
              reject(err)
            })
        })

        zipfile.on('end', async () => {
          for (const { dest, target } of symlinks) {
            try {
              const targetPath = path.resolve(path.dirname(dest), target)
              await fs.promises.copyFile(targetPath, dest)
            } catch {
              // Skip symlinks pointing to non-existent targets or directories
            }
          }
          resolve()
        })

        zipfile.on('error', reject)
        readNext()
      })
    })
  }

  async extractAndScan(
    zipPath: string,
    subPath?: string,
    repo?: string,
    branch?: string,
    parsedUrl?: ParsedGitHubUrl
  ): Promise<GitHubParseResult> {
    const extractDir = path.join(path.dirname(zipPath), 'extracted')
    await this.extractZip(zipPath, extractDir)

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
      const cleanSubPath = subPath.replace(/\.\./g, '').replace(/^[\\/]+/, '')
      if (!cleanSubPath) {
        throw new Error('Invalid subPath in GitHub URL')
      }
      scanDir = path.join(scanDir, cleanSubPath)
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
  }

  cancelDownload(): void {
    this.abortController?.abort()
  }
}

export const githubSkillInstaller = new GitHubSkillInstaller()
