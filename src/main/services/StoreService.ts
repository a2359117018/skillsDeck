export interface Settings {
  autoCheckEnv: boolean
}

export interface EnvStatus {
  nodeInstalled: boolean
  npxInstalled: boolean
  skillsInstalled: boolean
}

export function getSettings(): Settings {
  return { autoCheckEnv: true }
}

export function setEnvStatus(_status: EnvStatus): void {}
