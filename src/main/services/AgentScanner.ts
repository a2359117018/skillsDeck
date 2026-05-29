import fs from 'fs'
import path from 'path'
import type { AgentScanResult, InstalledSkill } from '../../shared/types'
import agentsData from '../../shared/agents.json'
import { expandTildePath } from '../utils/path'
import { isPathInside } from '../utils/pathSecurity'

interface AgentDef {
  name: string
  agentFlag: string
  projectPath: string
  globalPath: string
}

class AgentScanner {
  private agents: AgentDef[] = agentsData as AgentDef[]

  async scanAll(): Promise<AgentScanResult[]> {
    const results: AgentScanResult[] = []
    for (const agent of this.agents) {
      results.push(await this.scanOneAgent(agent))
    }
    return results
  }

  async scanAgent(agentFlag: string): Promise<AgentScanResult | null> {
    const agent = this.agents.find((a) => a.agentFlag === agentFlag)
    if (!agent) return null
    return this.scanOneAgent(agent)
  }

  private async scanOneAgent(agent: AgentDef): Promise<AgentScanResult> {
    const absPath = expandTildePath(agent.globalPath)
    const skills: string[] = []

    try {
      const entries = await fs.promises.readdir(absPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '.system') {
          skills.push(entry.name)
        }
      }
    } catch {
      // directory does not exist — agent not installed
    }

    return {
      agentFlag: agent.agentFlag,
      agentName: agent.name,
      globalPath: absPath,
      skills,
      count: skills.length
    }
  }

  async scanInstalled(): Promise<InstalledSkill[]> {
    const skillMap = new Map<string, InstalledSkill>()

    for (const agent of this.agents) {
      const absPath = expandTildePath(agent.globalPath)
      const skillNames: string[] = []

      try {
        const entries = await fs.promises.readdir(absPath, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '.system') {
            skillNames.push(entry.name)
          }
        }
      } catch {
        continue
      }

      for (const skillName of skillNames) {
        const skillPath = path.join(absPath, skillName)
        if (!isPathInside(absPath, skillPath)) continue
        if (!skillMap.has(skillName)) {
          skillMap.set(skillName, { name: skillName, agents: [] })
        }
        skillMap.get(skillName)!.agents.push({
          name: agent.agentFlag,
          path: skillPath
        })
      }
    }

    return Array.from(skillMap.values())
  }
}

export const agentScanner = new AgentScanner()
