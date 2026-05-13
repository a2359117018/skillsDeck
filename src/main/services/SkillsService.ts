import type { CommandResult } from '../../shared/types'
import { commandRunner } from './CommandRunner'
import { getSettings } from './StoreService'

class SkillsService {
  async checkSkillsVersion(): Promise<{ ok: boolean; version: string | null }> {
    try {
      const result = await commandRunner.run('skills', ['--version'], {
        timeout: 10000
      })
      if (result.success) {
        return { ok: true, version: result.stdout.trim() }
      }
      return { ok: false, version: null }
    } catch {
      return { ok: false, version: null }
    }
  }

  async install(source: string, agents: string[], global?: boolean): Promise<CommandResult> {
    const args = this.buildInstallArgs(source, agents, global)
    return commandRunner.run('skills', args)
  }

  async installStreaming(
    onOutput: (text: string) => void,
    source: string,
    agents: string[],
    global?: boolean
  ): Promise<CommandResult> {
    const args = this.buildInstallArgs(source, agents, global)
    return commandRunner.run('skills', args, { onOutput })
  }

  cancelInstall(): void {
    commandRunner.cancel()
  }

  async update(name: string, global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('update', name, '-y')
    if (global) args.push('-g')
    return commandRunner.run('skills', args)
  }

  async updateAll(global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('update', '-y')
    if (global) args.push('-g')
    return commandRunner.run('skills', args)
  }

  async remove(name: string, agent?: string, global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('remove', name, '-y')
    if (global) args.push('-g')
    if (agent) args.push('-a', agent)
    return commandRunner.run('skills', args)
  }

  private buildArgs(subcommand: string, ...parts: string[]): string[] {
    return [subcommand, ...parts]
  }

  private buildGitUrl(source: string): string {
    const proxyUrl = getSettings().proxyUrl
    if (proxyUrl) {
      return `${proxyUrl}/https://github.com/${source}.git`
    }
    return `https://github.com/${source}.git`
  }

  private buildInstallArgs(source: string, agents: string[], global?: boolean): string[] {
    const gitUrl = this.buildGitUrl(source)
    const args = this.buildArgs('add', gitUrl)
    args.push('-g', '-y')
    if (global) {
      args.push('--agent', '*')
    } else if (agents.length > 0) {
      args.push('--agent', ...agents)
    }
    return args
  }
}

export const skillsService = new SkillsService()
