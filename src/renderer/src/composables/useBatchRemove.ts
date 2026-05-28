import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useTaskStore } from '../stores/tasks'
import { useNotify } from './useNotify'

/**
 * 批量删除技能的共享逻辑。
 *
 * 提取自 InstalledList.vue 和 AgentView.vue 中重复的批量管理模式：
 * - 批量选择状态（isBatchMode、selectedNames、pendingRemovalNames）
 * - 全选/反选计算属性
 * - 乐观删除 + 后台任务执行
 *
 * @param getAvailableNames 返回当前视图下所有可选技能名称的函数
 * @param options 可选配置，包括 agentFlag 获取器和回调
 */
export interface UseBatchRemoveOptions {
  /** 返回当前 Agent 的 flag，用于 AgentView 的批量删除 */
  agentFlag?: () => string | null | undefined
  /** 删除成功后的回调（用于刷新列表等） */
  onSuccess?: () => void
  /** 删除失败后的回调 */
  onError?: (err: string) => void
}

export interface UseBatchRemoveReturn {
  isBatchMode: Ref<boolean>
  selectedNames: Ref<string[]>
  pendingRemovalNames: Ref<Set<string>>
  allSelected: ComputedRef<boolean>
  someSelected: ComputedRef<boolean>
  selectedCount: ComputedRef<number>
  enterBatchMode: () => void
  exitBatchMode: () => void
  toggleAll: () => void
  toggleSkill: (name: string) => void
  handleBatchRemove: (confirmFn: (names: string[]) => Promise<boolean>) => Promise<void>
}

export function useBatchRemove(
  getAvailableNames: () => string[],
  options?: UseBatchRemoveOptions
): UseBatchRemoveReturn {
  const taskStore = useTaskStore()
  const notify = useNotify()

  const isBatchMode = ref(false)
  const selectedNames = ref<string[]>([])
  const pendingRemovalNames = ref<Set<string>>(new Set())

  const allSelected = computed(() => {
    const names = getAvailableNames()
    return names.length > 0 && names.every((n) => selectedNames.value.includes(n))
  })

  const someSelected = computed(() => {
    return selectedNames.value.length > 0 && !allSelected.value
  })

  const selectedCount = computed(() => selectedNames.value.length)

  /** 进入批量管理模式，清空之前的选择。 */
  function enterBatchMode(): void {
    isBatchMode.value = true
    selectedNames.value = []
  }

  /** 退出批量管理模式并清空选择。 */
  function exitBatchMode(): void {
    isBatchMode.value = false
    selectedNames.value = []
  }

  /** 切换当前视图下所有技能的全选/反选。 */
  function toggleAll(): void {
    const names = getAvailableNames()
    if (allSelected.value) {
      selectedNames.value = selectedNames.value.filter((n) => !names.includes(n))
    } else {
      selectedNames.value = Array.from(new Set([...selectedNames.value, ...names]))
    }
  }

  /** 切换单个技能的选中状态。 */
  function toggleSkill(name: string): void {
    const idx = selectedNames.value.indexOf(name)
    if (idx >= 0) {
      selectedNames.value = selectedNames.value.filter((n) => n !== name)
    } else {
      selectedNames.value = [...selectedNames.value, name]
    }
  }

  /**
   * 执行批量删除。
   *
   * 先调用 confirmFn 确认，确认后使用乐观删除策略：
   * 立即将选中项加入 pendingRemovalNames，再通过后台任务执行实际删除。
   */
  async function handleBatchRemove(
    confirmFn: (names: string[]) => Promise<boolean>
  ): Promise<void> {
    if (selectedNames.value.length === 0) return
    const confirmed = await confirmFn(selectedNames.value)
    if (!confirmed) return

    const names = [...selectedNames.value]
    const agentFlag = options?.agentFlag?.() ?? undefined

    // 乐观删除：立即加入 pendingRemovalNames
    pendingRemovalNames.value = new Set([...pendingRemovalNames.value, ...names])

    taskStore
      .start('skill-remove-batch', {
        packageRefs: names,
        agentFlag,
        onSuccess: () => {
          pendingRemovalNames.value = new Set()
          options?.onSuccess?.()
        },
        onError: (err) => {
          notify.error(err)
          pendingRemovalNames.value = new Set()
          options?.onError?.(err)
        }
      })
      .catch((e) => {
        notify.error(e instanceof Error ? e.message : '启动删除失败')
        pendingRemovalNames.value = new Set()
        options?.onError?.(e instanceof Error ? e.message : String(e))
      })

    exitBatchMode()
  }

  return {
    isBatchMode,
    selectedNames,
    pendingRemovalNames,
    allSelected,
    someSelected,
    selectedCount,
    enterBatchMode,
    exitBatchMode,
    toggleAll,
    toggleSkill,
    handleBatchRemove
  }
}
