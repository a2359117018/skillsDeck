import { execa } from 'execa'
import stripAnsiModule from 'strip-ansi'

const stripAnsi =
  (stripAnsiModule as unknown as { default?: typeof stripAnsiModule }).default ?? stripAnsiModule
import type { CommandResult, Skill, SkillSearchResponse } from '../../shared/types'

const COMMAND_TIMEOUT = 60000

/**
 * Custom error class for skills CLI command failures
 */
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
  } catch (error: unknown) {
    const err = error as { code?: string; timedOut?: boolean; message?: string }
    if (err.code === 'ENOENT') {
      throw new SkillsError('COMMAND_NOT_FOUND', `npx skills ${args.join(' ')}`, '', null)
    }
    if (err.timedOut) {
      throw new SkillsError('TIMEOUT', `npx skills ${args.join(' ')}`, '', null)
    }
    throw new SkillsError(
      'UNKNOWN',
      `npx skills ${args.join(' ')}`,
      err.message || String(error),
      null
    )
  }
}

/**
 * Search for skills matching the given keyword
 * @param keyword - Search keyword
 * @returns Raw stdout from the search command (ANSI stripped)
 * @throws SkillsError if the command execution fails
 */
export async function searchSkills(keyword: string): Promise<string> {
  const result = await execute(['find', keyword])
  if (!result.success) {
    throw new SkillsError('EXECUTION_FAILED', 'find', result.stderr, result.exitCode)
  }
  return stripAnsi(result.stdout)
}

/**
 * List installed skills in JSON format
 * @param global - Whether to list global skills
 * @param agent - Filter by specific agent
 * @returns Array of Skill objects
 * @throws SkillsError if the command execution fails or JSON parsing fails
 */
export async function listSkills(global?: boolean): Promise<Skill[]> {
  const args = ['list', '--json']
  if (global) args.push('-g')
  const result = await execute(args)
  if (!result.success) {
    throw new SkillsError('EXECUTION_FAILED', 'list', result.stderr, result.exitCode)
  }
  try {
    return JSON.parse(result.stdout)
  } catch (error) {
    console.error('Failed to parse skills list JSON:', error)
    throw new SkillsError(
      'EXECUTION_FAILED',
      'list',
      `Invalid JSON: ${result.stdout}`,
      result.exitCode
    )
  }
}

/**
 * Install a skill package
 * @param packageRef - Package reference (name or path)
 * @param agents - Target agents for the skill
 * @param global - Whether to install globally
 * @returns Command execution result
 */
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

/**
 * Update a specific skill
 * @param name - Name of the skill to update
 * @param global - Whether to update the global installation
 * @returns Command execution result
 */
export async function updateSkill(name: string, global?: boolean): Promise<CommandResult> {
  const args = ['update', name, '-y']
  if (global) args.push('-g')
  return execute(args)
}

/**
 * Update all installed skills
 * @param global - Whether to update global skills
 * @returns Command execution result
 */
export async function updateAllSkills(global?: boolean): Promise<CommandResult> {
  const args = ['update', '-y']
  if (global) args.push('-g')
  return execute(args)
}

/**
 * Remove an installed skill
 * @param name - Name of the skill to remove
 * @param agent - Specific agent to remove the skill from
 * @param global - Whether to remove the global installation
 * @returns Command execution result
 */
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

export async function searchSkillsApi(keyword: string): Promise<SkillSearchResponse> {
  const url = `https://skills.sh/api/search?q=${encodeURIComponent(keyword)}&limit=10`
  const response = await fetch(url)
  if (!response.ok) {
    throw new SkillsError('EXECUTION_FAILED', 'find', `HTTP ${response.status}`, null)
  }
  return response.json() as Promise<SkillSearchResponse>
}
