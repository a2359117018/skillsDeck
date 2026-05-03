import { execa } from 'execa'
import stripAnsi from 'strip-ansi'
import type { CommandResult, Skill } from '../../shared/types'

const COMMAND_TIMEOUT = 60000

export class SkillsError extends Error {
  constructor(
    public code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'EXECUTION_FAILED' | 'UNKNOWN',
    public command: string,
    public stderr: string,
    public exitCode: number | null
  ) {
    super(`Skills command failed: ${code}`)
    this.name = 'SkillsError'
  }
}

async function execute(args: string[]): Promise<CommandResult> {
  try {
    const result = await execa('npx', ['skills', ...args], {
      timeout: COMMAND_TIMEOUT,
      reject: false,
      shell: process.platform === 'win32'
    })
    return {
      success: result.exitCode === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? null
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new SkillsError('COMMAND_NOT_FOUND', `npx skills ${args.join(' ')}`, '', null)
    }
    if (error.timedOut) {
      throw new SkillsError('TIMEOUT', `npx skills ${args.join(' ')}`, '', null)
    }
    throw new SkillsError('UNKNOWN', `npx skills ${args.join(' ')}`, error.message, null)
  }
}

export async function searchSkills(keyword: string): Promise<string> {
  const result = await execute(['find', keyword])
  if (!result.success) {
    throw new SkillsError('EXECUTION_FAILED', 'find', result.stderr, result.exitCode)
  }
  return stripAnsi(result.stdout)
}

export async function listSkills(global?: boolean, agent?: string): Promise<Skill[]> {
  const args = ['list', '--json']
  if (global) args.push('-g')
  if (agent) args.push('-a', agent)
  const result = await execute(args)
  if (!result.success) {
    throw new SkillsError('EXECUTION_FAILED', 'list', result.stderr, result.exitCode)
  }
  try {
    return JSON.parse(result.stdout)
  } catch {
    return []
  }
}

export async function installSkill(
  packageRef: string,
  agents: string[],
  global?: boolean
): Promise<CommandResult> {
  const args = ['add', packageRef]
  if (global) {
    args.push('-g')
  } else if (agents.length > 0) {
    args.push('--agent', ...agents)
  }
  args.push('-y')
  return execute(args)
}

export async function updateSkill(name: string, global?: boolean): Promise<CommandResult> {
  const args = ['update', name, '-y']
  if (global) args.push('-g')
  return execute(args)
}

export async function updateAllSkills(global?: boolean): Promise<CommandResult> {
  const args = ['update', '-y']
  if (global) args.push('-g')
  return execute(args)
}

export async function removeSkill(
  name: string,
  agent?: string,
  global?: boolean
): Promise<CommandResult> {
  const args = ['remove', name, '-y']
  if (global) args.push('-g')
  if (agent) args.push('-a', agent)
  return execute(args)
}
