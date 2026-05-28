import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSkillsDataStore } from './skills'

/**
 * 管理技能列表的 UI 过滤状态。
 *
 * 职责：
 * - 搜索关键词 (`searchKeyword`)
 * - Agent 筛选 (`selectedAgents`)
 * - 过滤后的技能列表 (`filteredSkills`)
 * - 搜索框聚焦触发器 (`focusSearchTrigger`)
 *
 * 不处理数据获取、安装/删除等操作逻辑。
 */
export const useSkillsFilterStore = defineStore('skillsFilter', () => {
  const dataStore = useSkillsDataStore()

  const selectedAgents = ref<string[]>([])
  const searchKeyword = ref('')

  /** 用于从全局快捷键触发搜索输入框聚焦 */
  const focusSearchTrigger = ref(0)

  const filteredSkills = computed(() => {
    let skills = dataStore.installedSkills

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

  /** 触发搜索输入聚焦。递增计数器允许监听器响应。 */
  function triggerFocusSearch(): void {
    focusSearchTrigger.value++
  }

  return {
    selectedAgents,
    searchKeyword,
    focusSearchTrigger,
    filteredSkills,
    setSearchKeyword,
    toggleAgent,
    clearAgentFilter,
    triggerFocusSearch
  }
})
