import { app } from 'electron'
import { createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import decompress from 'decompress'
import type { EnvStatus } from '../../shared/types'
import { commandRunner } from './CommandRunner'
import { npxService } from './NpxService'
import { getSettings } from './StoreService'

let downloadAbortController: AbortController | null = null

export function cancelNodeDownload(): void {
  if (downloadAbortController) {
    downloadAbortController.abort()
    downloadAbortController = null
  }
}

async function safeRun(
  command: string,
  args: string[],
  timeout: number
): Promise<{ success: boolean; stdout: string }> {
  try {
    return await commandRunner.run(command, args, { timeout })
  } catch {
    return { success: false, stdout: '' }
  }
}

export async function checkAll(): Promise<EnvStatus> {
  const node = await safeRun('node', ['--version'], 10000)
  const npm = await safeRun('npm', ['--version'], 10000)
  const npx = await npxService.checkNpxVersion()
  const skills = await npxService.checkSkillsVersion()
  return {
    nodeInstalled: node.success,
    nodeVersion: node.success ? node.stdout.trim() : null,
    npmInstalled: npm.success,
    npmVersion: npm.success ? npm.stdout.trim() : null,
    npxInstalled: npx.ok,
    npxVersion: npx.ok ? npx.version : null,
    skillsInstalled: skills.ok,
    skillsVersion: skills.ok ? skills.version : null
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

/**
 * Get the Node.js download URL for the current platform
 * @returns Download URL string
 */
export function getNodeDownloadUrl(): string {
  return (NODE_DOWNLOAD_URLS[process.platform] || NODE_DOWNLOAD_URLS.linux)()
}

/**
 * Get the installation directory for Node.js
 * @returns Path to the Node.js installation directory
 */
export function getNodeInstallDir(): string {
  return join(app.getPath('userData'), 'node')
}

/**
 * Download Node.js archive for the current platform
 * @param onProgress - Callback function receiving download percentage (0-100)
 * @returns Path to the downloaded archive file
 * @throws Error if download fails or response body is missing
 */
export async function downloadNode(onProgress: (percent: number) => void): Promise<string> {
  downloadAbortController = new AbortController()
  const url = getNodeDownloadUrl()
  const installDir = getNodeInstallDir()
  if (!existsSync(installDir)) {
    mkdirSync(installDir, { recursive: true })
  }
  const fileName = url.split('/').pop() || 'node-archive'
  const archivePath = join(installDir, fileName)

  try {
    const response = await fetch(url, { signal: downloadAbortController.signal })
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`)
    const contentLength = Number(response.headers.get('content-length') || 0)
    let downloaded = 0

    const stream = createWriteStream(archivePath)
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        const canContinue = stream.write(value)
        downloaded += value.length
        if (contentLength > 0) {
          onProgress(Math.round((downloaded / contentLength) * 100))
        }
        if (!canContinue) {
          await new Promise<void>((resolve) => stream.once('drain', resolve))
        }
      }
    }
    stream.end()
    downloadAbortController = null

    return archivePath
  } catch (error) {
    downloadAbortController = null
    if (existsSync(archivePath)) {
      try {
        unlinkSync(archivePath)
      } catch {
        // Ignore cleanup errors
      }
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('下载已取消')
    }
    throw error
  }
}

/**
 * Register the extracted Node.js bin directory in PATH
 * @param nodeDir - Path to the extracted Node.js directory
 */
export function registerNodeInPath(nodeDir: string): void {
  const binDir = join(nodeDir, 'bin')
  if (process.platform === 'win32') {
    process.env.PATH = `${binDir};${process.env.PATH}`
  } else {
    process.env.PATH = `${binDir}:${process.env.PATH}`
  }
}

/**
 * Extract the downloaded Node.js archive and return the extracted directory path
 * @param archivePath - Path to the downloaded Node.js archive
 * @returns Path to the extracted Node.js directory
 * @throws Error if extraction fails or no node directory is found
 */
export async function installSkillsCli(): Promise<{ success: boolean; stdout: string }> {
  try {
    const args = ['install', '-g', 'npx', 'skills']
    const registry = getSettings().npmRegistry
    if (registry) {
      args.push('--registry', registry)
    }
    const result = await commandRunner.run('npm', args, {
      timeout: 120000
    })
    return { success: result.success, stdout: result.stdout }
  } catch {
    return { success: false, stdout: '' }
  }
}

export async function extractAndRegisterNode(archivePath: string): Promise<string> {
  const installDir = getNodeInstallDir()
  await decompress(archivePath, installDir)
  const extractedDirName = readdirSync(installDir).find(
    (d) =>
      d.startsWith('node-v') &&
      !d.endsWith('.zip') &&
      !d.endsWith('.tar.gz') &&
      !d.endsWith('.tar.xz')
  )
  if (!extractedDirName) throw new Error('Extraction failed: no node directory found')
  const nodeDir = join(installDir, extractedDirName)
  registerNodeInPath(nodeDir)
  return nodeDir
}
