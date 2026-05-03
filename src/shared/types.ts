export interface EnvStatus {
  nodeInstalled: boolean
  nodeVersion: string | null
  npxInstalled: boolean
  skillsInstalled: boolean
}

export interface Skill {
  name: string
  version: string
  source: string
  scope: 'global' | 'project'
  agents: string[]
}

export interface CommandResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

export interface AppSettings {
  defaultAgent: string
  autoCheckEnv: boolean
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
