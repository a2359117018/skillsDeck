import Store from 'electron-store'
import type { AppSettings, EnvStatus } from '../../shared/types'

interface StoreSchema {
  settings: AppSettings
  envStatus: EnvStatus | null
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultAgent: 'claude-code',
  autoCheckEnv: true,
  proxyUrl: '',
  npmRegistry: 'https://registry.npmmirror.com/'
}

let store: Store<StoreSchema> | null = null
const inMemoryFallback: StoreSchema = {
  settings: { ...DEFAULT_SETTINGS },
  envStatus: null
}

/**
 * Initialize and return the electron-store instance
 * Falls back to in-memory storage if initialization fails
 * @returns Store instance or in-memory fallback
 */
function getStore(): Store<StoreSchema> {
  if (!store) {
    try {
      store = new Store<StoreSchema>({
        defaults: {
          settings: { ...DEFAULT_SETTINGS },
          envStatus: null
        }
      })
    } catch (error) {
      console.error('Failed to initialize electron-store, using in-memory fallback:', error)
    }
  }
  return store as Store<StoreSchema>
}

/**
 * Get current application settings
 * @returns Current application settings
 */
export function getSettings(): AppSettings {
  try {
    return getStore().get('settings')
  } catch {
    return inMemoryFallback.settings
  }
}

/**
 * Update application settings with partial object
 * @param partial - Partial settings object to merge
 */
export function setSettings(partial: Partial<AppSettings>): void {
  try {
    const current = getStore().get('settings')
    getStore().set('settings', { ...current, ...partial })
  } catch {
    inMemoryFallback.settings = { ...inMemoryFallback.settings, ...partial }
  }
}

/**
 * Get cached environment status
 * @returns Environment status or null if not checked
 */
export function getEnvStatus(): EnvStatus | null {
  try {
    return getStore().get('envStatus')
  } catch {
    return inMemoryFallback.envStatus
  }
}

/**
 * Save environment status to store
 * @param status - Environment status to save
 */
export function setEnvStatus(status: EnvStatus): void {
  try {
    getStore().set('envStatus', status)
  } catch {
    inMemoryFallback.envStatus = status
  }
}
