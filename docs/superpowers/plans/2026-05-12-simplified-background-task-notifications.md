# Simplified Background Task Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all update operations (env npm updates, skill updates) to fire-and-forget with global toast notifications, eliminating button loading states.

**Architecture:** BackgroundTaskService becomes a universal task tracker (register/markRunning/markSuccess/markError) that any module can use. useTaskStore adds a callback registry — `subscribe()` detects task completion and invokes registered `onSuccess`/`onError` callbacks. Renderer calls `taskStore.start()` without awaiting.

**Tech Stack:** Electron, Vue 3, TypeScript, Pinia, Naive UI, execa

---

## File Map

| File                                         | Action | Responsibility                                                                     |
| -------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `src/main/services/BackgroundTaskService.ts` | Modify | Add `register/markRunning/markSuccess/markError`. Rename `start` → `startBuiltin`. |
| `src/main/ipc/tasks.ipc.ts`                  | Modify | Update `tasks:start` to call `startBuiltin()`.                                     |
| `src/main/ipc/skills.ipc.ts`                 | Modify | Add `skills:update-background` and `skills:update-all-background` handlers.        |
| `src/preload/index.ts`                       | Modify | Expose `skills.updateBackground` and `skills.updateAllBackground`.                 |
| `src/preload/index.d.ts`                     | Modify | Add type declarations for background skill update APIs.                            |
| `src/renderer/src/stores/tasks.ts`           | Modify | Add callback registry to `start()` and `subscribe()`.                              |
| `src/renderer/src/views/SettingsView.vue`    | Modify | Fire-and-forget update handlers, remove button loading/disabled.                   |
| `src/renderer/src/views/SkillDetail.vue`     | Modify | Fire-and-forget `handleUpdate`, remove `operationLoading`.                         |
| `src/renderer/src/views/InstalledList.vue`   | Modify | Fire-and-forget `handleUpdate` and `handleUpdateAll`, remove button loading.       |

---

### Task 1: Extend BackgroundTaskService with universal task tracking

**Files:**

- Modify: `src/main/services/BackgroundTaskService.ts`

- [ ] **Step 1: Rename `start` to `startBuiltin` and add `register/markRunning/markSuccess/markError`**

  Replace the entire class body:

  ```ts
  class BackgroundTaskService {
    private tasks = new Map<string, BackgroundTask>()
    private processes = new Map<string, Subprocess>()

    private resolveCommand(type: TaskType): { command: string; args: string[] } {
      switch (type) {
        case 'update-npx':
          return { command: 'npm', args: ['update', '-g', 'npx'] }
        case 'update-skills':
          return { command: 'npm', args: ['update', '-g', 'skills'] }
        case 'install-node':
          // TODO: implement install-node via BackgroundTaskService (currently uses direct download)
          throw new Error('install-node not yet supported in BackgroundTaskService')
        case 'install-skills':
          return { command: 'npm', args: ['install', '-g', 'npx', 'skills'] }
      }
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
      const child = execa(command, args, { timeout: 120000 })
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
          this.markError(id, `Exit code: ${code}`)
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
    }

    private emitUpdate(task: BackgroundTask): void {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('tasks:update', task)
      }
    }
  }
  ```

- [ ] **Step 2: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 3: Commit**

  ```bash
  git add src/main/services/BackgroundTaskService.ts
  git commit -m "feat(tasks): add register/markRunning/markSuccess/markError, rename start to startBuiltin"
  ```

---

### Task 2: Update tasks.ipc.ts to use startBuiltin

**Files:**

- Modify: `src/main/ipc/tasks.ipc.ts`

- [ ] **Step 1: Update handler to call startBuiltin()**

  ```ts
  import { ipcMain } from 'electron'
  import { backgroundTaskService } from '../services/BackgroundTaskService'
  import type { BackgroundTask } from '../../shared/types'

  export function registerTasksIpc(): void {
    ipcMain.handle('tasks:start', async (_, { type }: { type: BackgroundTask['type'] }) => {
      try {
        const taskId = await backgroundTaskService.startBuiltin(type)
        return { taskId }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { taskId: '', error: message }
      }
    })

    ipcMain.handle('tasks:cancel', (_, taskId: string) => {
      backgroundTaskService.cancel(taskId)
      return undefined
    })

    ipcMain.handle('tasks:get-all', () => {
      return backgroundTaskService.getAll()
    })
  }
  ```

- [ ] **Step 2: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 3: Commit**

  ```bash
  git add src/main/ipc/tasks.ipc.ts
  git commit -m "refactor(ipc): tasks:start uses startBuiltin"
  ```

---

### Task 3: Add background skill update handlers

**Files:**

- Modify: `src/main/ipc/skills.ipc.ts`

- [ ] **Step 1: Import BackgroundTaskService and add handlers**

  Add import at the top:

  ```ts
  import { backgroundTaskService } from '../services/BackgroundTaskService'
  ```

  Add these handlers inside `registerSkillsIpc`, after the existing handlers:

  ```ts
  ipcMain.handle(
    'skills:update-background',
    async (_, opts: { packageRef: string; global?: boolean }) => {
      const taskId = backgroundTaskService.register('skill-update')
      backgroundTaskService.markRunning(taskId)

      npxService
        .update(opts.packageRef, opts.global)
        .then((result) => {
          if (result.success) {
            backgroundTaskService.markSuccess(taskId)
          } else {
            backgroundTaskService.markError(taskId, result.stderr || '更新失败')
          }
        })
        .catch((error) => {
          backgroundTaskService.markError(
            taskId,
            error instanceof Error ? error.message : String(error)
          )
        })

      return { taskId }
    }
  )

  ipcMain.handle('skills:update-all-background', async (_, opts?: { global?: boolean }) => {
    const taskId = backgroundTaskService.register('skill-update-all')
    backgroundTaskService.markRunning(taskId)

    npxService
      .updateAll(opts?.global)
      .then((result) => {
        if (result.success) {
          backgroundTaskService.markSuccess(taskId)
        } else {
          backgroundTaskService.markError(taskId, result.stderr || '更新失败')
        }
      })
      .catch((error) => {
        backgroundTaskService.markError(
          taskId,
          error instanceof Error ? error.message : String(error)
        )
      })

    return { taskId }
  })
  ```

- [ ] **Step 2: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 3: Commit**

  ```bash
  git add src/main/ipc/skills.ipc.ts
  git commit -m "feat(skills): add update-background and update-all-background handlers"
  ```

---

### Task 4: Expose background skill APIs in preload

**Files:**

- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Add to preload script**

  In `src/preload/index.ts`, add to the `skills` object:

  ```ts
  updateBackground: (opts: { packageRef: string; global?: boolean }): Promise<{ taskId: string; error?: string }> =>
    ipcRenderer.invoke('skills:update-background', opts),
  updateAllBackground: (opts?: { global?: boolean }): Promise<{ taskId: string; error?: string }> =>
    ipcRenderer.invoke('skills:update-all-background', opts),
  ```

- [ ] **Step 2: Add to type declarations**

  In `src/preload/index.d.ts`, add to the `skills` interface:

  ```ts
  updateBackground: (opts: { packageRef: string; global?: boolean }) =>
    Promise<{ taskId: string; error?: string }>
  updateAllBackground: (opts?: { global?: boolean }) => Promise<{ taskId: string; error?: string }>
  ```

- [ ] **Step 3: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 4: Commit**

  ```bash
  git add src/preload/index.ts src/preload/index.d.ts
  git commit -m "feat(preload): expose skills background update APIs"
  ```

---

### Task 5: Add callback registry to useTaskStore

**Files:**

- Modify: `src/renderer/src/stores/tasks.ts`

- [ ] **Step 1: Add callback mechanism to store**

  Replace the entire file:

  ```ts
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

    return { tasks, start, cancel, sync, subscribe }
  })
  ```

- [ ] **Step 2: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 3: Commit**

  ```bash
  git add src/renderer/src/stores/tasks.ts
  git commit -m "feat(store): add callback registry to useTaskStore for completion notifications"
  ```

---

### Task 6: Convert SettingsView.vue to fire-and-forget

**Files:**

- Modify: `src/renderer/src/views/SettingsView.vue`

- [ ] **Step 1: Remove button loading/disabled state**

  Find the npx update button (around line 425):

  ```vue
  <div v-if="envStore.status?.npxInstalled" class="env-check-actions">
    <NButton size="tiny" round @click="handleUpdateNpx">
      <template #icon>
        <NIcon :size="12"><RefreshOutline /></NIcon>
      </template>
      更新
    </NButton>
  </div>
  ```

  Find the skills update button (around line 461):

  ```vue
  <div v-if="envStore.status?.skillsInstalled" class="env-check-actions">
    <NButton size="tiny" round @click="handleUpdateSkills">
      <template #icon>
        <NIcon :size="12"><RefreshOutline /></NIcon>
      </template>
      更新
    </NButton>
  </div>
  ```

- [ ] **Step 2: Replace handlers with fire-and-forget**

  Replace `handleUpdateNpx`:

  ```ts
  async function handleUpdateNpx(): Promise<void> {
    const confirmed = await confirmUpdateEnv('npx', envStore.status?.npxVersion || '')
    if (!confirmed) return
    taskStore
      .start('update-npx', {
        onSuccess: () => {
          message.success('npx 更新成功')
          envStore.check()
        },
        onError: (err) => {
          message.error(`npx 更新失败: ${err}`)
        }
      })
      .catch((e) => {
        message.info(e instanceof Error ? e.message : '启动更新失败')
      })
  }
  ```

  Replace `handleUpdateSkills`:

  ```ts
  async function handleUpdateSkills(): Promise<void> {
    const confirmed = await confirmUpdateEnv('skills', envStore.status?.skillsVersion || '')
    if (!confirmed) return
    taskStore
      .start('update-skills', {
        onSuccess: () => {
          message.success('skills 更新成功')
          envStore.check()
        },
        onError: (err) => {
          message.error(`skills 更新失败: ${err}`)
        }
      })
      .catch((e) => {
        message.info(e instanceof Error ? e.message : '启动更新失败')
      })
  }
  ```

- [ ] **Step 3: Remove unused refs**

  Remove from the script setup:

  ```ts
  const npxUpdating = ref(false)
  const skillsUpdating = ref(false)
  ```

  (These refs should no longer exist after prior refactoring, but verify.)

- [ ] **Step 4: Verify typecheck and lint**

  Run: `npm run typecheck && npm run lint`
  Expected: Both pass

- [ ] **Step 5: Commit**

  ```bash
  git add src/renderer/src/views/SettingsView.vue
  git commit -m "feat(settings): fire-and-forget env updates with toast notifications"
  ```

---

### Task 7: Convert SkillDetail.vue to fire-and-forget

**Files:**

- Modify: `src/renderer/src/views/SkillDetail.vue`

- [ ] **Step 1: Import task store**

  Add import:

  ```ts
  import { useTaskStore } from '../stores/tasks'
  ```

  Add store instance:

  ```ts
  const taskStore = useTaskStore()
  ```

- [ ] **Step 2: Replace handleUpdate with fire-and-forget**

  Replace `handleUpdate`:

  ```ts
  async function handleUpdate(): Promise<void> {
    const confirmed = await confirmUpdate(packageRef)
    if (!confirmed) return
    taskStore
      .start('skill-update', {
        packageRef,
        global: true,
        onSuccess: () => {
          message.success('更新成功')
          operationOutput.value = ''
        },
        onError: (err) => {
          message.error(`更新失败: ${err}`)
        }
      })
      .catch((e) => {
        message.info(e instanceof Error ? e.message : '启动更新失败')
      })
  }
  ```

- [ ] **Step 3: Remove loading state from update button**

  Find the update button and remove `:loading="operationLoading"`:

  ```vue
  <NButton size="medium" round class="action-btn" @click="handleUpdate">
    更新
  </NButton>
  ```

  Keep `operationLoading` for remove if it's still used there. If remove also converts, handle similarly.

- [ ] **Step 4: Verify typecheck and lint**

  Run: `npm run typecheck && npm run lint`
  Expected: Both pass

- [ ] **Step 5: Commit**

  ```bash
  git add src/renderer/src/views/SkillDetail.vue
  git commit -m "feat(skill-detail): fire-and-forget skill update with toast notification"
  ```

---

### Task 8: Convert InstalledList.vue to fire-and-forget

**Files:**

- Modify: `src/renderer/src/views/InstalledList.vue`

- [ ] **Step 1: Import task store**

  Add import:

  ```ts
  import { useTaskStore } from '../stores/tasks'
  ```

  Add store instance:

  ```ts
  const taskStore = useTaskStore()
  ```

- [ ] **Step 2: Replace handleUpdate with fire-and-forget**

  ```ts
  async function handleUpdate(name: string): Promise<void> {
    const confirmed = await confirmUpdate(name)
    if (!confirmed) return
    taskStore
      .start('skill-update', {
        packageRef: name,
        global: true,
        onSuccess: () => {
          message.success(`${name} 更新成功`)
          loadSkills()
        },
        onError: (err) => {
          message.error(`${name} 更新失败: ${err}`)
        }
      })
      .catch((e) => {
        message.info(e instanceof Error ? e.message : '启动更新失败')
      })
  }
  ```

- [ ] **Step 3: Replace handleUpdateAll with fire-and-forget**

  ```ts
  async function handleUpdateAll(): Promise<void> {
    const names = skillsStore.installedSkills.map((s) => s.name)
    if (names.length === 0) {
      message.info('没有可更新的技能')
      return
    }
    const confirmed = await confirmUpdateAll(names)
    if (!confirmed) return
    taskStore
      .start('skill-update-all', {
        global: true,
        onSuccess: () => {
          message.success('全部更新成功')
          loadSkills()
        },
        onError: (err) => {
          message.error(`更新失败: ${err}`)
        }
      })
      .catch((e) => {
        message.info(e instanceof Error ? e.message : '启动更新失败')
      })
  }
  ```

- [ ] **Step 4: Remove loading states from buttons**

  Find the "全部更新" button (around line 126) and remove `:loading="skillsStore.updatingAll"`:

  ```vue
  <NButton
    secondary
    size="small"
    :disabled="skillsStore.installedSkills.length === 0"
    @click="handleUpdateAll"
  >
    全部更新
  </NButton>
  ```

- [ ] **Step 5: Verify typecheck and lint**

  Run: `npm run typecheck && npm run lint`
  Expected: Both pass

- [ ] **Step 6: Commit**

  ```bash
  git add src/renderer/src/views/InstalledList.vue
  git commit -m "feat(installed-list): fire-and-forget skill updates with toast notifications"
  ```

---

### Task 9: End-to-end verification

- [ ] **Step 1: Start dev server**

  Run: `npm run dev`

- [ ] **Step 2: Verify SettingsView env updates**

  Navigate to Settings → 运行环境.
  Click npx「更新」→ confirm dialog → button stays normal (no loading) → toast "npx 更新成功" appears → version refreshes.
  Click again immediately → toast "A update-npx task is already running".

- [ ] **Step 3: Verify InstalledList skill updates**

  Navigate to 我的技能.
  Click「更新」on a skill → confirm dialog → button stays normal → toast "{name} 更新成功" → list refreshes.

- [ ] **Step 4: Verify update-all**

  Click「全部更新」→ confirm dialog → button stays normal → toast "全部更新成功" → list refreshes.

- [ ] **Step 5: Verify SkillDetail update**

  Navigate to a skill detail.
  Click「更新」→ confirm dialog → button stays normal → toast "更新成功".

---

## Self-Review

**Spec coverage:**

- [x] Fire-and-forget start → Task 5 (store), Task 6/7/8 (views)
- [x] No button loading state → Task 6/7/8 (remove :loading from buttons)
- [x] Global toast on completion → Task 5 (callbacks), Task 6/7/8 (onSuccess/onError)
- [x] Auto-refresh on success → Task 6 (envStore.check), Task 7/8 (loadSkills)
- [x] Universal extensibility → Task 1/3 (register/markRunning for external tasks)
- [x] Skills integration → Task 3 (skills.ipc.ts), Task 4 (preload), Task 7/8 (views)

**Placeholder scan:**

- [x] No TBD/TODO in plan steps
- [x] No vague "add error handling" steps
- [x] All code shown explicitly

**Type consistency:**

- `BackgroundTaskService.register()` returns `string` (taskId)
- `markRunning/markSuccess/markError` all accept `taskId: string`
- `startBuiltin()` replaces `start()`, same return type `Promise<string>`
- `useTaskStore.start()` accepts `type: string` (generic, supports both builtin and external)
- IPC channels: `skills:update-background`, `skills:update-all-background`
