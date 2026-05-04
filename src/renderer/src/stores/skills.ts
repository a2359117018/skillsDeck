import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Skill, CommandResult, SkillSearchResult } from '../../../shared/types'

export const useSkillsStore = defineStore('skills', () => {
  const searchResults = ref<SkillSearchResult[]>([])
  const searchDuration = ref(0)
  const installedSkills = ref<Skill[]>([])
  const selectedAgents = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const filteredSkills = computed(() => {
    if (selectedAgents.value.length === 0) return installedSkills.value
    const lowered = selectedAgents.value.map((a) => a.toLowerCase())
    return installedSkills.value.filter((skill) =>
      skill.agents.some((a) => lowered.includes(a.toLowerCase()))
    )
  })

  function clearError(): void {
    error.value = null
  }

  async function search(keyword: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await window.api.skills.search(keyword)
      searchResults.value = response.skills
      searchDuration.value = response.duration_ms
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed'
      searchResults.value = []
      searchDuration.value = 0
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

  async function install(
    packageRef: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
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

  async function update(packageRef: string, global?: boolean): Promise<CommandResult> {
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

  async function updateAll(global?: boolean): Promise<CommandResult> {
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

  async function remove(packageRef: string, global?: boolean): Promise<CommandResult> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.remove({ packageRef, global })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Remove failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function openLocation(path: string): Promise<void> {
    try {
      await window.api.shell.openPath(path)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to open location'
    }
  }

  return {
    searchResults,
    searchDuration,
    installedSkills,
    selectedAgents,
    filteredSkills,
    loading,
    error,
    clearError,
    search,
    fetchInstalled,
    install,
    update,
    updateAll,
    remove,
    openLocation
  }
})
