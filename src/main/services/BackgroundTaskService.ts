import { randomUUID } from 'crypto'
import { execa } from 'execa'
import type { BackgroundTask } from '../../shared/types'
import type { Subprocess } from 'execa'
import { getMainWindow } from './WindowManager'
import { getSettings } from './StoreService'
import { BACKGROUND_TASK_TIMEOUT_MS, TASK_HISTORY_LIMIT } from '../../shared/constants'

type TaskType = BackgroundTask['type']

class BackgroundTaskService {
  private tasks = new Map<string, BackgroundTask>()
  private processes = new Map<string, Subprocess>()

  private resolveCommand(type: TaskType): { command: string; args: string[] } {
    let command: string
    let args: string[]

    switch (type) {
      case 'update-skills':
        command = 'npm'
        args = ['update', '-g', 'skills']
        break
      case 'install-node':
        throw new Error('install-node not yet supported in BackgroundTaskService')
      case 'install-skills':
        command = 'npm'
        args = ['install', '-g', 'skills']
        break
      case 'skill-update':
      case 'skill-update-all':
        throw new Error(`${type} is managed by skills.ipc.ts, not BackgroundTaskService`)
      default:
        throw new Error(`Unknown task type: ${type}`)
    }

    const registry = getSettings().npmRegistry
    if (registry) {
      args.push('--registry', registry)
    }

    return { command, args }
  }

  register(type: string): string {
    const id = randomUUID()
    const task: BackgroundTask = {
      id,
      type: type as TaskType,
      status: 'pending',
      progress: -1,
      stdout: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    this.tasks.set(id, task)
    return id
  }

  markRunning(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.status = 'running'
      task.updatedAt = Date.now()
      this.emitUpdate(task)
    }
  }

  markSuccess(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.status = 'success'
      task.updatedAt = Date.now()
      this.emitUpdate(task)
    }
  }

  markError(taskId: string, error: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.status = 'error'
      task.error = error
      task.updatedAt = Date.now()
      this.emitUpdate(task)
    }
  }

  async startBuiltin(type: TaskType): Promise<string> {
    const existing = Array.from(this.tasks.values()).find(
      (t) => t.type === type && (t.status === 'pending' || t.status === 'running')
    )
    if (existing) {
      throw new Error(`A ${type} task is already ${existing.status}`)
    }

    const id = this.register(type)
    const task = this.tasks.get(id)!

    const { command, args } = this.resolveCommand(type)
    const child = execa(command, args, { timeout: BACKGROUND_TASK_TIMEOUT_MS })
    this.processes.set(id, child)

    this.markRunning(id)

    child.stdout?.on('data', (data: Buffer) => {
      task.stdout += data.toString()
      task.updatedAt = Date.now()
      this.emitUpdate(task)
    })

    child.stderr?.on('data', (data: Buffer) => {
      task.stdout += data.toString()
      task.updatedAt = Date.now()
      this.emitUpdate(task)
    })

    child.on('exit', (code) => {
      if (code === 0) {
        this.markSuccess(id)
      } else {
        const detail = task.stdout.trim() ? `\n${task.stdout.trim()}` : ''
        this.markError(id, `Exit code: ${code}${detail}`)
      }
      this.cleanup(id)
    })

    child.catch((error) => {
      this.markError(id, error instanceof Error ? error.message : String(error))
      this.cleanup(id)
    })

    return id
  }

  cancel(taskId: string): void {
    const child = this.processes.get(taskId)
    if (child) {
      try {
        child.kill('SIGTERM')
      } catch {
        // Process already exited
      }
      const task = this.tasks.get(taskId)
      if (task) {
        task.status = 'cancelled'
        task.updatedAt = Date.now()
        this.emitUpdate(task)
      }
      this.cleanup(taskId)
    }
  }

  /** 重试失败的任务：将任务重置为 pending 并重新执行 */
  retryBuiltIn(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'error') {
      throw new Error('Task not found or not in error state')
    }

    const { command, args } = this.resolveCommand(task.type)
    task.status = 'pending'
    task.error = undefined
    task.stdout = ''
    task.progress = -1
    task.updatedAt = Date.now()
    this.emitUpdate(task)

    const child = execa(command, args, { timeout: BACKGROUND_TASK_TIMEOUT_MS })
    this.processes.set(taskId, child)

    this.markRunning(taskId)

    child.stdout?.on('data', (data: Buffer) => {
      task.stdout += data.toString()
      task.updatedAt = Date.now()
      this.emitUpdate(task)
    })

    child.stderr?.on('data', (data: Buffer) => {
      task.stdout += data.toString()
      task.updatedAt = Date.now()
      this.emitUpdate(task)
    })

    child.on('exit', (code) => {
      if (code === 0) {
        this.markSuccess(taskId)
      } else {
        const detail = task.stdout.trim() ? `\n${task.stdout.trim()}` : ''
        this.markError(taskId, `Exit code: ${code}${detail}`)
      }
      this.cleanup(taskId)
    })

    child.catch((error) => {
      this.markError(taskId, error instanceof Error ? error.message : String(error))
      this.cleanup(taskId)
    })
  }

  getAll(): BackgroundTask[] {
    const all = Array.from(this.tasks.values())
    const completed = all.filter(
      (t) => t.status === 'success' || t.status === 'error' || t.status === 'cancelled'
    )
    if (completed.length > TASK_HISTORY_LIMIT) {
      const toRemove = completed.slice(0, completed.length - TASK_HISTORY_LIMIT)
      for (const t of toRemove) {
        this.tasks.delete(t.id)
      }
    }
    return Array.from(this.tasks.values())
  }

  getStatus(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId)
  }

  private cleanup(taskId: string): void {
    this.processes.delete(taskId)
  }

  private emitUpdate(task: BackgroundTask): void {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('tasks:update', task)
    }
  }
}

export const backgroundTaskService = new BackgroundTaskService()
