import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  InstalledSkill,
  CommandResult,
  SkillSearchResult,
  AgentScanResult
} from '../../../shared/types'
import { useCachedResource } from '../composables/useCachedResource'

function extractError(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return (e as { message: string }).message
  }
  return String(e)
}

function unwrapResult<T>(
  result: { ok: true; data: T } | { ok: false; error: { message: string } }
): T {
  if (result.ok) return result.data
  throw new Error(result.error.message)
}

export const useSkillsStore = defineStore('skills', () => {
  const installedCache = useCachedResource<InstalledSkill[]>(
    async () => unwrapResult(await window.api.skills.list()),
    []
  )

  const selectedAgents = ref<string[]>([])
  const searchKeyword = ref('')
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

  const agentScanCache = useCachedResource<AgentScanResult[]>(
    async () => unwrapResult(await window.api.agents.scanAll()),
    []
  )

  const filteredSkills = computed(() => {
    let skills = installedCache.data.value

    if (selectedAgents.value.length > 0) {
      const lowered = selectedAgents.value.map((a) => a.toLowerCase())
      skills = skills.filter((s) => s.agents.some((a) => lowered.includes(a.name.toLowerCase())))
    }

    if (searchKeyword.value) {
      const kw = searchKeyword.value.toLowerCase()
      skills = skills.filter((s) => s.name.toLowerCase().includes(kw))
    }

    return skills
  })

  const sortedAgentResults = computed(() =>
    [...(agentScanCache.data.value || [])].sort((a, b) => b.count - a.count)
  )

  const searchResults = computed(() => _searchResults.value)
  const searchDuration = computed(() => _searchDuration.value)

  function clearError(): void {
    error.value = null
  }

  function setSearchKeyword(keyword: string): void {
    searchKeyword.value = keyword
  }

  function toggleAgent(agentFlag: string): void {
    const idx = selectedAgents.value.indexOf(agentFlag)
    if (idx >= 0) {
      selectedAgents.value = selectedAgents.value.filter((a) => a !== agentFlag)
    } else {
      selectedAgents.value = [...selectedAgents.value, agentFlag]
    }
  }

  function clearAgentFilter(): void {
    selectedAgents.value = []
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
    installedCache.invalidate()
    agentScanCache.invalidate()
    await Promise.all([installedCache.ensure(), agentScanCache.ensure()])
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

  async function remove(
    packageRef: string,
    global?: boolean,
    agent?: string
  ): Promise<CommandResult> {
    removing.value = true
    error.value = null
    try {
      const result = await window.api.skills.remove({ packageRef, global, agent })
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
    sortedAgentResults,
    fetching,
    searching,
    installing,
    updating,
    updatingAll,
    removing,
    loading,
    error,
    searchKeyword,
    clearError,
    setSearchKeyword,
    toggleAgent,
    clearAgentFilter,
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
