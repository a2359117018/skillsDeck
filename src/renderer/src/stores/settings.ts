import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const defaultAgent = ref('claude-code')
  const autoCheckEnv = ref(true)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const settings = await window.api.store.getSettings()
      defaultAgent.value = settings.defaultAgent
      autoCheckEnv.value = settings.autoCheckEnv
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load settings'
    } finally {
      loading.value = false
    }
  }

  async function save(partial: { defaultAgent?: string; autoCheckEnv?: boolean }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await window.api.store.setSettings(partial)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to save settings'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { defaultAgent, autoCheckEnv, loading, error, load, save }
})
