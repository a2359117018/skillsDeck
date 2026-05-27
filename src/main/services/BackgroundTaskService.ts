import { randomUUID } from 'crypto'
import { execa } from 'execa'
import type { BackgroundTask } from '../../shared/types'
import type { Subprocess } from 'execa'
import { getMainWindow } from './WindowManager'
import { getSettings } from './StoreService'

type TaskType = BackgroundTask['type']

/** Task executor contract — registered by domain modules */
export interface TaskExecutor {
  /** Execute the task. Must call markSuccess/markError on completion. */
  execute(taskId: string, payload: unknown): Promise<void>
}

class BackgroundTaskService {
  private tasks = new Map<string, BackgroundTask>()
  private processes = new Map<string, Subprocess>()
  private executors = new Map<string, TaskExecutor>()
  private payloads = new Map<string, unknown>()

  registerExecutor(type: TaskType, executor: TaskExecutor): void {
    this.executors.set(type, executor)
  }

  async startTask(type: TaskType, payload: unknown): Promise<string> {
    const existing = Array.from(this.tasks.values()).find(
      (t) => t.type === type && (t.status === 'pending' || t.status === 'running')
    )
    if (existing) {
      throw new Error(`A ${type} task is already ${existing.status}`)
    }

    const id = this.register(type)
    const executor = this.executors.get(type)
    if (!executor) {
      this.tasks.delete(id)
      throw new Error(`No executor registered for task type: ${type}`)
    }

    this.payloads.set(id, payload)
    this.markRunning(id)

    executor.execute(id, payload).catch((error) => {
      const task = this.tasks.get(id)
      if (task && task.status === 'running') {
        this.markError(id, error instanceof Error ? error.message : String(error))
      }
      this.cleanup(id)
    })

    return id
  }

  retryBuiltIn(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'error') {
      throw new Error('Task not found or not in error state')
    }

    const conflicting = Array.from(this.tasks.values()).find(
      (t) =>
        t.id !== taskId &&
        t.type === task.type &&
        (t.status === 'pending' || t.status === 'running')
    )
    if (conflicting) {
      throw new Error(`A ${task.type} task is already ${conflicting.status}`)
    }

    const executor = this.executors.get(task.type)
    if (!executor) {
      throw new Error(`No executor registered for task type: ${task.type}`)
    }

    task.status = 'pending'
    task.error = undefined
    task.stdout = ''
    task.stderr = ''
    task.progress = -1
    task.updatedAt = Date.now()
    this.emitUpdate(task)

    this.markRunning(taskId)

    const payload = this.payloads.get(taskId)
    executor.execute(taskId, payload).catch((error) => {
      const task = this.tasks.get(taskId)
      if (task && task.status === 'running') {
        this.markError(taskId, error instanceof Error ? error.message : String(error))
      }
      this.cleanup(taskId)
    })
  }

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
      default:
        throw new Error(`No builtin command for task type: ${type}`)
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
      stderr: '',
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
    const child = execa(command, args, { timeout: 120000 })
    this.processes.set(id, child)

    this.markRunning(id)

    child.stdout?.on('data', (data: Buffer) => {
      task.stdout += data.toString()
      task.updatedAt = Date.now()
      this.emitUpdate(task)
    })

    child.stderr?.on('data', (data: Buffer) => {
      task.stderr += data.toString()
      task.updatedAt = Date.now()
      this.emitUpdate(task)
    })

    child.on('exit', (code) => {
      if (code === 0) {
        this.markSuccess(id)
      } else {
        const detail = task.stderr.trim() || task.stdout.trim()
        this.markError(id, `Exit code: ${code}${detail ? `\n${detail}` : ''}`)
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

  getAll(): BackgroundTask[] {
    const all = Array.from(this.tasks.values())
    const completed = all.filter(
      (t) => t.status === 'success' || t.status === 'error' || t.status === 'cancelled'
    )
    if (completed.length > 50) {
      const toRemove = completed.slice(0, completed.length - 50)
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
    this.payloads.delete(taskId)
  }

  private emitUpdate(task: BackgroundTask): void {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('tasks:update', task)
    }
  }
}

export const backgroundTaskService = new BackgroundTaskService()
