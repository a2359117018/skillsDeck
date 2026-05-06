import agentsData from '../../../shared/agents.json'

export interface Agent {
  name: string
  agentFlag: string
  projectPath: string
  globalPath: string
}

export const AGENTS: Agent[] = agentsData

export const COMMON_AGENT_FLAGS = ['claude-code', 'codex', 'opencode', 'trae', 'trae-cn', 'cursor']

export function getCommonAgents(): Agent[] {
  return AGENTS.filter((a) => COMMON_AGENT_FLAGS.includes(a.agentFlag))
}
