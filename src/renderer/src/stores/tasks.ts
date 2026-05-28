import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BackgroundTask } from '../../../shared/types'

interface TaskCallbacks {
  onSuccess?: () => void
  onError?: (err: string) => void
}

interface TaskTypeHandler {
  start(opts: Record<string, unknown>): Promise<{ taskId: string; error?: string }>
  retry?(taskId: string): Promise<{ ok: boolean; error?: string }>
}

const taskRegistry = new Map<string, TaskTypeHandler>()

taskRegistry.set('skill-update', {
  start: async (opts) => {
    return window.api.skills.updateBackground({
      packageRef: String(opts.packageRef || ''),
      global: opts.global as boolean | undefined
    })
  },
  retry: async () => {
    throw new Error('单个技能更新不支持重试，请重新执行更新操作')
  }
})

taskRegistry.set('skill-update-all', {
  start: async (opts) => {
    return window.api.skills.updateAllBackground({
      global: opts.global as boolean | undefined
    })
  },
  retry: async (taskId) => {
    return window.api.tasks.retrySkillUpdate({ taskId })
  }
})

taskRegistry.set('skill-remove-batch', {
  start: async (opts) => {
    return window.api.skills.removeBatchBackground({
      packageRefs: (opts.packageRefs as string[]) || [],
      agentFlag: opts.agentFlag as string | undefined
    })
  },
  retry: async () => {
    throw new Error('批量删除不支持重试，请重新进入批量管理模式执行')
  }
})

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<BackgroundTask[]>([])
  const callbacks = new Map<string, TaskCallbacks>()

  async function start(
    type: string,
    opts?: TaskCallbacks & {
      packageRef?: string
      packageRefs?: string[]
      agentFlag?: string
      global?: boolean
    }
  ): Promise<string> {
    const handler = taskRegistry.get(type)
    let result: { taskId: string; error?: string }
    if (handler) {
      const { onSuccess: _os, onError: _oe, ...handlerOpts } = opts || {}
      result = await handler.start(handlerOpts as Record<string, unknown>)
    } else {
      result = await window.api.tasks.start({ type: type as BackgroundTask['type'] })
    }

    if (result.error) throw new Error(result.error)
    if (opts?.onSuccess || opts?.onError) {
      callbacks.set(result.taskId, {
        onSuccess: opts.onSuccess,
        onError: opts.onError
      })
    }
    await sync()
    return result.taskId
  }

  async function cancel(taskId: string): Promise<void> {
    await window.api.tasks.cancel(taskId)
  }

  async function retry(taskId: string): Promise<void> {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) throw new Error('Task not found')

    const handler = taskRegistry.get(task.type)
    let result: { ok: boolean; error?: string }

    if (handler?.retry) {
      result = await handler.retry(taskId)
    } else {
      result = await window.api.tasks.retry({ taskId })
    }

    if (!result.ok) throw new Error(result.error)
    await sync()
  }

  async function sync(): Promise<void> {
    tasks.value = await window.api.tasks.getAll()
  }

  function subscribe(): () => void {
    return window.api.tasks.onUpdate((task) => {
      const t = task as BackgroundTask
      const idx = tasks.value.findIndex((x) => x.id === t.id)
      if (idx >= 0) {
        const oldStatus = tasks.value[idx].status
        tasks.value[idx] = t
        if (oldStatus !== 'success' && oldStatus !== 'error' && oldStatus !== 'cancelled') {
          const cb = callbacks.get(t.id)
          if (t.status === 'success') {
            cb?.onSuccess?.()
            callbacks.delete(t.id)
          } else if (t.status === 'error') {
            cb?.onError?.(t.error || '操作失败，请稍后重试')
            callbacks.delete(t.id)
          }
        }
      } else {
        tasks.value.push(t)
      }
    })
  }

  const activeTasks = computed(() =>
    tasks.value.filter((t) => t.status === 'running' || t.status === 'pending')
  )

  const hasActiveTasks = computed(() => activeTasks.value.length > 0)

  function isRunning(type: BackgroundTask['type']): boolean {
    return tasks.value.some((t) => t.type === type && t.status === 'running')
  }

  function clearCompleted(): void {
    tasks.value = tasks.value.filter((t) => t.status === 'running' || t.status === 'pending')
  }

  return {
    tasks,
    activeTasks,
    hasActiveTasks,
    start,
    cancel,
    retry,
    sync,
    subscribe,
    isRunning,
    clearCompleted
  }
})
