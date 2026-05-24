# 批量删除技能后台任务化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `InstalledList.vue` 和 `AgentView.vue` 的批量删除功能从同步阻塞改为后台异步任务执行，采用乐观删除策略并移除 loading 状态。

**Architecture:** 复用现有 `BackgroundTaskService` 后台任务系统，新增 `skill-remove-batch` 任务类型。IPC handler 支持可选的 `agentFlag` 参数以同时服务全局批量删除（InstalledList）和 Agent 范围批量删除（AgentView）。两页面按 Phase 先后独立实施。

**Tech Stack:** Electron 39, Vue 3.5, TypeScript 5.9, Pinia 3, Naive UI 2.44

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/shared/types.ts` | `BackgroundTask` 类型联合新增 `'skill-remove-batch'` |
| `src/preload/index.ts` | 暴露 `removeBatchBackground` IPC 方法 |
| `src/preload/index.d.ts` | `removeBatchBackground` 类型声明 |
| `src/main/ipc/skills.ipc.ts` | 新增 `skills:remove-batch-background` handler |
| `src/renderer/src/stores/tasks.ts` | `start()` 新增分支；`retry()` 排除；扩展 `opts` 类型 |
| `src/renderer/src/components/tasks/TaskItem.vue` | 新增任务标签；隐藏取消按钮 |
| `src/renderer/src/views/InstalledList.vue` | **Phase 1** 改造：乐观删除 + 提交后台任务 |
| `src/renderer/src/views/AgentView.vue` | **Phase 2** 改造：乐观删除 + 提交后台任务 |

---

## Phase 1: 基础设施 + InstalledList.vue

### Task 1: 共享类型与 Preload

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: 修改 `src/shared/types.ts`**

在 `BackgroundTask` 接口的 `type` 联合类型中新增 `'skill-remove-batch'`：

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

- [ ] **Step 2: 修改 `src/preload/index.ts`**

在 `api.skills` 对象中添加 `removeBatchBackground`：

```typescript
    removeBatchBackground: (opts: {
      packageRefs: string[]
      agentFlag?: string
    }): Promise<{ taskId: string; error?: string }> =>
      ipcRenderer.invoke('skills:remove-batch-background', opts),
```

位置：紧跟在 `updateAllBackground` 之后（约第 38 行后）。

- [ ] **Step 3: 修改 `src/preload/index.d.ts`**

在 `AppApi.skills` 中添加：

```typescript
    removeBatchBackground: (opts: {
      packageRefs: string[]
      agentFlag?: string
    }) => Promise<{ taskId: string; error?: string }>
```

位置：紧跟在 `updateAllBackground` 之后。

- [ ] **Step 4: Commit**

```bash
git add src/shared/types.ts src/preload/index.ts src/preload/index.d.ts
git commit -m "feat: add skill-remove-batch background task types and preload"
```

---

### Task 2: Main IPC Handler

**Files:**
- Modify: `src/main/ipc/skills.ipc.ts`

- [ ] **Step 1: 在 `skills.ipc.ts` 底部新增 `skills:remove-batch-background` handler**

位置：在 `tasks:retry-skill-update` handler 之后（文件末尾附近）。

```typescript
  ipcMain.handle(
    'skills:remove-batch-background',
    async (_, opts: { packageRefs: string[]; agentFlag?: string }) => {
      if (hasPendingTask('skill-remove-batch')) {
        return { taskId: '', error: '批量删除任务正在进行中' }
      }
      const taskId = backgroundTaskService.register('skill-remove-batch')
      backgroundTaskService.markRunning(taskId)

      const failedNames: string[] = []

      for (const packageRef of opts.packageRefs) {
        try {
          const result = await skillsService.remove(packageRef, opts.agentFlag, true)
          if (!result.success) {
            failedNames.push(packageRef)
          }
        } catch (error) {
          failedNames.push(packageRef)
        }
      }

      if (failedNames.length === 0) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        const displayed = failedNames.slice(0, 5).join('、')
        const suffix = failedNames.length > 5 ? ` 等 ${failedNames.length} 个技能` : ''
        backgroundTaskService.markError(taskId, `删除失败：${displayed}${suffix}`)
      }

      return { taskId }
    }
  )
```

**注意**：`skillsService.remove()` 的签名是 `remove(packageRef: string, agent?: string, global?: boolean)`，因此 `opts.agentFlag` 直接作为第二个参数传入。

- [ ] **Step 2: Commit**

```bash
git add src/main/ipc/skills.ipc.ts
git commit -m "feat: add skills:remove-batch-background IPC handler"
```

---

### Task 3: 任务系统适配

**Files:**
- Modify: `src/renderer/src/stores/tasks.ts`
- Modify: `src/renderer/src/components/tasks/TaskItem.vue`

- [ ] **Step 1: 修改 `src/renderer/src/stores/tasks.ts`**

扩展 `TaskCallbacks` 的 `opts` 类型并新增 `skill-remove-batch` 分支：

```typescript
interface TaskCallbacks {
  onSuccess?: () => void
  onError?: (err: string) => void
}
```

将 `start()` 方法的签名从：
```typescript
async function start(
    type: string,
    opts?: TaskCallbacks & { packageRef?: string; global?: boolean }
  ): Promise<string> {
```

改为：
```typescript
async function start(
    type: string,
    opts?: TaskCallbacks & { packageRef?: string; packageRefs?: string[]; agentFlag?: string; global?: boolean }
  ): Promise<string> {
```

在 `start()` 的 `if/else` 链中，新增 `skill-remove-batch` 分支（放在 `skill-update-all` 之后、else 之前）：

```typescript
    } else if (type === 'skill-remove-batch') {
      result = await window.api.skills.removeBatchBackground({
        packageRefs: opts?.packageRefs || [],
        agentFlag: opts?.agentFlag
      })
```

在 `retry()` 方法中，在 `skill-update` 排除之后新增：

```typescript
    if (task.type === 'skill-remove-batch') {
      throw new Error('批量删除不支持重试，请重新进入批量管理模式执行')
    }
```

- [ ] **Step 2: 修改 `src/renderer/src/components/tasks/TaskItem.vue`**

在 `TASK_LABELS` 中添加：

```typescript
const TASK_LABELS: Record<string, string> = {
  'update-skills': '更新 skills 命令行工具',
  'install-node': '安装 Node.js',
  'install-skills': '安装 skills 命令行工具',
  'skill-update': '更新技能',
  'skill-update-all': '批量更新技能',
  'skill-remove-batch': '批量删除技能'
}
```

取消按钮当前条件为 `v-if="isActive"`。由于 `skill-remove-batch` 不支持取消（没有子进程可供 `SIGTERM`），将该条件改为：

```typescript
const canCancel = computed(() => isActive.value && props.task.type !== 'skill-remove-batch')
```

并将模板中的 `v-if="isActive"` 改为 `v-if="canCancel"`。

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/tasks.ts src/renderer/src/components/tasks/TaskItem.vue
git commit -m "feat: support skill-remove-batch in task store and task item UI"
```

---

### Task 4: InstalledList.vue 改造

**Files:**
- Modify: `src/renderer/src/views/InstalledList.vue`

- [ ] **Step 1: 移除 `isBatchRemoving` 相关代码**

删除 `isBatchRemoving` ref 的定义（第 33 行）：
```typescript
const isBatchRemoving = ref(false)
```

删除 `handleBatchRemove` 中对 `isBatchRemoving` 的读取和写入（第 84 行和第 88、116 行）。

删除删除按钮的 `:loading="isBatchRemoving"` 绑定（第 318 行）。

- [ ] **Step 2: 新增乐观删除状态**

在 `selectedNames` ref 之后添加：

```typescript
const pendingRemovalNames = ref<Set<string>>(new Set())
```

- [ ] **Step 3: 计算过滤后的展示列表**

添加 computed：

```typescript
const displayedSkills = computed(() =>
  skillsStore.filteredSkills.filter((s) => !pendingRemovalNames.value.has(s.name))
)
```

- [ ] **Step 4: 改造 `handleBatchRemove`**

将 `handleBatchRemove` 替换为：

```typescript
async function handleBatchRemove(): Promise<void> {
  if (selectedNames.value.length === 0) return
  const confirmed = await confirmRemoveBatch(selectedNames.value)
  if (!confirmed) return

  const names = [...selectedNames.value]

  // 乐观删除：立即加入 pendingRemovalNames
  for (const name of names) {
    pendingRemovalNames.value.add(name)
  }

  taskStore
    .start('skill-remove-batch', {
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
    .catch((e) => {
      notify.info(e instanceof Error ? e.message : '启动删除失败')
      pendingRemovalNames.value.clear()
      loadSkills()
    })

  exitBatchMode()
}
```

- [ ] **Step 5: 模板中使用 `displayedSkills` 替代 `skillsStore.filteredSkills`**

需要修改三处：
1. 全选判断：`skillsStore.filteredSkills` → `displayedSkills.value`
2. 列表渲染 `v-for`：`skillsStore.filteredSkills` → `displayedSkills`
3. 空列表判断：`skillsStore.filteredSkills.length` → `displayedSkills.length`

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/views/InstalledList.vue
git commit -m "feat: convert InstalledList batch remove to background task with optimistic deletion"
```

---

### Task 5: Phase 1 验证

- [ ] **Step 1: Type check**

```bash
npm run typecheck
```

Expected: 无类型错误。

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: 无 lint 错误。

- [ ] **Step 3: Dev 验证**

```bash
npm run dev
```

在应用中执行以下验证：
1. 进入"我的技能"页面，点击"批量管理"
2. 选中若干技能，点击"删除选中"
3. 确认删除后：
   - 列表中选中技能应立即消失（乐观删除）
   - 无 loading 状态
   - 批量模式自动退出
   - TaskDrawer 中出现"批量删除技能"后台任务
4. 等待任务完成后，TaskDrawer 中显示成功/失败状态
5. 若任务失败，刷新页面后失败的 skill 重新出现

- [ ] **Step 4: Commit（如有修复）**

如有修复，单独 commit。

---

## Phase 2: AgentView.vue 改造

**前置条件：Phase 1 已完成且验证通过。**

### Task 6: AgentView.vue 改造

**Files:**
- Modify: `src/renderer/src/views/AgentView.vue`

- [ ] **Step 1: 移除 `isBatchRemoving` 相关代码**

删除 `isBatchRemoving` ref 的定义（第 35 行）：
```typescript
const isBatchRemoving = ref(false)
```

删除 `handleBatchRemove` 中对 `isBatchRemoving` 的读取和写入（第 145 行和第 149、178 行）。

删除删除按钮的 `:loading="isBatchRemoving"` 绑定（第 380 行）。

- [ ] **Step 2: 新增乐观删除状态**

在 `selectedSkillNames` ref 之后添加：

```typescript
const pendingRemovalNames = ref<Set<string>>(new Set())
```

- [ ] **Step 3: 计算过滤后的展示列表**

添加 computed：

```typescript
const displayedAgentSkills = computed(() => {
  const skills = selectedAgent.value?.skills || []
  return skills.filter((s) => !pendingRemovalNames.value.has(s))
})
```

- [ ] **Step 4: 改造 `handleBatchRemove`**

将 `handleBatchRemove` 替换为：

```typescript
async function handleBatchRemove(): Promise<void> {
  if (selectedSkillNames.value.length === 0) return
  const confirmed = await confirmRemoveBatch(selectedSkillNames.value)
  if (!confirmed) return

  const names = [...selectedSkillNames.value]
  const agentFlag = selectedAgent.value?.agentFlag

  // 乐观删除：立即加入 pendingRemovalNames
  for (const name of names) {
    pendingRemovalNames.value.add(name)
  }

  taskStore
    .start('skill-remove-batch', {
      packageRefs: names,
      agentFlag,
      onSuccess: () => {
        pendingRemovalNames.value.clear()
        skillsStore.fetchInstalled()
      },
      onError: () => {
        pendingRemovalNames.value.clear()
        skillsStore.fetchInstalled()
      }
    })
    .catch((e) => {
      notify.info(e instanceof Error ? e.message : '启动删除失败')
      pendingRemovalNames.value.clear()
      skillsStore.fetchInstalled()
    })

  exitBatchMode()
}
```

- [ ] **Step 5: 模板中使用 `displayedAgentSkills` 替代 `selectedAgent.skills`**

需要修改三处：
1. 全选判断：`selectedAgent.value?.skills` → `displayedAgentSkills.value`
2. 列表渲染 `v-for`：`selectedAgent.skills` → `displayedAgentSkills`
3. `allSelected` computed 中：`selectedAgent.value?.skills` → `displayedAgentSkills.value`

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "feat: convert AgentView drawer batch remove to background task with optimistic deletion"
```

---

### Task 7: Phase 2 验证

- [ ] **Step 1: Type check**

```bash
npm run typecheck
```

Expected: 无类型错误。

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: 无 lint 错误。

- [ ] **Step 3: Dev 验证**

```bash
npm run dev
```

在应用中执行以下验证：
1. 进入"AI 工具管理"页面，点击任意 Agent 卡片打开 Drawer
2. 点击"批量管理"，选中若干技能，点击"删除"
3. 确认删除后：
   - Drawer 中选中技能应立即消失（乐观删除）
   - 无 loading 状态
   - 批量模式自动退出
   - TaskDrawer 中出现"批量删除技能"后台任务
4. 等待任务完成后，TaskDrawer 中显示成功/失败状态
5. 验证只从当前 Agent 中删除（global 页面中其他 Agent 的同名 skill 不受影响）

- [ ] **Step 4: Commit（如有修复）**

如有修复，单独 commit。

---

## 自审检查

### Spec 覆盖检查

| 设计文档要求 | 对应任务 |
|---|---|
| `BackgroundTask` 类型新增 `'skill-remove-batch'` | Task 1 Step 1 |
| 新增 `skills:remove-batch-background` IPC handler | Task 2 Step 1 |
| `start()` 新增 `skill-remove-batch` 分支 | Task 3 Step 1 |
| `retry()` 排除 `skill-remove-batch` | Task 3 Step 1 |
| `opts` 类型扩展 `packageRefs` / `agentFlag` | Task 3 Step 1 |
| `TaskItem.vue` 新增标签 + 隐藏取消按钮 | Task 3 Step 2 |
| Preload 暴露 `removeBatchBackground` | Task 1 Step 2-3 |
| `InstalledList.vue` 乐观删除 + 移除 loading | Task 4 |
| `AgentView.vue` 乐观删除 + 移除 loading | Task 6 |
| `hasPendingTask('skill-remove-batch')` 并发控制 | Task 2 Step 1 |

### 占位符扫描

- [x] 无 TBD / TODO / "implement later" / "similar to Task N"
- [x] 所有代码步骤包含完整代码
- [x] 所有文件路径准确

### 类型一致性检查

- `packageRefs` 在 preload、ipc handler、tasks store 中类型一致：`string[]`
- `agentFlag` 在 preload、ipc handler、tasks store 中类型一致：`string | undefined`
- IPC handler 返回值：`{ taskId: string; error?: string }` 与 `updateBackground` 等保持一致
