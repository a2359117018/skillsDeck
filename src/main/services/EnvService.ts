import { execa } from 'execa'
import { app } from 'electron'
import { createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import decompress from 'decompress'
import type { EnvStatus } from '../../shared/types'

async function checkCommand(
  command: string,
  args: string[]
): Promise<{ ok: boolean; version: string | null }> {
  try {
    const result = await execa(command, args, {
      timeout: 10000,
      reject: false,
      shell: process.platform === 'win32'
    })
    if (result.exitCode === 0) {
      return { ok: true, version: result.stdout.trim() }
    }
    return { ok: false, version: null }
  } catch {
    return { ok: false, version: null }
  }
}

/**
 * Check environment status for Node.js, npx, and npx skills CLI
 * @returns Environment status object with installation info and versions
 */
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
  const url = getNodeDownloadUrl()
  const installDir = getNodeInstallDir()
  if (!existsSync(installDir)) {
    mkdirSync(installDir, { recursive: true })
  }
  const fileName = url.split('/').pop() || 'node-archive'
  const archivePath = join(installDir, fileName)

  try {
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

    return archivePath
  } catch (error) {
    if (existsSync(archivePath)) {
      try {
        unlinkSync(archivePath)
      } catch {
        // Ignore cleanup errors
      }
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
