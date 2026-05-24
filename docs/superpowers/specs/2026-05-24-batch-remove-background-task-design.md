# 批量删除技能后台任务化设计文档

## 背景

当前已安装技能页面的批量删除功能（`InstalledList.vue`）采用同步阻塞实现：用户选中多个技能后点击"删除选中"，前端通过 `for...of` 循环串行调用 `skillsStore.remove()`，每轮等待 CLI 命令执行完成。当批量删除数量较多时，UI 长时间处于 loading 状态，用户无法进行其他操作。

## 目标

- 将批量删除从同步阻塞改为后台异步执行
- 采用乐观删除策略：前端立即从列表移除选中项，提升操作流畅感
- 移除批量删除相关的 loading 状态
- 复用现有后台任务系统（`BackgroundTaskService` + `TaskDrawer`），保持交互一致性

## 方案概述

采用**方案 A：乐观删除 + 失败任务提示**。

用户确认删除后：
1. 前端立即从已安装列表中移除选中的 skills，并退出批量模式
2. 向 Main 进程提交一个 `skill-remove-batch` 类型的后台任务
3. Main 进程串行执行 `skills remove <name> -y -g` CLI 命令
4. 任务完成后在 TaskDrawer 中展示结果（全部成功 / 部分失败 / 全部失败）

## 架构设计

### 新增/修改的文件

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `src/shared/types.ts` | 修改 | `BackgroundTask` 的 `type` 联合类型新增 `'skill-remove-batch'` |
| `src/main/ipc/skills.ipc.ts` | 修改 | 新增 `skills:remove-batch-background` IPC handler；`skill-remove-batch` 为非内置任务类型，绕过 `startBuiltin` |
| `src/main/services/BackgroundTaskService.ts` | 不修改 | `resolveCommand` 无需新增 case，批量删除不走 execa |
| `src/renderer/src/stores/tasks.ts` | 修改 | `start()` 方法新增 `skill-remove-batch` 分支；`retry()` 排除 `skill-remove-batch`；扩展 `opts` 类型支持 `packageRefs` |
| `src/renderer/src/views/InstalledList.vue` | 修改 | 改造 `handleBatchRemove`，改为乐观删除 + 提交后台任务；移除 `isBatchRemoving` |
| `src/renderer/src/components/tasks/TaskItem.vue` | 修改 | `TASK_LABELS` 新增 `'skill-remove-batch': '批量删除技能'`；该类型任务隐藏取消按钮 |
| `src/preload/index.ts` | 修改 | 暴露 `removeBatchBackground` IPC 方法 |
| `src/preload/index.d.ts` | 修改 | 类型声明 `removeBatchBackground` |

### 数据流

```
InstalledList.vue
  ├─ 用户确认删除
  ├─ 将 selectedNames 加入 pendingRemovalNames（乐观删除）
  ├─ 调用 taskStore.start('skill-remove-batch', { packageRefs: [...], onSuccess, onError })
  │     └─ window.api.skills.removeBatchBackground({ packageRefs })
  │           └─ Main: skills.ipc.ts
  │                 └─ backgroundTaskService.register('skill-remove-batch')
  │                 └─ 串行执行 skillsService.remove() for each packageRef
  │                 └─ backgroundTaskService.markSuccess / markError
  │           └─ Main 通过 'tasks:update' 推送任务状态
  │     └─ renderer stores/tasks.ts 订阅更新，更新 TaskDrawer
  │     └─ onSuccess / onError callback: 清空 pendingRemovalNames，调用 loadSkills()
  └─ 退出批量模式
```

## 详细设计

### 1. 类型定义（`src/shared/types.ts`）

```typescript
export interface BackgroundTask {
  id: string
  type: 'update-skills' | 'install-node' | 'install-skills' | 'skill-update' | 'skill-update-all' | 'skill-remove-batch'
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  progress: number
  stdout: string
  error?: string
  createdAt: number
  updatedAt: number
}
```

### 2. IPC 层（`src/main/ipc/skills.ipc.ts`）

新增 `skills:remove-batch-background` handler：

- 接收参数：`{ packageRefs: string[] }`（`packageRefs` 即 skill name 列表，与现有 `skills:remove` 的 `packageRef` 参数语义一致）
- 使用 `hasPendingTask('skill-remove-batch')` 防止并发提交
- 注册后台任务：`backgroundTaskService.register('skill-remove-batch')`
- 标记为 running
- 串行遍历 `packageRefs`，逐个调用 `skillsService.remove(packageRef, undefined, true)`
- `stdout` 累积每条 CLI 的输出日志（成功或失败）
- 全部成功 → `markSuccess(taskId)`
- 有失败 → `markError(taskId, 摘要错误信息)`，其中 `error` 字段包含失败 skill 名称列表（如 `"删除失败：skill-a, skill-b"`）
- 返回 `{ taskId }`

**注意**：串行执行是为了避免文件锁冲突，与当前同步实现保持一致。`skill-remove-batch` 为非内置任务类型，不走 `BackgroundTaskService.startBuiltin()`，而是直接在 `skills.ipc.ts` 中管理生命周期（与 `skill-update`、`skill-update-all` 保持一致）。

### 3. 渲染层（`src/renderer/src/views/InstalledList.vue`）

改造 `handleBatchRemove`：

```typescript
async function handleBatchRemove(): Promise<void> {
  if (selectedNames.value.length === 0) return

  const confirmed = await confirmRemoveBatch(selectedNames.value)
  if (!confirmed) return

  const names = [...selectedNames.value]

  // 乐观删除：加入 pendingRemovalNames，展示列表自动过滤
  for (const name of names) {
    pendingRemovalNames.value.add(name)
  }

  // 提交后台任务，通过 callback 在完成后刷新
  await taskStore.start('skill-remove-batch', {
    packageRefs: names,
    onSuccess: () => {
      pendingRemovalNames.value.clear()
      loadSkills()
    },
    onError: () => {
      pendingRemovalNames.value.clear()
      loadSkills()
    }
  })

  exitBatchMode()
}
```

**乐观删除的实现策略**：

由于 `skillsList` 是从 `skillsStore` 的 `installedSkills` computed 而来，直接修改 store 不合适。采用以下策略：

- 在 `InstalledList.vue` 中维护 `pendingRemovalNames = ref<Set<string>>(new Set())`
- 计算展示列表时：`displayedSkills = skillsList.value.filter(s => !pendingRemovalNames.value.has(s.name))`
- 提交后台任务前将 `selectedNames` 加入 `pendingRemovalNames`
- 任务完成后通过 `taskStore.start()` 的 `onSuccess` / `onError` callback 清空 `pendingRemovalNames`，并调用 `loadSkills()` 刷新真实状态

### 4. `tasks.ts` 改动

`start()` 方法新增 `skill-remove-batch` 分支：

```typescript
} else if (type === 'skill-remove-batch') {
  result = await window.api.skills.removeBatchBackground({
    packageRefs: opts?.packageRefs || []
  })
}
```

`opts` 类型扩展为 `TaskCallbacks & { packageRef?: string; packageRefs?: string[]; global?: boolean }`。

`retry()` 方法中排除 `skill-remove-batch`：

```typescript
if (task.type === 'skill-update') {
  throw new Error('单个技能更新不支持重试，请重新执行更新操作')
}
if (task.type === 'skill-remove-batch') {
  throw new Error('批量删除不支持重试，请重新进入批量管理模式执行')
}
```

### 5. Loading 状态移除

- 删除 `isBatchRemoving` ref
- 删除 "删除选中" 按钮的 `:loading="isBatchRemoving"` 绑定
- `skillsStore` 中的 `removing` 相关逻辑：先验证是否被单条删除使用。若仅用于批量删除则一并删除，若单条删除也依赖则保留

### 6. TaskItem.vue 改动

- `TASK_LABELS` 新增：`'skill-remove-batch': '批量删除技能'`
- 取消按钮：该类型任务**不支持取消**（没有子进程可供 `SIGTERM`）。在 `TaskItem.vue` 中根据 `task.type === 'skill-remove-batch'` 隐藏取消按钮

### 7. Preload 改动

`preload/index.ts`：

```typescript
removeBatchBackground: (opts: { packageRefs: string[] }) =>
  ipcRenderer.invoke('skills:remove-batch-background', opts),
```

`preload/index.d.ts`：

```typescript
removeBatchBackground: (opts: { packageRefs: string[] }) => Promise<{ taskId: string; error?: string }>
```

## 错误处理

| 场景 | 处理方式 |
|---|---|
| 用户提交后台任务后立即关闭窗口 | 后台任务在 Main 进程继续执行，不受影响 |
| 部分 skill 删除失败 | TaskDrawer 中任务标记为 error，`stdout` 包含详细日志，`error` 包含失败 skill 名称列表 |
| 全部 skill 删除失败 | 同上 |
| 后台任务执行中用户点击取消 | **不支持取消**，TaskItem 中隐藏取消按钮 |
| 乐观删除后、后台执行前用户刷新页面 | 刷新后 `pendingRemovalNames` 清空，`loadSkills()` 会展示真实状态 |
| 重复提交批量删除任务 | `hasPendingTask('skill-remove-batch')` 拦截，返回错误提示 |

## 边界情况

1. **并发批量删除任务**：`skills:remove-batch-background` handler 入口处通过 `hasPendingTask('skill-remove-batch')` 检测，与 `skill-update`、`skill-update-all` 的并发控制保持一致
2. **全部 skill 删除失败**：TaskDrawer 展示错误信息，页面仍显示乐观删除状态；用户刷新页面后恢复真实列表
3. **删除 0 个 skill**：已在 `handleBatchRemove` 入口处拦截
4. **TaskDrawer 中重试**：`tasks.ts retry()` 中对 `skill-remove-batch` 类型抛出错误，提示用户重新进入批量模式执行

## Spec 自审

- [x] 无 TBD / TODO / 占位符
- [x] 架构描述与数据流一致
- [x] 范围聚焦：仅批量删除任务化，不涉及单条删除改造
- [x] 无歧义：乐观删除策略、错误处理、边界情况均已明确
- [x] 取消机制已明确：不支持取消，TaskItem 中隐藏取消按钮
- [x] 所有改动文件已列入架构表，包含 preload 文件
- [x] 重试排除位置已明确：`tasks.ts retry()` 方法
- [x] 并发控制已明确：`hasPendingTask('skill-remove-batch')`
