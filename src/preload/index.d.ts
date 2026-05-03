import { ElectronAPI } from '@electron-toolkit/preload'

export interface AppApi {
  skills: {
    search: (keyword: string) => Promise<string>
    list: (opts?: { global?: boolean; agent?: string }) => Promise<any[]>
    install: (opts: { packageRef: string; agents: string[]; global?: boolean }) => Promise<any>
    update: (opts: { name: string; global?: boolean }) => Promise<any>
    updateAll: (opts?: { global?: boolean }) => Promise<any>
    remove: (opts: { name: string; agent?: string; global?: boolean }) => Promise<any>
  }
  env: {
    check: () => Promise<any>
    installNode: () => Promise<{ success: boolean; error?: string }>
    onDownloadProgress: (callback: (percent: number) => void) => () => void
  }
  store: {
    getSettings: () => Promise<any>
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
