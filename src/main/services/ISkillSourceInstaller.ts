import type { ScannedSkill, LocalInstallResult } from '../../shared/types'

/**
 * 技能安装器基础接口。
 *
 * 所有技能源安装器（GitHub、压缩包、本地目录）都实现此基础接口，
 * 用于在 IPC 层和服务层建立统一的类型契约。
 */
export interface ISkillSourceInstaller {
  /** 安装器名称标识 */
  readonly name: string
}

/**
 * 支持从远程或压缩包提取并扫描技能的安装器。
 *
 * GitHubSkillInstaller 和 ArchiveSkillInstaller 实现此接口。
 */
export interface IExtractableSkillInstaller extends ISkillSourceInstaller {
  /** 从来源提取并扫描技能（具体参数因实现而异） */
  extractAndScan(
    source: string,
    ...rest: unknown[]
  ): Promise<{ skills: ScannedSkill[]; tempDir: string }>
  /** 取消进行中的下载或提取操作 */
  cancel(): void
}

/**
 * 支持本地目录扫描和安装到 agent 路径的安装器。
 *
 * LocalSkillInstaller 实现此接口，是实际执行文件复制的安装器。
 */
export interface ILocalSkillInstaller extends ISkillSourceInstaller {
  /** 扫描目录中的技能（递归查找 SKILL.md） */
  scanSkills(dir: string, maxDepth?: number): Promise<ScannedSkill[]>
  /** 将技能目录复制到指定 agent 的全局路径 */
  installSkills(skillDirs: string[], agentFlags: string[]): Promise<LocalInstallResult>
  /** 清理临时目录 */
  cleanupTempDir(dir: string): Promise<void>
}
