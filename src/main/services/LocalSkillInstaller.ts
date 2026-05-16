import fs from 'fs'
import path from 'path'
import os from 'os'
import type { ScannedSkill, LocalInstallResult } from '../../shared/types'
import agentsData from '../../shared/agents.json'

interface AgentDef {
  name: string
  agentFlag: string
  globalPath: string
}

const agents: AgentDef[] = agentsData as AgentDef[]

export class LocalSkillInstaller {
  private expandPath(p: string): string {
    if (p.startsWith('~')) {
      return path.join(os.homedir(), p.slice(2))
    }
    return path.resolve(p)
  }

  async scanSkills(dir: string, maxDepth = 2): Promise<ScannedSkill[]> {
    const results: ScannedSkill[] = []
    const basePath = path.resolve(dir)
    await this.scanDir(basePath, basePath, 0, maxDepth, results)
    return results
  }

  private async scanDir(
    currentPath: string,
    basePath: string,
    depth: number,
    maxDepth: number,
    results: ScannedSkill[]
  ): Promise<void> {
    if (depth > maxDepth) return

    try {
      await fs.promises.access(path.join(currentPath, 'SKILL.md'))
      results.push({
        name: path.basename(currentPath),
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
      const skillName = rawName.replace(/[\\/]/g, '_').replace(/^\.+/, '')
      if (!skillName) {
        result.failed.push({ name: rawName || 'unknown', error: 'Invalid skill name' })
        continue
      }
      let allSucceeded = true
      let firstError = ''

      for (const agentFlag of agentFlags) {
        const agent = agents.find((a) => a.agentFlag === agentFlag)
        if (!agent) continue

        const agentDir = path.resolve(this.expandPath(agent.globalPath))
        const targetDir = path.join(agentDir, skillName)
        if (!path.resolve(targetDir).startsWith(agentDir + path.sep)) {
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
        result.success.push(skillName)
      } else {
        result.failed.push({ name: skillName, error: firstError })
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
