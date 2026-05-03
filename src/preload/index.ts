import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  skills: {
    search: (keyword: string) => ipcRenderer.invoke('skills:search', keyword),
    list: (opts?: { global?: boolean; agent?: string }) =>
      ipcRenderer.invoke('skills:list', opts),
    install: (opts: { packageRef: string; agents: string[]; global?: boolean }) =>
      ipcRenderer.invoke('skills:install', opts),
    update: (opts: { packageRef: string; global?: boolean }) =>
      ipcRenderer.invoke('skills:update', opts),
    updateAll: (opts?: { global?: boolean }) =>
      ipcRenderer.invoke('skills:update-all', opts),
    remove: (opts: { packageRef: string; agent?: string; global?: boolean }) =>
      ipcRenderer.invoke('skills:remove', opts)
  },
  env: {
    check: () => ipcRenderer.invoke('env:check'),
    installNode: () => ipcRenderer.invoke('env:install-node'),
    onDownloadProgress: (callback: (percent: number) => void) => {
      const listener = (_: any, percent: number) => callback(percent)
      ipcRenderer.on('env:download-progress', listener)
      return () => ipcRenderer.removeListener('env:download-progress', listener)
    }
  },
  store: {
    getSettings: () => ipcRenderer.invoke('store:get-settings'),
    setSettings: (partial: Record<string, unknown>) =>
      ipcRenderer.invoke('store:set-settings', partial)
  },
  window: {
    openSettings: () => ipcRenderer.invoke('window:open-settings')
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
