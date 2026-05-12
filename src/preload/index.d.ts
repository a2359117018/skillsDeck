import type { ElectronAPI } from '@electron-toolkit/preload'
import type {
  EnvStatus,
  AppSettings,
  CommandResult,
  SkillSearchResponse,
  CommandErrorInfo,
  InstalledSkill,
  AgentScanResult,
  BackgroundTask
} from '../shared/types'

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: CommandErrorInfo }

export interface AppApi {
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
  tasks: {
    start: (opts: { type: BackgroundTask['type'] }) => Promise<{ taskId: string; error?: string }>
    cancel: (taskId: string) => Promise<void>
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
