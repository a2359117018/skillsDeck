import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EnvStatus } from '../../../shared/types'
import { useCachedResource } from '../composables/useCachedResource'

export const useEnvStore = defineStore('env', () => {
  const statusCache = useCachedResource<EnvStatus>(() => window.api.env.check(), {
    nodeInstalled: false,
    nodeVersion: null,
    npmInstalled: false,
    npmVersion: null,
    skillsInstalled: false,
    skillsVersion: null
  })

  const downloading = ref(false)
  const downloadProgress = ref(0)
  const error = ref<string | null>(null)

  const status = computed(() => statusCache.data.value)
  const fetching = computed(() => statusCache.loading.value)
  const checking = fetching

  async function check(): Promise<void> {
    try {
      await statusCache.ensure()
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Environment check failed'
    }
  }

  async function installNode(): Promise<void> {
    downloading.value = true
    downloadProgress.value = 0
    error.value = null
    try {
      const result = await window.api.env.installNode()
      if (!result.success) throw new Error(result.error)
      statusCache.invalidate()
      await check()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Node.js install failed'
    } finally {
      downloading.value = false
    }
  }

  return {
    status,
    fetching,
    checking,
    downloading,
    downloadProgress,
    error,
    check,
    installNode
  }
})
