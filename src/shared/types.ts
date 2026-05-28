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
  type:
    | 'update-skills'
    | 'install-node'
    | 'install-skills'
    | 'skill-update'
    | 'skill-update-all'
    | 'skill-remove-batch'
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  progress: number
  stdout: string
  stderr: string
  error?: string
  createdAt: number
  updatedAt: number
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

export interface AppSettings {
  autoCheckEnv: boolean
  proxyUrl?: string
  npmRegistry?: string
  closeAction?: 'ask' | 'tray' | 'quit'
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

export interface SkillDoc {
  content: string
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

/** IPC 统一错误响应格式。
 *
 * 基础字段 `message` 为所有错误必需。
 * CLI 扩展字段（code, command, stderr, exitCode）仅在命令执行错误时填充。
 */
export interface IpcError {
  message: string
  code?: string
  command?: string
  stderr?: string
  exitCode?: number | null
}

/** IPC 统一结果格式 */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError }
