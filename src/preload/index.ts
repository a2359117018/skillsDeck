import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  skills: {
    search: (keyword: string): Promise<unknown> => ipcRenderer.invoke('skills:search', keyword),
    list: (opts?: { global?: boolean }): Promise<unknown[]> =>
      ipcRenderer.invoke('skills:list', opts),
    install: (opts: { packageRef: string; agents: string[]; global?: boolean }): Promise<unknown> =>
      ipcRenderer.invoke('skills:install', opts),
    update: (opts: { packageRef: string; global?: boolean }): Promise<unknown> =>
      ipcRenderer.invoke('skills:update', opts),
    updateAll: (opts?: { global?: boolean }): Promise<unknown> =>
      ipcRenderer.invoke('skills:update-all', opts),
    remove: (opts: { packageRef: string; agent?: string; global?: boolean }): Promise<unknown> =>
      ipcRenderer.invoke('skills:remove', opts)
  },
  shell: {
    openPath: (path: string): Promise<void> => ipcRenderer.invoke('shell:open-path', path)
  },
  env: {
    check: (): Promise<unknown> => ipcRenderer.invoke('env:check'),
    installNode: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('env:install-node'),
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
