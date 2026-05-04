import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCachedResource } from '../composables/useCachedResource'

export const useSettingsStore = defineStore('settings', () => {
  const settingsCache = useCachedResource(() => window.api.store.getSettings(), {
    defaultAgent: 'claude-code',
    autoCheckEnv: true
  })

  const defaultAgent = ref('claude-code')
  const autoCheckEnv = ref(true)
  const error = ref<string | null>(null)
  const fetching = computed(() => settingsCache.loading.value)
  const loading = fetching

  async function load(): Promise<void> {
    try {
      const data = await settingsCache.ensure()
      defaultAgent.value = data.defaultAgent
      autoCheckEnv.value = data.autoCheckEnv
      error.value = null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load settings'
    }
  }

  async function save(partial: { defaultAgent?: string; autoCheckEnv?: boolean }): Promise<void> {
    try {
      await window.api.store.setSettings(partial)
      settingsCache.invalidate()
      await load()
      error.value = null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to save settings'
      throw e
    }
  }

  return { defaultAgent, autoCheckEnv, loading, fetching, error, load, save }
})
