# Background Task Service Design

## Date

2026-05-12

## Context

当前环境更新操作（`npm update -g npx` / `npm update -g skills`）和 Node.js 下载安装均通过 `execa` 在 Electron 主进程中同步执行。虽然 `execa` 内部使用 `child_process.spawn`，但主线程 `await` 等待其完成，导致：

- IPC handler 阻塞，影响主进程响应性
- 页面刷新后任务状态丢失
- 缺乏统一的任务管理机制

同时，环境更新按钮缺少确认框，配置改动后缺少保存提示。

## Goals

1. **不阻塞主线程**：后台任务启动后立即返回，通过事件驱动推送进度
2. **统一管理**：所有耗时操作（npm 更新、skills CLI 更新、Node.js 下载安装）走同一套服务
3. **页面刷新不影响**：任务状态存储在主进程内存中，renderer 重新连接后可恢复
4. **确认框**：更新 npx / skills 前显示详细版确认对话框
5. **保存提示**：配置项改动后页面内显示 banner 提示未保存

## Architecture

```
Main Process
  └─ BackgroundTaskService (singleton)
       ├─ tasks: Map<taskId, BackgroundTask>
       ├─ processes: Map<taskId, ExecaChildProcess>
       ├─ start(type, args) → taskId
       ├─ cancel(taskId)
       ├─ getAll() → BackgroundTask[]
       └─ onTaskUpdate → BrowserWindow.webContents.send('tasks:update', task)

Renderer Process
  └─ useTaskStore (Pinia)
       ├─ tasks: BackgroundTask[]
       ├─ start(type, args) → taskId
       ├─ cancel(taskId)
       ├─ sync() → 从主进程获取所有任务状态
       └─ subscribe() → 监听 'tasks:update' 事件
```

## BackgroundTaskService

### Types

```ts
interface BackgroundTask {
  id: string
  type: 'update-npx' | 'update-skills' | 'install-node' | 'install-skills'
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  progress: number // 0-100, -1 if not applicable
  stdout: string
  error?: string
  createdAt: number
  updatedAt: number
}
```

### API

```ts
class BackgroundTaskService {
  start(type: TaskType, args?: string[]): Promise<string>
  cancel(taskId: string): void
  getAll(): BackgroundTask[]
  getStatus(taskId: string): BackgroundTask | undefined
}
```

### 执行模型

```ts
async start(type: TaskType, args: string[] = []): Promise<string> {
  const id = crypto.randomUUID()
  const task: BackgroundTask = { id, type, status: 'pending', progress: -1, stdout: '', createdAt: Date.now(), updatedAt: Date.now() }
  this.tasks.set(id, task)

  const { command, args: cmdArgs } = this.resolveCommand(type, args)
  const child = execa(command, cmdArgs, { detached: true })
  this.processes.set(id, child)

  task.status = 'running'
  this.emitUpdate(task)

  child.stdout?.on('data', (data) => { task.stdout += data; this.emitUpdate(task) })
  child.stderr?.on('data', (data) => { task.stdout += data; this.emitUpdate(task) })

  child.on('exit', (code) => {
    task.status = code === 0 ? 'success' : 'error'
    if (code !== 0) task.error = `Exit code: ${code}`
    task.updatedAt = Date.now()
    this.cleanup(id)
    this.emitUpdate(task)
  })

  return id
}
```

**关键点**：`execa` 返回的 child process 不 `await`，而是绑定事件监听器。主线程立即返回 `taskId`。

## IPC Interface

| Channel         | Direction       | Payload           | Description                     |
| --------------- | --------------- | ----------------- | ------------------------------- |
| `tasks:start`   | Renderer → Main | `{ type, args? }` | 启动后台任务，返回 `{ taskId }` |
| `tasks:cancel`  | Renderer → Main | `taskId`          | 取消指定任务                    |
| `tasks:get-all` | Renderer → Main | —                 | 获取所有任务状态                |
| `tasks:update`  | Main → Renderer | `BackgroundTask`  | 任务状态变更推送                |

## Preload API

```ts
window.api.tasks = {
  start: (opts: { type: TaskType; args?: string[] }) => Promise<{ taskId: string }>,
  cancel: (taskId: string) => Promise<void>,
  getAll: () => Promise<BackgroundTask[]>,
  onUpdate: (cb: (task: BackgroundTask) => void) => () => void
}
```

## Renderer Integration

### 1. useTaskStore (Pinia)

```ts
export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<BackgroundTask[]>([])

  async function start(type: TaskType, args?: string[]): Promise<string> {
    const result = await window.api.tasks.start({ type, args })
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
      if (idx >= 0) tasks.value[idx] = task
      else tasks.value.push(task)
    })
  }

  return { tasks, start, cancel, sync, subscribe }
})
```

### 2. SettingsView.vue — 更新按钮改造

```ts
async function handleUpdateNpx(): Promise<void> {
  const confirmed = await confirmUpdateEnv('npx', envStore.status?.npxVersion || '')
  if (!confirmed) return
  await taskStore.start('update-npx')
}
```

UI 不再使用本地 `npxUpdating` ref，而是从 `taskStore.tasks` 中查找对应任务的状态：

```vue
<NButton
  size="tiny"
  round
  :loading="isTaskRunning('update-npx')"
  :disabled="isTaskRunning('update-npx')"
  @click="handleUpdateNpx"
>
  <template #icon>
    <NIcon :size="12"><RefreshOutline /></NIcon>
  </template>
  {{ isTaskRunning('update-npx') ? '更新中...' : '更新' }}
</NButton>
```

### 3. SettingsView.vue — 配置改动提示

```ts
const hasUnsavedChanges = computed(() => {
  // 对比当前 UI 值与 store 中的已保存值
  return (
    settingsStore.defaultAgent !== settingsStore.savedDefaultAgent ||
    settingsStore.autoCheckEnv !== settingsStore.savedAutoCheckEnv ||
    effectiveProxyUrl.value !== settingsStore.savedProxyUrl
  )
})
```

页面顶部显示 banner：

```vue
<NAlert v-if="hasUnsavedChanges" type="warning" :show-icon="false" class="unsaved-banner">
  有未保存的改动</NAlert>
```

## 确认框

在 `useConfirm.ts` 新增：

```ts
export function confirmUpdateEnv(name: string, version: string): Promise<boolean> {
  return new Promise((resolve) => {
    dialog.create({
      title: `更新 ${name}`,
      content: () =>
        h('div', null, [
          h('p', null, `确定更新 ${name} 吗？`),
          h(
            'p',
            { style: { color: 'var(--color-stone)', fontSize: '13px', marginTop: '8px' } },
            `当前版本 ${version}，更新期间相关功能可能暂时不可用。`
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
```

## Error Handling

- **任务启动失败**：execa 抛异常 → task.status = 'error'，error 字段写入异常消息
- **任务执行失败**：exit code ≠ 0 → task.status = 'error'，error 字段写入 stderr 内容
- **页面刷新**：`onMounted` 中调用 `taskStore.sync()` 恢复所有任务状态
- **重复启动**：同一类型的任务如果已在运行，可选择：拒绝新任务 / 取消旧任务再启动。推荐**拒绝新任务**，前端按钮 disabled

## Files to Modify

| File                                         | Change                                                              |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `src/main/services/BackgroundTaskService.ts` | **新增**：后台任务服务单例                                          |
| `src/main/services/EnvService.ts`            | 移除 `updateNpx` / `updateSkills`（逻辑移入 BackgroundTaskService） |
| `src/main/ipc/tasks.ipc.ts`                  | **新增**：tasks IPC handlers                                        |
| `src/main/ipc/env.ipc.ts`                    | 移除 update handlers                                                |
| `src/preload/index.ts`                       | 暴露 `window.api.tasks`                                             |
| `src/preload/index.d.ts`                     | 添加 `tasks` 类型声明                                               |
| `src/renderer/src/stores/tasks.ts`           | **新增**：useTaskStore                                              |
| `src/renderer/src/composables/useConfirm.ts` | 新增 `confirmUpdateEnv`                                             |
| `src/renderer/src/views/SettingsView.vue`    | 集成 task store、确认框、保存提示 banner                            |

## Verification

1. 点击 npx「更新」→ 弹出确认框 → 确认后按钮变 loading「更新中...」→ 主线程不阻塞（可立即点击其他按钮）
2. 刷新页面 → 按钮仍显示「更新中...」（task store sync 恢复状态）
3. 更新完成后 → 按钮恢复「更新」，版本号刷新
4. 修改代理设置 → 顶部出现「有未保存的改动」banner → 点击保存后 banner 消失
