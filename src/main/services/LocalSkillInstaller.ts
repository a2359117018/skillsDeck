import fs from 'fs'
import path from 'path'
import type { ScannedSkill, LocalInstallResult } from '../../shared/types'
import agentsData from '../../shared/agents.json'
import { expandTildePath } from '../utils/path'
import { isPathInside } from '../utils/pathSecurity'
import type { ILocalSkillInstaller } from './ISkillSourceInstaller'

interface AgentDef {
  name: string
  agentFlag: string
  globalPath: string
}

const agents: AgentDef[] = agentsData as AgentDef[]

export class LocalSkillInstaller implements ILocalSkillInstaller {
  readonly name = 'local'

  async scanSkills(dir: string, maxDepth = 2): Promise<ScannedSkill[]> {
    const results: ScannedSkill[] = []
    const basePath = path.resolve(dir)
    await this.scanDir(basePath, basePath, 0, maxDepth, results)
    return results
  }

  /**
   * 从 SKILL.md frontmatter 提取技能名。
   * 解析 `---` 之间的 YAML，查找 `name:` 字段。
   * 若解析失败或无 name 字段，回退到目录名。
   */
  private async extractSkillName(skillMdPath: string, fallbackName: string): Promise<string> {
    try {
      const content = await fs.promises.readFile(skillMdPath, 'utf-8')
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
      if (!frontmatterMatch) return fallbackName
      const nameMatch = frontmatterMatch[1].match(/^name:\s*['"]?(.+?)['"]?\s*$/m)
      return nameMatch ? nameMatch[1].trim() : fallbackName
    } catch {
      return fallbackName
    }
  }

  private async scanDir(
    currentPath: string,
    basePath: string,
    depth: number,
    maxDepth: number,
    results: ScannedSkill[]
  ): Promise<void> {
    if (depth > maxDepth) return

    const skillMdPath = path.join(currentPath, 'SKILL.md')
    try {
      await fs.promises.access(skillMdPath)
      results.push({
        name: await this.extractSkillName(skillMdPath, path.basename(currentPath)),
        path: currentPath,
        relativePath: path.relative(basePath, currentPath)
      })
      return
    } catch {
      // SKILL.md not found, continue scanning subdirectories
    }

    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await this.scanDir(
            path.join(currentPath, entry.name),
            basePath,
            depth + 1,
            maxDepth,
            results
          )
        }
      }
    } catch {
      // directory not readable, skip
    }
  }

  private async copyDir(src: string, dest: string): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true })
    const entries = await fs.promises.readdir(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath)
      } else {
        await fs.promises.copyFile(srcPath, destPath)
      }
    }
  }

  async installSkills(skillDirs: string[], agentFlags: string[]): Promise<LocalInstallResult> {
    const result: LocalInstallResult = { success: [], failed: [] }

    for (const skillDir of skillDirs) {
      const rawName = path.basename(skillDir)
      const fallbackName = rawName.replace(/[\\/]/g, '_').replace(/^\.+/, '')
      const displayName = await this.extractSkillName(path.join(skillDir, 'SKILL.md'), fallbackName)
      const targetName = displayName.replace(/[\\/]/g, '_').replace(/^\.+/, '')
      if (!targetName) {
        result.failed.push({ name: rawName || 'unknown', error: 'Invalid skill name' })
        continue
      }
      let allSucceeded = true
      let firstError = ''

      for (const agentFlag of agentFlags) {
        const agent = agents.find((a) => a.agentFlag === agentFlag)
        if (!agent) continue

        const agentDir = expandTildePath(agent.globalPath)
        await fs.promises.mkdir(agentDir, { recursive: true })
        const targetDir = path.join(agentDir, targetName)
        if (!isPathInside(agentDir, targetDir)) {
          allSucceeded = false
          firstError = 'Invalid target path'
          break
        }
        try {
          await this.copyDir(skillDir, targetDir)
        } catch (e) {
          allSucceeded = false
          firstError = e instanceof Error ? e.message : String(e)
          break
        }
      }

      if (allSucceeded) {
        result.success.push(displayName)
      } else {
        result.failed.push({ name: displayName, error: firstError })
      }
    }

    return result
  }

  async cleanupTempDir(dir: string): Promise<void> {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }
}

export const localSkillInstaller = new LocalSkillInstaller()
