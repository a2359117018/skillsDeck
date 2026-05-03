import type { ElectronAPI } from '@electron-toolkit/preload'
import type { EnvStatus, Skill, AppSettings, CommandResult } from '../shared/types'

export interface AppApi {
  skills: {
    search: (keyword: string) => Promise<string>
    list: (opts?: { global?: boolean; agent?: string }) => Promise<Skill[]>
    install: (opts: { packageRef: string; agents: string[]; global?: boolean }) => Promise<CommandResult>
    update: (opts: { packageRef: string; global?: boolean }) => Promise<CommandResult>
    updateAll: (opts?: { global?: boolean }) => Promise<CommandResult>
    remove: (opts: { packageRef: string; agent?: string; global?: boolean }) => Promise<CommandResult>
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
