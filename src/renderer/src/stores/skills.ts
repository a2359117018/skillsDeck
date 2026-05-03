import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Skill } from '../../../shared/types'

export const useSkillsStore = defineStore('skills', () => {
  const searchOutput = ref('')
  const installedSkills = ref<Skill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function clearError(): void {
    error.value = null
  }

  async function search(keyword: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      searchOutput.value = await window.api.skills.search(keyword)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed'
    } finally {
      loading.value = false
    }
  }

  async function fetchInstalled(global?: boolean): Promise<void> {
    loading.value = true
    error.value = null
    try {
      installedSkills.value = await window.api.skills.list({ global })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load skills'
    } finally {
      loading.value = false
    }
  }

  async function install(packageRef: string, agents: string[], isGlobal: boolean): Promise<unknown> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.install({ packageRef, agents, global: isGlobal })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Install failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(packageRef: string, global?: boolean): Promise<unknown> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.update({ packageRef, global })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateAll(global?: boolean): Promise<unknown> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.updateAll({ global })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update all failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(packageRef: string): Promise<unknown> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.remove({ packageRef })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Remove failed'
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
    updateAll,
    remove
  }
})
