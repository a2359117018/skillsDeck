import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  LocalInstallResult,
  GitHubParseResult,
  ArchiveScanResult,
  IpcResult,
  SkillDoc
} from '../shared/types'

const api = {
  /** 从拖拽的 File 对象获取本地文件路径（contextIsolation 兼容） */
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  skills: {
    search: (keyword: string): Promise<unknown> => ipcRenderer.invoke('skills:search', keyword),
    list: (): Promise<unknown[]> => ipcRenderer.invoke('skills:list'),
    install: (opts: { source: string; agents: string[]; global?: boolean }): Promise<unknown> =>
      ipcRenderer.invoke('skills:install', opts),
    installStreaming: (opts: {
      source: string
      agents: string[]
      global?: boolean
    }): Promise<unknown> => ipcRenderer.invoke('skills:install-streaming', opts),
    onInstallOutput: (callback: (text: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, text: string): void => callback(text)
      ipcRenderer.on('skills:install-output', listener)
      return () => ipcRenderer.removeListener('skills:install-output', listener)
    },
    cancelInstall: (): Promise<void> => ipcRenderer.invoke('skills:install-cancel'),
    update: (opts: { packageRef: string; global?: boolean }): Promise<unknown> =>
      ipcRenderer.invoke('skills:update', opts),
    updateAll: (opts?: { global?: boolean }): Promise<unknown> =>
      ipcRenderer.invoke('skills:update-all', opts),
    remove: (opts: { packageRef: string; agent?: string; global?: boolean }): Promise<unknown> =>
      ipcRenderer.invoke('skills:remove', opts),
    updateBackground: (opts: {
      packageRef: string
      global?: boolean
    }): Promise<{ taskId: string; error?: string }> =>
      ipcRenderer.invoke('skills:update-background', opts),
    updateAllBackground: (opts?: {
      global?: boolean
    }): Promise<{ taskId: string; error?: string }> =>
      ipcRenderer.invoke('skills:update-all-background', opts),
    removeBatchBackground: (opts: {
      packageRefs: string[]
      agentFlag?: string
    }): Promise<{ taskId: string; error?: string }> =>
      ipcRenderer.invoke('skills:remove-batch-background', opts),
    parseGitHub: (url: string): Promise<IpcResult<GitHubParseResult>> =>
      ipcRenderer.invoke('skills:parse-github', url),
    selectArchive: (): Promise<IpcResult<string>> => ipcRenderer.invoke('skills:select-archive'),
    extractArchive: (filePath: string): Promise<IpcResult<ArchiveScanResult>> =>
      ipcRenderer.invoke('skills:extract-archive', filePath),
    installLocal: (opts: {
      skillDirs: string[]
      agents: string[]
    }): Promise<IpcResult<LocalInstallResult>> => ipcRenderer.invoke('skills:install-local', opts),
    readDoc: (name: string): Promise<IpcResult<SkillDoc>> =>
      ipcRenderer.invoke('skills:read-doc', name),
    cancelGitHubDownload: (): Promise<void> => ipcRenderer.invoke('skills:cancel-github-download'),
    cleanupTemp: (tempDirs: string[]): Promise<void> =>
      ipcRenderer.invoke('skills:cleanup-temp', tempDirs),
    onGitHubDownloadProgress: (callback: (percent: number) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, percent: number): void =>
        callback(percent)
      ipcRenderer.on('skills:github-download-progress', listener)
      return () => ipcRenderer.removeListener('skills:github-download-progress', listener)
    }
  },
  agents: {
    scanAll: (): Promise<unknown> => ipcRenderer.invoke('agent:scan-all'),
    scanOne: (agentFlag: string): Promise<unknown> =>
      ipcRenderer.invoke('agent:scan-one', agentFlag)
  },
  shell: {
    openPath: (path: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('shell:open-path', path)
  },
  env: {
    check: (): Promise<unknown> => ipcRenderer.invoke('env:check'),
    installNode: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('env:install-node'),
    installSkills: (): Promise<{ success: boolean; error?: string; stdout?: string }> =>
      ipcRenderer.invoke('env:install-skills'),
    cancelInstallNode: (): Promise<void> => ipcRenderer.invoke('env:cancel-install-node'),
    onDownloadProgress: (callback: (percent: number) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, percent: number): void =>
        callback(percent)
      ipcRenderer.on('env:download-progress', listener)
      return () => ipcRenderer.removeListener('env:download-progress', listener)
    }
  },
  store: {
    getSettings: (): Promise<unknown> => ipcRenderer.invoke('store:get-settings'),
    setSettings: (partial: Record<string, unknown>): Promise<void> =>
      ipcRenderer.invoke('store:set-settings', partial)
  },
  network: {
    onStatusChange: (callback: (online: boolean) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, online: boolean): void =>
        callback(online)
      ipcRenderer.on('network:status', listener)
      return () => ipcRenderer.removeListener('network:status', listener)
    }
  },
  tasks: {
    start: (opts: { type: string }): Promise<{ taskId: string; error?: string }> =>
      ipcRenderer.invoke('tasks:start', opts),
    cancel: (taskId: string): Promise<void> => ipcRenderer.invoke('tasks:cancel', taskId),
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('tasks:get-all'),
    retry: (opts: { taskId: string }): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('tasks:retry', opts),
    retrySkillUpdate: (opts: { taskId: string }): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('tasks:retry-skill-update', opts),
    onUpdate: (callback: (task: unknown) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, task: unknown): void => callback(task)
      ipcRenderer.on('tasks:update', listener)
      return () => ipcRenderer.removeListener('tasks:update', listener)
    }
  },
  window: {
    openSettings: (): Promise<void> => ipcRenderer.invoke('window:open-settings')
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version')
  },
  updater: {
    check: (): Promise<void> => ipcRenderer.invoke('updater:check'),
    installUpdate: (): Promise<void> => ipcRenderer.invoke('updater:install-update'),
    onUpdateAvailable: (callback: (info: { version: string }) => void): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        info: { version: string }
      ): void => callback(info)
      ipcRenderer.on('updater:update-available', listener)
      return () => ipcRenderer.removeListener('updater:update-available', listener)
    },
    onUpdateNotAvailable: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('updater:update-not-available', listener)
      return () => ipcRenderer.removeListener('updater:update-not-available', listener)
    },
    onDownloadProgress: (callback: (percent: number) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, percent: number): void =>
        callback(percent)
      ipcRenderer.on('updater:download-progress', listener)
      return () => ipcRenderer.removeListener('updater:download-progress', listener)
    },
    onUpdateDownloaded: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('updater:update-downloaded', listener)
      return () => ipcRenderer.removeListener('updater:update-downloaded', listener)
    },
    onError: (callback: (message: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, message: string): void =>
        callback(message)
      ipcRenderer.on('updater:error', listener)
      return () => ipcRenderer.removeListener('updater:error', listener)
    }
  },
  close: {
    onPrompt: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('close:prompt', listener)
      return () => ipcRenderer.removeListener('close:prompt', listener)
    },
    action: (opts: { action: 'tray' | 'quit'; remember: boolean }): Promise<void> =>
      ipcRenderer.invoke('close:action', opts)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
