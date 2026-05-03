export interface EnvStatus {
  nodeInstalled: boolean
  npxInstalled: boolean
  skillsInstalled: boolean
}

export async function checkAll(): Promise<EnvStatus> {
  return {
    nodeInstalled: true,
    npxInstalled: true,
    skillsInstalled: true
  }
}
