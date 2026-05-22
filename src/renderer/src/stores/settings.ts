import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCachedResource } from '../composables/useCachedResource'

export const useSettingsStore = defineStore('settings', () => {
  const settingsCache = useCachedResource(() => window.api.store.getSettings(), {
    autoCheckEnv: true,
    proxyUrl: '',
    npmRegistry: 'https://npmmirror.com/mirrors/npm/'
  })

  const autoCheckEnv = ref(true)
  const proxyUrl = ref('')
  const npmRegistry = ref('')
  const error = ref<string | null>(null)
  const fetching = computed(() => settingsCache.loading.value)
  const loading = fetching

  const refreshing = computed(() => settingsCache.refreshing.value)

  async function load(): Promise<void> {
    try {
      const data = await settingsCache.ensure()
      autoCheckEnv.value = data.autoCheckEnv
      proxyUrl.value = data.proxyUrl || ''
      npmRegistry.value = data.npmRegistry || ''
      error.value = null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '设置加载失败'
    }
  }

  async function save(partial: {
    autoCheckEnv?: boolean
    proxyUrl?: string
    npmRegistry?: string
  }): Promise<void> {
    try {
      await window.api.store.setSettings(partial)
      settingsCache.invalidate()
      await load()
      error.value = null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '设置保存失败'
      throw e
    }
  }

  return {
    autoCheckEnv,
    proxyUrl,
    npmRegistry,
    loading,
    fetching,
    refreshing,
    error,
    load,
    save
  }
})
