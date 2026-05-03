import { execa } from 'execa'
import { app } from 'electron'
import { createWriteStream, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import decompress from 'decompress'
import type { EnvStatus } from '../../shared/types'

async function checkCommand(
  command: string,
  args: string[]
): Promise<{ ok: boolean; version: string | null }> {
  try {
    const result = await execa(command, args, { timeout: 10000, reject: false, shell: process.platform === 'win32' })
    if (result.exitCode === 0) {
      return { ok: true, version: result.stdout.trim() }
    }
    return { ok: false, version: null }
  } catch {
    return { ok: false, version: null }
  }
}

export async function checkAll(): Promise<EnvStatus> {
  const node = await checkCommand('node', ['--version'])
  const npx = await checkCommand('npx', ['--version'])
  const skills = await checkCommand('npx', ['skills', '--version'])
  return {
    nodeInstalled: node.ok,
    nodeVersion: node.version,
    npxInstalled: npx.ok,
    skillsInstalled: skills.ok
  }
}

const NODE_DOWNLOAD_URLS: Record<string, () => string> = {
  win32: () => 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip',
  darwin: () =>
    process.arch === 'arm64'
      ? 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-darwin-arm64.tar.gz'
      : 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-darwin-x64.tar.gz',
  linux: () => 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz'
}

export function getNodeDownloadUrl(): string {
  return (NODE_DOWNLOAD_URLS[process.platform] || NODE_DOWNLOAD_URLS.linux)()
}

export function getNodeInstallDir(): string {
  return join(app.getPath('userData'), 'node')
}

export async function downloadNode(
  onProgress: (percent: number) => void
): Promise<string> {
  const url = getNodeDownloadUrl()
  const installDir = getNodeInstallDir()
  if (!existsSync(installDir)) {
    mkdirSync(installDir, { recursive: true })
  }
  const fileName = url.split('/').pop()!
  const archivePath = join(installDir, fileName)

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed: ${response.statusText}`)
  const contentLength = Number(response.headers.get('content-length') || 0)
  let downloaded = 0

  const stream = createWriteStream(archivePath)
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    stream.write(value)
    downloaded += value.length
    if (contentLength > 0) {
      onProgress(Math.round((downloaded / contentLength) * 100))
    }
  }
  stream.end()

  return archivePath
}

export async function extractAndRegisterNode(archivePath: string): Promise<string> {
  const installDir = getNodeInstallDir()
  await decompress(archivePath, installDir)
  const extractedDirName = readdirSync(installDir).find(
    (d) => d.startsWith('node-v') && !d.endsWith('.zip') && !d.endsWith('.tar.gz') && !d.endsWith('.tar.xz')
  )
  if (!extractedDirName) throw new Error('Extraction failed: no node directory found')
  return join(installDir, extractedDirName)
}
