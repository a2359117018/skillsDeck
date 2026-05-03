import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEnvStore = defineStore('env', () => {
  const status = ref<any>(null)
  const checking = ref(false)
  const downloading = ref(false)
  const downloadProgress = ref(0)
  const error = ref<string | null>(null)

  async function check() {
    checking.value = true
    error.value = null
    try {
      status.value = await window.api.env.check()
    } catch (e: any) {
      error.value = e.message || 'Environment check failed'
    } finally {
      checking.value = false
    }
  }

  async function installNode() {
    downloading.value = true
    downloadProgress.value = 0
    error.value = null
    try {
      const result = await window.api.env.installNode()
      if (!result.success) throw new Error(result.error)
      await check()
    } catch (e: any) {
      error.value = e.message || 'Node.js install failed'
    } finally {
      downloading.value = false
    }
  }

  return {
    status,
    checking,
    downloading,
    downloadProgress,
    error,
    check,
    installNode
  }
})
