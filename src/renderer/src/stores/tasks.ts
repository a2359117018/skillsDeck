import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BackgroundTask } from '../../../shared/types'

interface TaskCallbacks {
  onSuccess?: () => void
  onError?: (err: string) => void
}

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<BackgroundTask[]>([])
  const callbacks = new Map<string, TaskCallbacks>()

  async function start(
    type: string,
    opts?: TaskCallbacks & { packageRef?: string; global?: boolean }
  ): Promise<string> {
    let result: { taskId: string; error?: string }

    if (type === 'skill-update') {
      result = await window.api.skills.updateBackground({
        packageRef: opts?.packageRef || '',
        global: opts?.global
      })
    } else if (type === 'skill-update-all') {
      result = await window.api.skills.updateAllBackground({ global: opts?.global })
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
        // Detect completion transition
        if (oldStatus !== 'success' && oldStatus !== 'error' && oldStatus !== 'cancelled') {
          if (t.status === 'success') {
            callbacks.get(t.id)?.onSuccess?.()
            callbacks.delete(t.id)
          } else if (t.status === 'error') {
            callbacks.get(t.id)?.onError?.(t.error || '操作失败，请稍后重试')
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

  /** 清除已完成的任务（状态非 running/pending） */
  function clearCompleted(): void {
    tasks.value = tasks.value.filter((t) => t.status === 'running' || t.status === 'pending')
  }

  return {
    tasks,
    activeTasks,
    hasActiveTasks,
    start,
    cancel,
    sync,
    subscribe,
    isRunning,
    clearCompleted
  }
})
