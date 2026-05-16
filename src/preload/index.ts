import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
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
    parseGitHub: (url: string): Promise<unknown> => ipcRenderer.invoke('skills:parse-github', url),
    selectArchive: (): Promise<unknown> => ipcRenderer.invoke('skills:select-archive'),
    extractArchive: (filePath: string): Promise<unknown> =>
      ipcRenderer.invoke('skills:extract-archive', filePath),
    installLocal: (opts: { skillDirs: string[]; agents: string[] }): Promise<unknown> =>
      ipcRenderer.invoke('skills:install-local', opts),
    cancelGitHubDownload: (): Promise<void> => ipcRenderer.invoke('skills:cancel-github-download'),
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
  tasks: {
    start: (opts: { type: string }): Promise<{ taskId: string; error?: string }> =>
      ipcRenderer.invoke('tasks:start', opts),
    cancel: (taskId: string): Promise<void> => ipcRenderer.invoke('tasks:cancel', taskId),
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('tasks:get-all'),
    onUpdate: (callback: (task: unknown) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, task: unknown): void => callback(task)
      ipcRenderer.on('tasks:update', listener)
      return () => ipcRenderer.removeListener('tasks:update', listener)
    }
  },
  window: {
    openSettings: (): Promise<void> => ipcRenderer.invoke('window:open-settings')
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
