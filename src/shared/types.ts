export interface EnvStatus {
  nodeInstalled: boolean
  nodeVersion: string | null
  npmInstalled: boolean
  npmVersion: string | null
  npxInstalled: boolean
  npxVersion: string | null
  skillsInstalled: boolean
  skillsVersion: string | null
}

export interface BackgroundTask {
  id: string
  type: 'update-npx' | 'update-skills' | 'install-node' | 'install-skills'
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
  defaultAgent: string
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
