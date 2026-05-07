import fs from 'fs'
import path from 'path'
import os from 'os'
import type { AgentScanResult } from '../../shared/types'
import agentsData from '../../shared/agents.json'

interface AgentDef {
  name: string
  agentFlag: string
  projectPath: string
  globalPath: string
}

class AgentScanner {
  private agents: AgentDef[] = agentsData as AgentDef[]

  private expandPath(p: string): string {
    if (p.startsWith('~')) {
      return path.join(os.homedir(), p.slice(2))
    }
    return path.resolve(p)
  }

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
    const absPath = this.expandPath(agent.globalPath)
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
}

export const agentScanner = new AgentScanner()
