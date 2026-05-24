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
| `src/main/ipc/skills.ipc.ts` | 修改 | 新增 `skills:remove-batch-background` IPC handler |
| `src/main/services/BackgroundTaskService.ts` | 修改 | `resolveCommand` 无需新增 case（批量删除不走 execa） |
| `src/renderer/src/stores/tasks.ts` | 修改 | `start()` 方法支持 `skill-remove-batch` 类型（或复用通用分支） |
| `src/renderer/src/stores/skills.ts` | 修改 | 可选：添加 `removeBatchBackground` action |
| `src/renderer/src/views/InstalledList.vue` | 修改 | 改造 `handleBatchRemove`，改为乐观删除 + 提交后台任务 |

### 数据流

```
InstalledList.vue
  ├─ 用户确认删除
  ├─ 前端从 skillsList 中过滤掉 selectedNames（乐观删除）
  ├─ 调用 taskStore.start('skill-remove-batch', { packageRefs: [...] })
  │     └─ window.api.skills.removeBatchBackground({ packageRefs })
  │           └─ Main: skills.ipc.ts
  │                 └─ backgroundTaskService.register('skill-remove-batch')
  │                 └─ 串行执行 skillsService.remove() for each packageRef
  │                 └─ backgroundTaskService.markSuccess / markError
  │           └─ Main 通过 'tasks:update' 推送任务状态
  │     └─ renderer stores/tasks.ts 订阅更新，更新 TaskDrawer
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

- 接收参数：`{ packageRefs: string[] }`
- 注册后台任务：`backgroundTaskService.register('skill-remove-batch')`
- 标记为 running
- 串行遍历 `packageRefs`，逐个调用 `skillsService.remove(packageRef, undefined, true)`
- 收集成功/失败结果到 `stdout`
- 全部成功 → `markSuccess`
- 有失败 → `markError`，错误信息包含失败的 skill 名称列表
- 返回 `{ taskId }`

**注意**：串行执行是为了避免文件锁冲突，与当前同步实现保持一致。

### 3. 渲染层（`src/renderer/src/views/InstalledList.vue`）

改造 `handleBatchRemove`：

```typescript
async function handleBatchRemove(): Promise<void> {
  if (selectedNames.value.length === 0) return

  const confirmed = await confirmRemoveBatch(selectedNames.value)
  if (!confirmed) return

  const names = [...selectedNames.value]

  // 乐观删除：立即从列表移除
  // skillsList 是从 store 获取的 computed，需要一种方式让前端"临时"移除
  // 方案：维护一个本地 "pendingRemoval" Set，在展示时过滤

  // 提交后台任务
  await taskStore.start('skill-remove-batch', {
    packageRefs: names
  })

  exitBatchMode()
}
```

**乐观删除的实现策略**：

由于 `skillsList` 是从 `skillsStore` 的 `installedSkills` computed 而来，直接修改 store 不合适。采用以下策略：

- 在 `InstalledList.vue` 中维护 `pendingRemovalNames: Set<string>`
- 计算展示列表时：`displayedSkills = skillsList.value.filter(s => !pendingRemovalNames.has(s.name))`
- 提交后台任务前将 `selectedNames` 加入 `pendingRemovalNames`
- 后台任务完成后（无论成功失败），清空 `pendingRemovalNames`，依赖 `loadSkills()` 刷新真实状态

### 4. Loading 状态移除

- 删除 `isBatchRemoving` ref
- 删除 "删除选中" 按钮的 `:loading="isBatchRemoving"` 绑定
- 删除 `skillsStore` 中的 `removing` 相关逻辑（如果仅用于批量删除）

## 错误处理

| 场景 | 处理方式 |
|---|---|
| 用户提交后台任务后立即关闭窗口 | 后台任务在 Main 进程继续执行，不受影响 |
| 部分 skill 删除失败 | TaskDrawer 中任务标记为 error，`stdout` 包含失败列表 |
| 全部 skill 删除失败 | 同上 |
| 后台任务执行中用户点击取消 | 停止后续删除，已删除的不再恢复；TaskDrawer 标记为 cancelled |
| 乐观删除后、后台执行前用户刷新页面 | 刷新后 `pendingRemovalNames` 清空，`loadSkills()` 会展示真实状态 |

## 边界情况

1. **选中 skill 已在后台删除中**：不允许重复提交，由 `BackgroundTaskService` 的同类型任务检测（如有需要可添加）
2. **全部 skill 删除失败**：TaskDrawer 展示错误信息，页面仍显示乐观删除状态；用户刷新页面后恢复真实列表
3. **删除 0 个 skill**：已在 `handleBatchRemove` 入口处拦截
4. **TaskDrawer 中重试**：批量删除任务失败后，点击重试是否重新执行全部删除？考虑到复杂度，**不支持重试**，用户需要重新进入批量模式选择删除。需在 TaskDrawer 的 `retry` 逻辑中排除 `skill-remove-batch` 类型。

## Spec 自审

- [x] 无 TBD / TODO / 占位符
- [x] 架构描述与数据流一致
- [x] 范围聚焦：仅批量删除任务化，不涉及单条删除改造
- [x] 无歧义：乐观删除策略、错误处理、边界情况均已明确
