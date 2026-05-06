import type { ElectronAPI } from '@electron-toolkit/preload'
import type {
  EnvStatus,
  Skill,
  AppSettings,
  CommandResult,
  SkillSearchResponse,
  CommandErrorInfo,
  AgentScanResult
} from '../shared/types'

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: CommandErrorInfo }

export interface AppApi {
  skills: {
    search: (keyword: string) => Promise<IpcResult<SkillSearchResponse>>
    list: (opts?: { global?: boolean }) => Promise<IpcResult<Skill[]>>
    install: (opts: {
      packageRef: string
      agents: string[]
      global?: boolean
    }) => Promise<IpcResult<CommandResult>>
    installStreaming: (opts: {
      packageRef: string
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
    onDownloadProgress: (callback: (percent: number) => void) => () => void
  }
  store: {
    getSettings: () => Promise<AppSettings>
    setSettings: (partial: Record<string, unknown>) => Promise<void>
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
