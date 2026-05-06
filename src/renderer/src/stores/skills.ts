import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Skill, CommandResult, SkillSearchResult } from '../../../shared/types'
import { useCachedResource } from '../composables/useCachedResource'

function extractError(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return (e as { message: string }).message
  }
  return String(e)
}

function unwrapResult<T>(result: { ok: true; data: T } | { ok: false; error: { message: string } }): T {
  if (result.ok) return result.data
  throw new Error(result.error.message)
}

export const useSkillsStore = defineStore('skills', () => {
  const installedCache = useCachedResource<Skill[]>(
    async () => unwrapResult(await window.api.skills.list({ global: true })),
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
  const _openLocationMessage = ref<
    ((msg: string, type: 'success' | 'warning' | 'error') => void) | null
  >(null)

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

  function setMessageHandler(
    handler: (msg: string, type: 'success' | 'warning' | 'error') => void
  ): void {
    _openLocationMessage.value = handler
  }

  async function search(keyword: string): Promise<void> {
    searching.value = true
    error.value = null
    try {
      const result = await window.api.skills.search(keyword)
      const response = unwrapResult(result)
      _searchResults.value = response.skills
      _searchDuration.value = response.duration_ms
    } catch (e) {
      error.value = extractError(e)
      _searchResults.value = []
      _searchDuration.value = 0
    } finally {
      searching.value = false
    }
  }

  async function fetchInstalled(_global?: boolean): Promise<void> {
    void _global
    await installedCache.ensure()
  }

  async function doInstall(
    packageRef: string,
    agents: string[],
    isGlobal: boolean,
    streaming: boolean
  ): Promise<CommandResult> {
    installing.value = true
    error.value = null
    try {
      const opts = { packageRef, agents: [...agents], global: isGlobal }
      const result = streaming
        ? await window.api.skills.installStreaming(opts)
        : await window.api.skills.install(opts)
      const data = unwrapResult(result)
      installedCache.invalidate()
      return data
    } catch (e) {
      error.value = extractError(e)
      throw e
    } finally {
      installing.value = false
    }
  }

  async function install(
    packageRef: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
    return doInstall(packageRef, agents, isGlobal, false)
  }

  async function installStreaming(
    packageRef: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
    return doInstall(packageRef, agents, isGlobal, true)
  }

  async function update(packageRef: string, global?: boolean): Promise<CommandResult> {
    updating.value = true
    error.value = null
    try {
      const result = await window.api.skills.update({ packageRef, global })
      const data = unwrapResult(result)
      installedCache.invalidate()
      return data
    } catch (e) {
      error.value = extractError(e)
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
      const data = unwrapResult(result)
      installedCache.invalidate()
      return data
    } catch (e) {
      error.value = extractError(e)
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
      const data = unwrapResult(result)
      installedCache.invalidate()
      return data
    } catch (e) {
      error.value = extractError(e)
      throw e
    } finally {
      removing.value = false
    }
  }

  async function openLocation(path: string): Promise<void> {
    try {
      const result = await window.api.shell.openPath(path)
      if (!result.success && _openLocationMessage.value) {
        _openLocationMessage.value(result.error || '无法打开路径', 'warning')
      }
    } catch (e) {
      error.value = extractError(e)
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
    setMessageHandler,
    search,
    fetchInstalled,
    install,
    installStreaming,
    update,
    updateAll,
    remove,
    openLocation
  }
})
