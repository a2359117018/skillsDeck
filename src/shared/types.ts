export interface EnvStatus {
  nodeInstalled: boolean
  nodeVersion: string | null
  npmInstalled: boolean
  npmVersion: string | null
  skillsInstalled: boolean
  skillsVersion: string | null
}

export interface BackgroundTask {
  id: string
  type: 'update-skills' | 'install-node' | 'install-skills' | 'skill-update' | 'skill-update-all' | 'skill-remove-batch'
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  progress: number
  stdout: string
  error?: string
  createdAt: number
  updatedAt: number
}

export interface Skill {
  name: string
  version: string
  source: string
  path: string
  scope: 'global' | 'project'
  agents: string[]
}

export interface AgentScanResult {
  agentFlag: string
  agentName: string
  globalPath: string
  skills: string[]
  count: number
}

export interface InstalledSkillAgent {
  name: string
  path: string
}

export interface InstalledSkill {
  name: string
  agents: InstalledSkillAgent[]
}

export interface CommandResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

export interface CommandErrorInfo {
  code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'EXECUTION_FAILED' | 'UNKNOWN'
  command: string
  stderr: string
  exitCode: number | null
  message: string
}

export interface AppSettings {
  autoCheckEnv: boolean
  proxyUrl?: string
  npmRegistry?: string
}

export interface SkillSearchResult {
  id: string
  skillId: string
  name: string
  installs: number
  source: string
}

export interface SkillSearchResponse {
  query: string
  searchType: string
  skills: SkillSearchResult[]
  count: number
  duration_ms: number
}

export function toPackageRef(id: string): string {
  const lastSlash = id.lastIndexOf('/')
  return id.substring(0, lastSlash) + '@' + id.substring(lastSlash + 1)
}

export function formatInstalls(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

export interface ScannedSkill {
  name: string
  path: string
  relativePath: string
}

export interface LocalInstallResult {
  success: string[]
  failed: { name: string; error: string }[]
}

export interface ParsedGitHubUrl {
  owner: string
  repo: string
  branch: string
  subPath: string
}

export interface GitHubParseResult {
  skills: ScannedSkill[]
  tempDir: string
  parsedUrl: ParsedGitHubUrl
}

export interface ArchiveScanResult {
  skills: ScannedSkill[]
  tempDir: string
}

/** IPC 统一错误响应格式（轻量版，不含命令专用字段） */
export interface IpcError {
  message: string
  code?: string
}

/** IPC 统一结果格式 */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError }

/** 将任意错误转换为 IpcError */
export function toIpcError(e: unknown): IpcError {
  if (e instanceof Error && 'code' in e) {
    const cmdErr = e as { code: string; message: string }
    return { message: cmdErr.message, code: cmdErr.code }
  }
  return { message: e instanceof Error ? e.message : String(e) }
}
