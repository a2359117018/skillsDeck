import { defineStore } from 'pinia'
import { ref } from 'vue'
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
            callbacks.get(t.id)?.onError?.(t.error || '未知错误')
            callbacks.delete(t.id)
          }
        }
      } else {
        tasks.value.push(t)
      }
    })
  }

  function isRunning(type: BackgroundTask['type']): boolean {
    return tasks.value.some((t) => t.type === type && t.status === 'running')
  }

  return { tasks, start, cancel, sync, subscribe, isRunning }
})
