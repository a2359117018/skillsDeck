import type { SkillSearchResponse } from '../../shared/types'
import { CommandError } from '../services/CommandRunner'

export async function searchSkillsApi(keyword: string): Promise<SkillSearchResponse> {
  const url = `https://skills.sh/api/search?q=${encodeURIComponent(keyword)}&limit=10`
  const response = await fetch(url)
  if (!response.ok) {
    throw new CommandError('EXECUTION_FAILED', `GET ${url}`, `HTTP ${response.status}`, null)
  }
  return (await response.json()) as Promise<SkillSearchResponse>
}
