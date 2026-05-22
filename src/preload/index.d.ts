import type { ElectronAPI } from '@electron-toolkit/preload'
import type {
  EnvStatus,
  AppSettings,
  CommandResult,
  SkillSearchResponse,
  CommandErrorInfo,
  InstalledSkill,
  AgentScanResult,
  BackgroundTask,
  LocalInstallResult,
  GitHubParseResult,
  ArchiveScanResult,
  IpcResult
} from '../shared/types'

export interface AppApi {
  /** 从拖拽的 File 对象获取本地文件路径（contextIsolation 兼容） */
  getPathForFile: (file: File) => string
  skills: {
    search: (keyword: string) => Promise<IpcResult<SkillSearchResponse>>
    list: () => Promise<IpcResult<InstalledSkill[]>>
    install: (opts: {
      source: string
      agents: string[]
      global?: boolean
    }) => Promise<IpcResult<CommandResult>>
    installStreaming: (opts: {
      source: string
      agents: string[]
      global?: boolean
    }) => Promise<IpcResult<CommandResult>>
    onInstallOutput: (callback: (text: string) => void) => () => void
    cancelInstall: () => Promise<void>
    update: (opts: { packageRef: string; global?: boolean }) => Promise<IpcResult<CommandResult>>
    updateAll: (opts?: { global?: boolean }) => Promise<IpcResult<CommandResult>>
    remove: (opts: {
      packageRef: string
      agent?: string
      global?: boolean
    }) => Promise<IpcResult<CommandResult>>
    updateBackground: (opts: {
      packageRef: string
      global?: boolean
    }) => Promise<{ taskId: string; error?: string }>
    updateAllBackground: (opts?: {
      global?: boolean
    }) => Promise<{ taskId: string; error?: string }>
    parseGitHub: (url: string) => Promise<IpcResult<GitHubParseResult>>
    selectArchive: () => Promise<IpcResult<string>>
    extractArchive: (filePath: string) => Promise<IpcResult<ArchiveScanResult>>
    installLocal: (opts: {
      skillDirs: string[]
      agents: string[]
    }) => Promise<IpcResult<LocalInstallResult>>
    cancelGitHubDownload: () => Promise<void>
    cleanupTemp: (tempDirs: string[]) => Promise<void>
    onGitHubDownloadProgress: (callback: (percent: number) => void) => () => void
  }
  agents: {
    scanAll: () => Promise<IpcResult<AgentScanResult[]>>
    scanOne: (agentFlag: string) => Promise<IpcResult<AgentScanResult | null>>
  }
  shell: {
    openPath: (path: string) => Promise<{ success: boolean; error?: string }>
  }
  env: {
    check: () => Promise<EnvStatus>
    installNode: () => Promise<{ success: boolean; error?: string }>
    installSkills: () => Promise<{ success: boolean; error?: string; stdout?: string }>
    cancelInstallNode: () => Promise<void>
    onDownloadProgress: (callback: (percent: number) => void) => () => void
  }
  store: {
    getSettings: () => Promise<AppSettings>
    setSettings: (partial: Record<string, unknown>) => Promise<void>
  }
  network: {
    onStatusChange: (callback: (online: boolean) => void) => () => void
  }
  tasks: {
    start: (opts: { type: BackgroundTask['type'] }) => Promise<{ taskId: string; error?: string }>
    cancel: (taskId: string) => Promise<void>
    retry: (opts: { taskId: string }) => Promise<{ ok: boolean; error?: string }>
    retrySkillUpdate: (opts: { taskId: string }) => Promise<{ ok: boolean; error?: string }>
    getAll: () => Promise<BackgroundTask[]>
    onUpdate: (callback: (task: BackgroundTask) => void) => () => void
  }
  window: {
    openSettings: () => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppApi
  }
}
