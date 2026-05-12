# Simplified Background Task Notifications Design

## Date

2026-05-12

## Context

当前后台任务系统已经实现了非阻塞执行（BackgroundTaskService + useTaskStore），但 renderer 端仍然以"跟踪任务状态用于按钮 loading 样式"为主要用途。用户点击更新后需要等待 IPC 返回、按钮进入 loading、通过 `taskStore.isRunning()` 控制状态——这一套对于后台任务来说过于冗余。

用户的核心诉求：后台任务就该像后台任务一样工作。点击即走，完成后全局通知。

## Goals

1. **Fire-and-forget 启动**：用户点击更新、确认后，任务立即提交，UI 不阻塞、不等待
2. **无按钮 loading 状态**：按钮始终保持可点击状态，不根据任务状态变化
3. **全局通知**：任务完成（成功或失败）后通过全局 toast 通知用户
4. **自动刷新**：任务成功后自动刷新相关数据（环境版本、技能列表等）
5. **通用扩展**：任何耗时操作（环境更新、技能更新）都能接入同一套机制

## Architecture

### BackgroundTaskService as Universal Task Tracker

`BackgroundTaskService` 从"execa 命令执行器"升级为**通用任务生命周期管理器**。任何模块都可以注册任务、驱动其状态变化，复用同一套 IPC 推送机制。

```ts
class BackgroundTaskService {
  // 任何模块都可以注册一个任务
  register(type: string): string

  // 模块自行驱动生命周期
  markRunning(taskId: string): void
  markSuccess(taskId: string): void
  markError(taskId: string, error: string): void

  // 内置 execa 执行器（供 npm 类命令使用）
  startBuiltin(type: BuiltinTaskType): Promise<string>

  // 查询与取消
  getAll(): BackgroundTask[]
  cancel(taskId: string): void
}
```

### Two Types of Tasks

| Type         | Who drives execution                      | Example                                         |
| ------------ | ----------------------------------------- | ----------------------------------------------- |
| **Built-in** | BackgroundTaskService 内部用 execa 执行   | `update-npx`, `update-skills`, `install-skills` |
| **External** | 外部模块自行执行，仅向 Service 注册和报告 | `skill-update`, `skill-update-all`              |

### Renderer Notification Flow

```
User clicks 更新
  → confirm dialog
  → taskStore.start(type, { onSuccess, onError })
      → IPC 立即返回 { taskId }（不阻塞）
      → .catch() 捕获重复任务 → message.info('正在进行中')
  → Main process 执行任务
  → 任务完成 → emit 'tasks:update'
  → Renderer store subscribe() 检测状态变更
  → 调用注册的 onSuccess / onError 回调
  → 显示 toast + 自动刷新相关数据
```

## useTaskStore Changes

```ts
export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<BackgroundTask[]>([])
  const callbacks = new Map<string, { onSuccess?: () => void; onError?: (err: string) => void }>()

  async function start(
    type: BackgroundTask['type'],
    opts?: { onSuccess?: () => void; onError?: (err: string) => void }
  ): Promise<string> {
    const result = await window.api.tasks.start({ type })
    if (result.error) throw new Error(result.error)
    if (opts) callbacks.set(result.taskId, opts)
    await sync()
    return result.taskId
  }

  function subscribe(): () => void {
    return window.api.tasks.onUpdate((task) => {
      const idx = tasks.value.findIndex((t) => t.id === task.id)
      if (idx >= 0) {
        const oldStatus = tasks.value[idx].status
        tasks.value[idx] = task
        // 检测完成状态变更
        if (oldStatus !== 'success' && oldStatus !== 'error' && oldStatus !== 'cancelled') {
          if (task.status === 'success') {
            callbacks.get(task.id)?.onSuccess?.()
            callbacks.delete(task.id)
          } else if (task.status === 'error') {
            callbacks.get(task.id)?.onError?.(task.error || '未知错误')
            callbacks.delete(task.id)
          }
        }
      } else {
        tasks.value.push(task)
      }
    })
  }

  // ... cancel, sync, isRunning
})
```

## SettingsView.vue Changes

按钮移除 `loading` / `disabled`：

```vue
<NButton size="tiny" round @click="handleUpdateNpx">
  <template #icon>
    <NIcon :size="12"><RefreshOutline /></NIcon>
  </template>
  更新
</NButton>
```

Handler 改为 fire-and-forget：

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

## Skills Integration

Skills 更新也接入同一套机制。在 `skills.ipc.ts` 新增后台更新 handler：

```ts
ipcMain.handle('skills:update-background', async (_, opts) => {
  const taskId = backgroundTaskService.register('skill-update')
  backgroundTaskService.markRunning(taskId)

  // 不 await，让 IPC 立即返回
  npxService
    .update(opts)
    .then((result) => {
      if (result.ok) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        backgroundTaskService.markError(taskId, result.error.message)
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

Renderer 端同样通过 `taskStore.start('skill-update', callbacks)` 调用。

## Error Handling

| 场景               | 处理方式                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| 重复提交           | `start()` 抛出错误 → `.catch()` → `message.info('xxx 更新正在进行中')`   |
| IPC 通信失败       | `.catch()` → `message.error('启动失败: ...')`                            |
| 任务执行失败       | `onError` 回调 → `message.error('xxx 更新失败: ...')`                    |
| 任务执行成功       | `onSuccess` 回调 → `message.success('xxx 更新成功')` + 自动刷新          |
| 页面刷新时任务完成 | 由于 `tasks:update` 是实时推送，重新订阅后会收到最新状态，toast 正常显示 |
| 应用重启时任务丢失 | 任务存储在主进程内存中，重启后丢失。可接受：用户无通知，可重新操作       |

## Files to Modify

| File                                                | Change                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/main/services/BackgroundTaskService.ts`        | 添加 `register/markRunning/markSuccess/markError` 方法，保留 `startBuiltin` |
| `src/main/ipc/skills.ipc.ts`                        | 添加 `skills:update-background` 和 `skills:update-all-background` handlers  |
| `src/renderer/src/stores/tasks.ts`                  | 添加 callback 注册机制，`subscribe()` 检测完成状态并调用回调                |
| `src/renderer/src/views/SettingsView.vue`           | 按钮移除 loading/disabled，handler 改为 fire-and-forget                     |
| `src/renderer/src/views/SkillDetail.vue` 或技能列表 | 更新按钮改为 fire-and-forget                                                |
| `src/preload/index.ts` + `index.d.ts`               | 暴露 skills 后台更新 API                                                    |

## Verification

1. 点击 npx「更新」→ 确认 → 按钮无变化 → 任务后台运行 → 完成后 toast "npx 更新成功" → 版本号自动刷新
2. 再次快速点击「更新」→ toast "npx 更新正在进行中" → 无重复任务
3. 技能页面点击「更新」→ 同样 fire-and-forget → 完成后 toast + 列表刷新
4. 断开网络后点击更新 → 失败后 toast "更新失败: ..."
