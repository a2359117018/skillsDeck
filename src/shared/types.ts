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
