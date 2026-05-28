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

/**
 * 管理技能数据获取与操作的 Store。
 *
 * 职责：
 * - 已安装技能列表的获取与缓存 (`installedSkills`)
 * - 搜索结果 (`searchResults`)
 * - Agent 扫描结果 (`sortedAgentResults`)
 * - 安装、删除、更新等操作
 *
 * 不包含 UI 过滤状态（如搜索关键词、Agent 筛选），这些由 useSkillsFilterStore 管理。
 */
export const useSkillsDataStore = defineStore('skillsData', () => {
  const installedCache = useCachedResource<InstalledSkill[]>(
    async () => unwrapResult(await window.api.skills.list()),
    []
  )

  const _searchResults = ref<SkillSearchResult[]>([])
  const installing = ref(false)
  const removing = ref(false)
  const searching = ref(false)
  const error = ref<string | null>(null)

  const agentScanCache = useCachedResource<AgentScanResult[]>(
    async () => unwrapResult(await window.api.agents.scanAll()),
    []
  )

  const fetching = computed(() => installedCache.loading.value)
  const installedSkills = computed(() => installedCache.data.value)

  const loading = computed(() => fetching.value || searching.value)

  const refreshing = computed(
    () => installedCache.refreshing.value || agentScanCache.refreshing.value
  )

  const sortedAgentResults = computed(() =>
    [...(agentScanCache.data.value || [])].sort((a, b) => b.count - a.count)
  )

  const searchResults = computed(() => _searchResults.value)

  function clearError(): void {
    error.value = null
  }

  async function search(keyword: string): Promise<void> {
    searching.value = true
    error.value = null
    try {
      const result = await window.api.skills.search(keyword)
      const response = unwrapResult(result)
      _searchResults.value = response.skills
    } catch (e) {
      error.value = extractError(e)
      _searchResults.value = []
    } finally {
      searching.value = false
    }
  }

  async function fetchInstalled(): Promise<void> {
    installedCache.invalidate()
    agentScanCache.invalidate()
    await Promise.all([installedCache.ensure(), agentScanCache.ensure()])
  }

  async function doInstall(
    source: string,
    agents: string[],
    isGlobal: boolean,
    streaming: boolean
  ): Promise<CommandResult> {
    installing.value = true
    error.value = null
    try {
      const opts = { source, agents: [...agents], global: isGlobal }
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
    source: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
    return doInstall(source, agents, isGlobal, false)
  }

  async function installStreaming(
    source: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
    return doInstall(source, agents, isGlobal, true)
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
      await window.api.shell.openPath(path)
    } catch (e) {
      error.value = extractError(e)
    }
  }

  return {
    searchResults,
    installedSkills,
    fetching,
    searching,
    installing,
    removing,
    loading,
    refreshing,
    error,
    search,
    fetchInstalled,
    install,
    installStreaming,
    remove,
    openLocation,
    sortedAgentResults,
    clearError
  }
})

// ---- 向后兼容：保留组合式 useSkillsStore ----

import { useSkillsFilterStore } from './skillsFilter'

/**
 * 组合式 Store，同时暴露数据操作和过滤状态。
 *
 * 向后兼容：现有代码可直接继续使用 useSkillsStore。
 * 新代码建议按需使用 useSkillsDataStore 或 useSkillsFilterStore。
 */
export const useSkillsStore = defineStore('skills', () => {
  const data = useSkillsDataStore()
  const filter = useSkillsFilterStore()

  return {
    // 数据状态
    searchResults: computed(() => data.searchResults),
    installedSkills: computed(() => data.installedSkills),
    fetching: computed(() => data.fetching),
    searching: computed(() => data.searching),
    installing: computed(() => data.installing),
    removing: computed(() => data.removing),
    loading: computed(() => data.loading),
    refreshing: computed(() => data.refreshing),
    error: computed(() => data.error),
    sortedAgentResults: computed(() => data.sortedAgentResults),

    // 过滤状态
    selectedAgents: computed({
      get: () => filter.selectedAgents,
      set: (val) => {
        filter.selectedAgents = val
      }
    }),
    searchKeyword: computed({
      get: () => filter.searchKeyword,
      set: (val) => {
        filter.searchKeyword = val
      }
    }),
    focusSearchTrigger: computed({
      get: () => filter.focusSearchTrigger,
      set: (val) => {
        filter.focusSearchTrigger = val
      }
    }),
    filteredSkills: computed(() => filter.filteredSkills),

    // 操作方法
    search: data.search,
    fetchInstalled: data.fetchInstalled,
    install: data.install,
    installStreaming: data.installStreaming,
    remove: data.remove,
    openLocation: data.openLocation,
    clearError: data.clearError,
    setSearchKeyword: filter.setSearchKeyword,
    toggleAgent: filter.toggleAgent,
    clearAgentFilter: filter.clearAgentFilter,
    triggerFocusSearch: filter.triggerFocusSearch
  }
})
