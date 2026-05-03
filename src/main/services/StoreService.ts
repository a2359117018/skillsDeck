import Store from 'electron-store'
import type { AppSettings, EnvStatus } from '../../shared/types'

interface StoreSchema {
  settings: AppSettings
  envStatus: EnvStatus | null
}

let store: Store<StoreSchema> | null = null

function getStore(): Store<StoreSchema> {
  if (!store) {
    store = new Store<StoreSchema>({
      defaults: {
        settings: {
          defaultAgent: 'claude-code',
          autoCheckEnv: true
        },
        envStatus: null
      }
    })
  }
  return store
}

export function getSettings(): AppSettings {
  return getStore().get('settings')
}

export function setSettings(partial: Partial<AppSettings>): void {
  const current = getStore().get('settings')
  getStore().set('settings', { ...current, ...partial })
}

export function getEnvStatus(): EnvStatus | null {
  return getStore().get('envStatus')
}

export function setEnvStatus(status: EnvStatus): void {
  getStore().set('envStatus', status)
}
