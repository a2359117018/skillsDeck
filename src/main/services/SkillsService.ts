import type { CommandResult, SkillDoc } from '../../shared/types'
import fs from 'fs'
import path from 'path'
import agentsData from '../../shared/agents.json'
import { commandRunner, type CommandHandle } from './CommandRunner'
import { getSettings } from './StoreService'
import { expandTildePath } from '../utils/path'
import { isPathInside } from '../utils/pathSecurity'

interface AgentDef {
  name: string
  agentFlag: string
  projectPath: string
  globalPath: string
}

class SkillsService {
  private activeHandle: CommandHandle | null = null

  async install(source: string, agents: string[], global?: boolean): Promise<CommandResult> {
    const args = this.buildInstallArgs(source, agents, global)
    const handle = commandRunner.run('skills', args)
    this.activeHandle = handle
    try {
      return await handle.promise
    } finally {
      this.activeHandle = null
    }
  }

  async installStreaming(
    onOutput: (text: string) => void,
    source: string,
    agents: string[],
    global?: boolean
  ): Promise<CommandResult> {
    const args = this.buildInstallArgs(source, agents, global)
    const handle = commandRunner.run('skills', args, { onOutput })
    this.activeHandle = handle
    try {
      return await handle.promise
    } finally {
      this.activeHandle = null
    }
  }

  cancelInstall(): void {
    this.activeHandle?.cancel()
    this.activeHandle = null
  }

  async update(name: string, global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('update', name, '-y')
    if (global) args.push('-g')
    const handle = commandRunner.run('skills', args)
    this.activeHandle = handle
    try {
      return await handle.promise
    } finally {
      this.activeHandle = null
    }
  }

  async updateAll(global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('update', '-y')
    if (global) args.push('-g')
    const handle = commandRunner.run('skills', args)
    this.activeHandle = handle
    try {
      return await handle.promise
    } finally {
      this.activeHandle = null
    }
  }

  /**
   * 删除技能，直接根据 agents.json 中的路径操作文件系统，
   * 绕过 skills CLI 的 remove 命令（该命令对 universal agent 存在假成功 bug）。
   */
  async remove(name: string, agent?: string, global?: boolean): Promise<CommandResult> {
    const agents = agentsData as AgentDef[]
    const targets = agent ? agents.filter((a) => a.agentFlag === agent) : agents

    let removed = 0
    const errors: string[] = []

    for (const target of targets) {
      const basePath = expandTildePath(global ? target.globalPath : target.projectPath)
      const skillPath = path.join(basePath, name)

      if (!isPathInside(basePath, skillPath)) {
        errors.push(`${target.agentFlag}: Invalid skill path`)
        continue
      }

      try {
        const stat = await fs.promises.lstat(skillPath)
        if (stat.isDirectory() || stat.isSymbolicLink()) {
          await fs.promises.rm(skillPath, { recursive: true, force: true })
          removed++
        }
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code
        if (code !== 'ENOENT') {
          errors.push(`${target.agentFlag}: ${(err as Error).message}`)
        }
      }
    }

    return {
      success: errors.length === 0,
      stdout: removed > 0 ? `Successfully removed ${removed} skill(s)` : 'No matching skills found',
      stderr: errors.join('\n'),
      exitCode: errors.length === 0 ? 0 : 1
    }
  }

  async readDoc(name: string): Promise<SkillDoc> {
    const agents = agentsData as AgentDef[]

    for (const agent of agents) {
      const globalPath = expandTildePath(agent.globalPath)
      const projectPath = expandTildePath(agent.projectPath)

      for (const basePath of [globalPath, projectPath]) {
        const skillPath = path.join(basePath, name)
        const skillMdPath = path.join(skillPath, 'SKILL.md')

        try {
          const content = await fs.promises.readFile(skillMdPath, 'utf-8')
          return { content }
        } catch (err) {
          const code = (err as NodeJS.ErrnoException).code
          if (code !== 'ENOENT') {
            throw new Error(`读取技能文档失败: ${(err as Error).message}`)
          }
        }
      }
    }

    throw new Error(`未找到技能 "${name}" 的 SKILL.md`)
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
