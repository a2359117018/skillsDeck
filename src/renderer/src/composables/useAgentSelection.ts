import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { getCommonAgents } from '../constants/agents'

const commonAgentFlags = getCommonAgents().map((a) => a.agentFlag)

/**
 * Agent 选择状态管理 composable。
 *
 * 封装 SkillInstallDialog 和 useSkillInstall 共用的 Agent 选择逻辑：
 * - selectedAgents / isGlobal 响应式状态
 * - 默认选中常用 Agent
 * - 是否可以继续安装的判断（全局或至少选一个 agent）
 */
export function useAgentSelection(): {
  selectedAgents: Ref<string[]>
  isGlobal: Ref<boolean>
  canProceed: ComputedRef<boolean>
  reset: () => void
} {
  const selectedAgents = ref<string[]>([])
  const isGlobal = ref(false)

  /** 重置为默认值（选中常用 agent，非全局） */
  function reset(): void {
    selectedAgents.value = [...commonAgentFlags]
    isGlobal.value = false
  }

  /** 是否满足继续条件：全局安装或至少选择一个 agent */
  const canProceed = computed(() => {
    if (isGlobal.value) return true
    return selectedAgents.value.length > 0
  })

  return {
    selectedAgents,
    isGlobal,
    canProceed,
    reset
  }
}
