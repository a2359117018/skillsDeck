import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSkillsStore = defineStore('skills', () => {
  const searchOutput = ref('')
  const installedSkills = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function clearError() {
    error.value = null
  }

  async function search(keyword: string) {
    loading.value = true
    error.value = null
    try {
      searchOutput.value = await window.api.skills.search(keyword)
    } catch (e: any) {
      error.value = e.message || 'Search failed'
    } finally {
      loading.value = false
    }
  }

  async function fetchInstalled(global?: boolean) {
    loading.value = true
    error.value = null
    try {
      installedSkills.value = await window.api.skills.list({ global })
    } catch (e: any) {
      error.value = e.message || 'Failed to load skills'
    } finally {
      loading.value = false
    }
  }

  async function install(packageRef: string, agents: string[], isGlobal: boolean) {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.install({ packageRef, agents, global: isGlobal })
    } catch (e: any) {
      error.value = e.message || 'Install failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(packageRef: string) {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.update({ packageRef })
    } catch (e: any) {
      error.value = e.message || 'Update failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(packageRef: string) {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.remove({ packageRef })
    } catch (e: any) {
      error.value = e.message || 'Remove failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    searchOutput,
    installedSkills,
    loading,
    error,
    clearError,
    search,
    fetchInstalled,
    install,
    update,
    remove
  }
})
