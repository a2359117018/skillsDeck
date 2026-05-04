import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Skill, CommandResult, SkillSearchResult } from '../../../shared/types'
import { useCachedResource } from '../composables/useCachedResource'

export const useSkillsStore = defineStore('skills', () => {
  const installedCache = useCachedResource<Skill[]>(
    () => window.api.skills.list({ global: true }),
    []
  )

  const selectedAgents = ref<string[]>([])
  const _searchResults = ref<SkillSearchResult[]>([])
  const _searchDuration = ref(0)
  const installing = ref(false)
  const updating = ref(false)
  const updatingAll = ref(false)
  const removing = ref(false)
  const searching = ref(false)
  const error = ref<string | null>(null)

  const fetching = computed(() => installedCache.loading.value)
  const installedSkills = computed(() => installedCache.data.value)

  const loading = computed(() => fetching.value || searching.value)

  const filteredSkills = computed(() => {
    if (selectedAgents.value.length === 0) return installedSkills.value
    const lowered = selectedAgents.value.map((a) => a.toLowerCase())
    return installedSkills.value.filter((skill) =>
      skill.agents.some((a) => lowered.includes(a.toLowerCase()))
    )
  })

  const searchResults = computed(() => _searchResults.value)
  const searchDuration = computed(() => _searchDuration.value)

  function clearError(): void {
    error.value = null
  }

  async function search(keyword: string): Promise<void> {
    searching.value = true
    error.value = null
    try {
      const response = await window.api.skills.search(keyword)
      _searchResults.value = response.skills
      _searchDuration.value = response.duration_ms
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed'
      _searchResults.value = []
      _searchDuration.value = 0
    } finally {
      searching.value = false
    }
  }

  async function fetchInstalled(_global?: boolean): Promise<void> {
    await installedCache.ensure()
  }

  async function install(
    packageRef: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
    installing.value = true
    error.value = null
    try {
      const result = await window.api.skills.install({ packageRef, agents, global: isGlobal })
      installedCache.invalidate()
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Install failed'
      throw e
    } finally {
      installing.value = false
    }
  }

  async function update(packageRef: string, global?: boolean): Promise<CommandResult> {
    updating.value = true
    error.value = null
    try {
      const result = await window.api.skills.update({ packageRef, global })
      installedCache.invalidate()
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update failed'
      throw e
    } finally {
      updating.value = false
    }
  }

  async function updateAll(global?: boolean): Promise<CommandResult> {
    updatingAll.value = true
    error.value = null
    try {
      const result = await window.api.skills.updateAll({ global })
      installedCache.invalidate()
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update all failed'
      throw e
    } finally {
      updatingAll.value = false
    }
  }

  async function remove(packageRef: string, global?: boolean): Promise<CommandResult> {
    removing.value = true
    error.value = null
    try {
      const result = await window.api.skills.remove({ packageRef, global })
      installedCache.invalidate()
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Remove failed'
      throw e
    } finally {
      removing.value = false
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
    fetching,
    searching,
    installing,
    updating,
    updatingAll,
    removing,
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
