# Background Task Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a non-blocking background task service for long-running npm operations, add confirmation dialogs, and unsaved-changes banner to the settings page.

**Architecture:** A `BackgroundTaskService` singleton in the main process spawns `execa` child processes without awaiting, tracks task state in memory, and pushes updates to the renderer via IPC. The renderer uses a Pinia `useTaskStore` to sync and display task status.

**Tech Stack:** Electron, Vue 3, TypeScript, Pinia, execa, Naive UI

---

## File Map

| File                                         | Action | Responsibility                                                         |
| -------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `src/main/services/BackgroundTaskService.ts` | Create | Singleton that manages background task lifecycle                       |
| `src/main/ipc/tasks.ipc.ts`                  | Create | IPC handlers for task start/cancel/get-all                             |
| `src/main/ipc/index.ts`                      | Modify | Register new tasks IPC handlers                                        |
| `src/main/services/EnvService.ts`            | Modify | Remove `updateNpx` and `updateSkills` (moved to BackgroundTaskService) |
| `src/main/ipc/env.ipc.ts`                    | Modify | Remove `env:update-npx` and `env:update-skills` handlers               |
| `src/preload/index.ts`                       | Modify | Expose `window.api.tasks`                                              |
| `src/preload/index.d.ts`                     | Modify | Add `tasks` type declarations                                          |
| `src/shared/types.ts`                        | Modify | Add `BackgroundTask` interface                                         |
| `src/renderer/src/stores/tasks.ts`           | Create | Pinia store for task state                                             |
| `src/renderer/src/composables/useConfirm.ts` | Modify | Add `confirmUpdateEnv`                                                 |
| `src/renderer/src/views/SettingsView.vue`    | Modify | Integrate task store, confirmation, unsaved banner                     |

---

### Task 1: Add `BackgroundTask` type to shared types

**Files:**

- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add `BackgroundTask` interface**

  Insert after `EnvStatus`:

  ```ts
  export interface BackgroundTask {
    id: string
    type: 'update-npx' | 'update-skills' | 'install-node' | 'install-skills'
    status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
    progress: number
    stdout: string
    error?: string
    createdAt: number
    updatedAt: number
  }
  ```

- [ ] **Step 2: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 3: Commit**

  ```bash
  git add src/shared/types.ts
  git commit -m "feat(types): add BackgroundTask interface"
  ```

---

### Task 2: Create `BackgroundTaskService`

**Files:**

- Create: `src/main/services/BackgroundTaskService.ts`

- [ ] **Step 1: Create the service file**

  ```ts
  import { randomUUID } from 'crypto'
  import { BrowserWindow } from 'electron'
  import { execa } from 'execa'
  import type { BackgroundTask } from '../../shared/types'
  import type { ExecaChildProcess } from 'execa'

  type TaskType = BackgroundTask['type']

  class BackgroundTaskService {
    private tasks = new Map<string, BackgroundTask>()
    private processes = new Map<string, ExecaChildProcess>()

    private resolveCommand(type: TaskType): { command: string; args: string[] } {
      switch (type) {
        case 'update-npx':
          return { command: 'npm', args: ['update', '-g', 'npx'] }
        case 'update-skills':
          return { command: 'npm', args: ['update', '-g', 'skills'] }
        case 'install-node':
          throw new Error('install-node not yet supported in BackgroundTaskService')
        case 'install-skills':
          return { command: 'npm', args: ['install', '-g', 'npx', 'skills'] }
      }
    }

    async start(type: TaskType): Promise<string> {
      const id = randomUUID()
      const now = Date.now()
      const task: BackgroundTask = {
        id,
        type,
        status: 'pending',
        progress: -1,
        stdout: '',
        createdAt: now,
        updatedAt: now
      }
      this.tasks.set(id, task)

      const { command, args } = this.resolveCommand(type)
      const child = execa(command, args, { timeout: 120000 })
      this.processes.set(id, child)

      task.status = 'running'
      task.updatedAt = Date.now()
      this.emitUpdate(task)

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
        task.status = code === 0 ? 'success' : 'error'
        if (code !== 0) task.error = `Exit code: ${code}`
        task.updatedAt = Date.now()
        this.cleanup(id)
        this.emitUpdate(task)
      })

      child.catch((error) => {
        task.status = 'error'
        task.error = error instanceof Error ? error.message : String(error)
        task.updatedAt = Date.now()
        this.cleanup(id)
        this.emitUpdate(task)
      })

      return id
    }

    cancel(taskId: string): void {
      const child = this.processes.get(taskId)
      if (child) {
        child.kill('SIGTERM')
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
      return Array.from(this.tasks.values())
    }

    getStatus(taskId: string): BackgroundTask | undefined {
      return this.tasks.get(taskId)
    }

    private cleanup(taskId: string): void {
      this.processes.delete(taskId)
    }

    private emitUpdate(task: BackgroundTask): void {
      const win = BrowserWindow.getFocusedWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('tasks:update', task)
      }
    }
  }

  export const backgroundTaskService = new BackgroundTaskService()
  ```

- [ ] **Step 2: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 3: Commit**

  ```bash
  git add src/main/services/BackgroundTaskService.ts
  git commit -m "feat(main): add BackgroundTaskService for non-blocking task execution"
  ```

---

### Task 3: Create `tasks.ipc.ts` and register handlers

**Files:**

- Create: `src/main/ipc/tasks.ipc.ts`
- Modify: `src/main/ipc/index.ts`

- [ ] **Step 1: Create tasks IPC handlers**

  ```ts
  import { ipcMain } from 'electron'
  import { backgroundTaskService } from '../services/BackgroundTaskService'

  export function registerTasksIpc(): void {
    ipcMain.handle('tasks:start', async (_, { type }: { type: BackgroundTask['type'] }) => {
      try {
        const taskId = await backgroundTaskService.start(type)
        return { taskId }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { taskId: '', error: message }
      }
    })

    ipcMain.handle('tasks:cancel', (_, taskId: string) => {
      backgroundTaskService.cancel(taskId)
    })

    ipcMain.handle('tasks:get-all', () => {
      return backgroundTaskService.getAll()
    })
  }
  ```

- [ ] **Step 2: Register in IPC index**

  Modify `src/main/ipc/index.ts`:

  ```ts
  import { registerTasksIpc } from './tasks.ipc'

  export function registerIpcHandlers(): void {
    registerSkillsIpc(getMainWindow)
    registerEnvIpc()
    registerStoreIpc()
    registerShellIpc()
    registerAgentsIpc()
    registerTasksIpc() // Add this line
  }
  ```

- [ ] **Step 3: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 4: Commit**

  ```bash
  git add src/main/ipc/tasks.ipc.ts src/main/ipc/index.ts
  git commit -m "feat(ipc): add tasks:start, tasks:cancel, tasks:get-all handlers"
  ```

---

### Task 4: Clean up old update handlers

**Files:**

- Modify: `src/main/services/EnvService.ts`
- Modify: `src/main/ipc/env.ipc.ts`

- [ ] **Step 1: Remove `updateNpx` and `updateSkills` from EnvService**

  Delete these two functions from `src/main/services/EnvService.ts`:

  ```ts
  export async function updateNpx(): Promise<{ success: boolean; error?: string }> {
    // ... remove entire function
  }

  export async function updateSkills(): Promise<{ success: boolean; error?: string }> {
    // ... remove entire function
  }
  ```

- [ ] **Step 2: Remove update handlers from env.ipc.ts**

  Remove `env:update-npx` and `env:update-skills` handlers, and remove their imports from `EnvService`.

- [ ] **Step 3: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 4: Commit**

  ```bash
  git add src/main/services/EnvService.ts src/main/ipc/env.ipc.ts
  git commit -m "refactor: remove old blocking updateNpx/updateSkills handlers"
  ```

---

### Task 5: Expose tasks API in preload

**Files:**

- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Add to preload script**

  Add to the `api` object in `src/preload/index.ts`:

  ```ts
  tasks: {
    start: (opts: { type: BackgroundTask['type'] }): Promise<{ taskId: string; error?: string }> =>
      ipcRenderer.invoke('tasks:start', opts),
    cancel: (taskId: string): Promise<void> => ipcRenderer.invoke('tasks:cancel', taskId),
    getAll: (): Promise<BackgroundTask[]> => ipcRenderer.invoke('tasks:get-all'),
    onUpdate: (callback: (task: BackgroundTask) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, task: BackgroundTask): void =>
        callback(task)
      ipcRenderer.on('tasks:update', listener)
      return () => ipcRenderer.removeListener('tasks:update', listener)
    }
  },
  ```

- [ ] **Step 2: Add to type declarations**

  Add to `AppApi` in `src/preload/index.d.ts`:

  ```ts
  tasks: {
    start: (opts: { type: BackgroundTask['type'] }) => Promise<{ taskId: string; error?: string }>
    cancel: (taskId: string) => Promise<void>
    getAll: () => Promise<BackgroundTask[]>
    onUpdate: (callback: (task: BackgroundTask) => void) => () => void
  }
  ```

  Also add `BackgroundTask` to the import from `../shared/types`.

- [ ] **Step 3: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 4: Commit**

  ```bash
  git add src/preload/index.ts src/preload/index.d.ts
  git commit -m "feat(preload): expose tasks API to renderer"
  ```

---

### Task 6: Create `useTaskStore`

**Files:**

- Create: `src/renderer/src/stores/tasks.ts`

- [ ] **Step 1: Create the store**

  ```ts
  import { defineStore } from 'pinia'
  import { ref } from 'vue'
  import type { BackgroundTask } from '../../../shared/types'

  export const useTaskStore = defineStore('tasks', () => {
    const tasks = ref<BackgroundTask[]>([])

    async function start(type: BackgroundTask['type']): Promise<string> {
      const result = await window.api.tasks.start({ type })
      if (result.error) throw new Error(result.error)
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
        const idx = tasks.value.findIndex((t) => t.id === task.id)
        if (idx >= 0) {
          tasks.value[idx] = task
        } else {
          tasks.value.push(task)
        }
      })
    }

    function isRunning(type: BackgroundTask['type']): boolean {
      return tasks.value.some((t) => t.type === type && t.status === 'running')
    }

    return { tasks, start, cancel, sync, subscribe, isRunning }
  })
  ```

- [ ] **Step 2: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 3: Commit**

  ```bash
  git add src/renderer/src/stores/tasks.ts
  git commit -m "feat(store): add useTaskStore for background task state"
  ```

---

### Task 7: Add `confirmUpdateEnv` to `useConfirm`

**Files:**

- Modify: `src/renderer/src/composables/useConfirm.ts`

- [ ] **Step 1: Add the function**

  Add to the `useConfirm` return object:

  ```ts
  import { h } from 'vue'
  import { useDialog } from 'naive-ui'

  export function useConfirm() {
    const dialog = useDialog()
    // ... existing functions ...

    function confirmUpdateEnv(name: string, version: string): Promise<boolean> {
      return new Promise((resolve) => {
        dialog.create({
          title: `更新 ${name}`,
          content: () =>
            h('div', null, [
              h('p', null, `确定更新 ${name} 吗？`),
              h(
                'p',
                {
                  style: {
                    color: 'var(--color-stone)',
                    fontSize: '13px',
                    marginTop: '8px'
                  }
                },
                `当前版本 ${version || 'unknown'}，更新期间相关功能可能暂时不可用。`
              )
            ]),
          positiveText: '确定更新',
          negativeText: '取消',
          onPositiveClick: () => resolve(true),
          onNegativeClick: () => resolve(false),
          onClose: () => resolve(false),
          onMaskClick: () => resolve(false)
        })
      })
    }

    return {
      confirmInstall,
      confirmUpdate,
      confirmRemove,
      confirmUpdateAll,
      confirmUpdateEnv
    }
  }
  ```

- [ ] **Step 2: Verify typecheck**

  Run: `npm run typecheck`
  Expected: Pass

- [ ] **Step 3: Commit**

  ```bash
  git add src/renderer/src/composables/useConfirm.ts
  git commit -m "feat(confirm): add confirmUpdateEnv dialog"
  ```

---

### Task 8: Integrate into SettingsView.vue

**Files:**

- Modify: `src/renderer/src/views/SettingsView.vue`

- [ ] **Step 1: Import task store and add confirm function**

  ```ts
  import { useTaskStore } from '../stores/tasks'

  const taskStore = useTaskStore()
  const { confirmUpdateAll, confirmUpdateEnv } = useConfirm()
  ```

- [ ] **Step 2: Replace handleUpdateNpx and handleUpdateSkills**

  ```ts
  async function handleUpdateNpx(): Promise<void> {
    const confirmed = await confirmUpdateEnv('npx', envStore.status?.npxVersion || '')
    if (!confirmed) return
    try {
      await taskStore.start('update-npx')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '启动更新失败')
    }
  }

  async function handleUpdateSkills(): Promise<void> {
    const confirmed = await confirmUpdateEnv('skills', envStore.status?.skillsVersion || '')
    if (!confirmed) return
    try {
      await taskStore.start('update-skills')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '启动更新失败')
    }
  }
  ```

- [ ] **Step 3: Add hasUnsavedChanges computed and watchers**

  ```ts
  const hasUnsavedChanges = computed(() => {
    const stored = settingsStore.proxyUrl
    return (
      settingsStore.defaultAgent !== settingsStore.savedDefaultAgent ||
      settingsStore.autoCheckEnv !== settingsStore.savedAutoCheckEnv ||
      effectiveProxyUrl.value !== stored
    )
  })
  ```

  **Note:** `savedDefaultAgent`, `savedAutoCheckEnv`, `savedProxyUrl` don't exist yet. We'll track original values instead:

  ```ts
  const originalSettings = ref({ defaultAgent: '', autoCheckEnv: true, proxyUrl: '' })

  onMounted(() => {
    settingsStore.load().then(() => {
      originalSettings.value = {
        defaultAgent: settingsStore.defaultAgent,
        autoCheckEnv: settingsStore.autoCheckEnv,
        proxyUrl: settingsStore.proxyUrl || ''
      }
      // ... rest of onMounted
    })
  })

  const hasUnsavedChanges = computed(() => {
    return (
      settingsStore.defaultAgent !== originalSettings.value.defaultAgent ||
      settingsStore.autoCheckEnv !== originalSettings.value.autoCheckEnv ||
      effectiveProxyUrl.value !== originalSettings.value.proxyUrl
    )
  })
  ```

  Update `handleSave` to reset original values after save:

  ```ts
  async function handleSave(): Promise<void> {
    // ... existing validation ...
    await settingsStore.save({
      defaultAgent: settingsStore.defaultAgent,
      autoCheckEnv: settingsStore.autoCheckEnv,
      proxyUrl: effectiveProxyUrl.value
    })
    originalSettings.value = {
      defaultAgent: settingsStore.defaultAgent,
      autoCheckEnv: settingsStore.autoCheckEnv,
      proxyUrl: effectiveProxyUrl.value
    }
    message.success('设置已保存')
  }
  ```

- [ ] **Step 4: Update template — add unsaved banner and task status**

  Add banner inside `NCard` at the top:

  ```vue
  <NAlert v-if="hasUnsavedChanges" type="warning" :show-icon="false" class="unsaved-banner">
    有未保存的改动
  </NAlert>
  ```

  Update npx/skills update buttons to use `taskStore.isRunning`:

  ```vue
  <NButton
    size="tiny"
    round
    :loading="taskStore.isRunning('update-npx')"
    :disabled="taskStore.isRunning('update-npx')"
    @click="handleUpdateNpx"
  >
    <template #icon>
      <NIcon :size="12"><RefreshOutline /></NIcon>
    </template>
    {{ taskStore.isRunning('update-npx') ? '更新中...' : '更新' }}
  </NButton>
  ```

- [ ] **Step 5: Add lifecycle hooks for task subscription**

  ```ts
  import { onMounted, onUnmounted } from 'vue'

  let unsubscribeTasks: (() => void) | null = null

  onMounted(() => {
    taskStore.sync()
    unsubscribeTasks = taskStore.subscribe()
    // ... rest of onMounted
  })

  onUnmounted(() => {
    unsubscribeTasks?.()
  })
  ```

- [ ] **Step 6: Add unsaved banner styles**

  ```css
  .unsaved-banner :deep(.n-alert-body) {
    padding: 10px 16px;
  }
  ```

- [ ] **Step 7: Run typecheck and lint**

  Run: `npm run typecheck && npm run lint`
  Expected: Both pass

- [ ] **Step 8: Commit**

  ```bash
  git add src/renderer/src/views/SettingsView.vue
  git commit -m "feat(settings): integrate background tasks, confirm dialogs, unsaved banner"
  ```

---

### Task 9: End-to-end verification

- [ ] **Step 1: Start dev server**

  ```bash
  npm run dev
  ```

- [ ] **Step 2: Verify environment check still works**

  Open Settings page → 运行环境 section shows all four items with versions.

- [ ] **Step 3: Verify confirmation dialog**

  Click npx「更新」→ expect a dialog: "更新 npx" with version info and "更新期间相关功能可能暂时不可用" → click cancel → no task starts.

  Click again → confirm → button changes to "更新中..." with loading spinner.

- [ ] **Step 4: Verify non-blocking**

  While npx is updating, click「重新检测」→ env check should work immediately (not blocked).

- [ ] **Step 5: Verify page refresh survival**

  While update is running, navigate to another page, then back to Settings → button still shows "更新中...".

- [ ] **Step 6: Verify unsaved changes banner**

  Change proxy selector → yellow banner "有未保存的改动" appears at top of card.
  Click「保存设置」→ banner disappears.

---

## Self-Review

**Spec coverage:**

- [x] Non-blocking task execution → Task 2 (BackgroundTaskService)
- [x] Unified service → Task 2 (singleton pattern)
- [x] Page refresh survival → Task 2 + Task 6 (emitUpdate + sync)
- [x] Confirmation dialog → Task 7 (confirmUpdateEnv)
- [x] Unsaved changes banner → Task 8 (hasUnsavedChanges + NAlert)

**Placeholder scan:**

- [x] No TBD/TODO
- [x] No vague "add error handling" steps
- [x] All code shown explicitly

**Type consistency:**

- `BackgroundTask` type defined in Task 1, used consistently in Task 2, 3, 5, 6
- `TaskType` alias matches `BackgroundTask['type']`
- IPC channel names consistent: `tasks:start`, `tasks:cancel`, `tasks:get-all`, `tasks:update`
