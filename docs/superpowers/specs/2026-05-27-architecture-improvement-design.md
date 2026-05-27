# SkillDeck 架构改进设计文档

**日期**：2026-05-27
**来源**：基于 [architecture-review-report.md](../../../reviews/2026-05-27-architecture-review/architecture-review-report.md) 的审查结论
**方案**：方案 A — 按报告优先级分 5 个独立阶段逐步推进，每阶段独立验证

---

## 总体路线图

```
P0 (8h) ──→ P0.5 (7h) ──→ P1 (18h) ──→ P2 (12h) ──→ P3 (11h)
安全修复      DRY/内聚      降低耦合      架构升级      长期优化
```

**关键原则**：每阶段完成后必须独立验证（`npm run build` + 手动功能测试 + lint），确保无回归后才能进入下一阶段。阶段之间通过 git tag 标记检查点。

---

## 各阶段范围与边界

### P0 — 安全与核心修复（8h）

**目标**：消除安全风险，修复运行时 bug，迁移关键业务逻辑。

| # | 问题 | 涉及文件 | 交付物 |
|---|------|---------|--------|
| P0-1 | 修复 `skills:cleanup-temp` 路径逃逸（🔴 Critical） | `ipc/skills.ipc.ts` | 使用 `fs.realpath` + 严格比较 |
| P0-2 | 修复 `ArchiveSkillInstaller.extractAndScan()` 路径前缀绕过 | `services/ArchiveSkillInstaller.ts` | 统一路径校验函数 |
| P0-3 | 修复 `BackgroundTaskService` stderr 误写入 stdout（L1 bug） | `services/BackgroundTaskService.ts` | stderr 独立存储/上报 |
| P0-4 | 加强 `skills:install` source 参数输入验证 | `ipc/skills.ipc.ts` | URL 格式正则校验 |
| P0-5 | 将后台任务编排逻辑从 IPC 迁移到 Service 层 | `ipc/skills.ipc.ts` + `BackgroundTaskService.ts` | IPC handler 只负责转发 |

**边界**：P0 只做安全修复和必要迁移，不做大规模重构。`skills.ipc.ts` 在 P0 中只减少约 80 行（迁移任务编排逻辑），完整拆分留在 P1。

---

### P0.5 — 高优先级优化（7h）

**目标**：消除重复逻辑，改善 Store 内聚度，补齐类型安全。

| # | 问题 | 涉及文件 | 交付物 |
|---|------|---------|--------|
| P0.5-6 | 拆分 `useSkillsStore`，分离 UI 状态 | `stores/skills.ts` | `useSkillsDataStore` + `useSkillsFilterStore` |
| P0.5-7 | 提取 `useBatchRemove` 减少批量删除重复 | `InstalledList.vue` + `AgentView.vue` | 新 composable + 两组件复用 |
| P0.5-8 | Preload `Promise<unknown>` 显式添加类型断言 | `preload/index.ts` | 运行时类型断言 + 与 `index.d.ts` 对齐 |

**边界**：P0.5 只做 DRY 和类型安全优化，不改 IPC 接口签名（向后兼容）。

---

### P1 — 降低耦合（18h）

**目标**：拆分 God File，解耦跨层依赖，统一格式。

| # | 问题 | 涉及文件 | 交付物 |
|---|------|---------|--------|
| P1-9 | 统一错误响应格式 | `shared/types.ts` + 所有 IPC | `IpcError` 统一 + CLI 扩展字段 |
| P1-10 | 拆分 `skills.ipc.ts` 为子域模块 | `ipc/skills.ipc.ts` | `skills-install.ipc.ts`、`skills-query.ipc.ts` 等 |
| P1-11 | 解耦 `BackgroundTaskService` 与 `WindowManager` | `BackgroundTaskService.ts` | EventEmitter 替代直接 IPC 调用 |
| P1-12 | 提取通用下载工具函数 | `EnvService.ts` + `GitHubSkillInstaller.ts` | `downloadWithProgress()` 共享函数 |
| P1-13 | 拆分 `SettingsView` 为子组件 | `views/SettingsView.vue` | 4+ 子组件 |
| P1-14 | 提取 `LocalInstallerLayout` | `GitHubInstaller.vue` + `ArchiveInstaller.vue` | 可复用布局组件 |
| P1-15 | 统一 themeOverrides 维护机制 | `App.vue` + `tokens.css` | 同步脚本或映射文件 |

---

### P2 — 架构升级（12h）

| # | 问题 | 涉及文件 | 交付物 |
|---|------|---------|--------|
| P2-16 | 引入 `ISkillSourceInstaller` 接口 | `services/*Installer.ts` | 统一 Installer 契约 |
| P2-17 | 重构 `CommandRunner` 支持多进程 | `CommandRunner.ts` | 返回带 `cancel()` 的句柄 |
| P2-18 | 重构 `TaskStore.start()` 使用注册表 | `stores/tasks.ts` | 任务类型注册表模式 |
| P2-19 | 统一 `SkillInstallDialog` 与 `useSkillInstall` | `SkillInstallDialog.vue` + `useSkillInstall.ts` | 单一状态管理者 |
| P2-20 | 清理 `shared/types.ts` | `shared/types.ts` | 删除 Skill 接口、迁移工具函数 |
| P2-21 | 提取共享路径工具函数 | 3 个文件 | `expandTildePath()` |

---

### P3 — 长期优化（11h）

| # | 问题 | 涉及文件 | 交付物 |
|---|------|---------|--------|
| P3-22 | 引入依赖注入容器（可选） | 所有 services | 评估后决定是否实施 |
| P3-23 | 统一 zip 解压库 | `GitHubSkillInstaller.ts` | `decompress` 替代 `yauzl` |
| P3-24 | 为 `useCachedResource` 添加 TTL | `useCachedResource.ts` | `ttl` 参数支持 |

---

## 验证策略（每阶段通用）

1. **构建验证**：`npm run build` 零错误、零类型错误
2. **Lint 验证**：`npm run lint` 通过
3. **功能验证**：手动测试该阶段涉及的 IPC 通道/组件
4. **回归验证**：检查未修改的功能是否正常工作

---

## P0 详细设计

### P0-1：修复 `skills:cleanup-temp` 路径逃逸（🔴 Critical）

**当前漏洞**（`skills.ipc.ts:245-253`）：

```typescript
const resolved = path.resolve(dir)
if (resolved.startsWith(tmpDir) && path.basename(resolved).startsWith('skills-')) {
```

Windows 上 `C:\...\Tempfake` 会以 `C:\...\Temp` 开头，`startsWith` 校验失效。

**修复方案**：

1. **提取共享路径安全校验函数** `src/main/utils/pathSecurity.ts`：

```typescript
import fs from 'fs'
import path from 'path'

/**
 * 校验 child 路径是否严格位于 parent 目录内部。
 * 使用 fs.realpath 消除符号链接，使用 path.relative 避免前缀绕过。
 */
export function isPathInside(parent: string, child: string): boolean {
  try {
    const realParent = fs.realpathSync(parent)
    const realChild = fs.realpathSync(child)
    const rel = path.relative(realParent, realChild)
    return !rel.startsWith('..') && !path.isAbsolute(rel)
  } catch {
    return false
  }
}
```

2. **修改 `skills:cleanup-temp` handler**：

```typescript
import { isPathInside } from '../utils/pathSecurity'

ipcMain.handle('skills:cleanup-temp', async (_, tempDirs: string[]) => {
  const tmpDir = os.tmpdir()
  for (const dir of tempDirs) {
    const resolved = path.resolve(dir)
    // 双重校验：路径安全 + 命名前缀
    if (
      isPathInside(tmpDir, resolved) &&
      path.basename(resolved).startsWith('skills-')
    ) {
      await localSkillInstaller.cleanupTempDir(resolved)
    }
  }
})
```

---

### P0-2：修复 `ArchiveSkillInstaller.extractAndScan()` 路径前缀绕过

**当前漏洞**（`ArchiveSkillInstaller.ts:34-38`）：

```typescript
if (!path.resolve(tempDir, f.path).startsWith(resolvedTemp + path.sep)) {
```

与 P0-1 相同的 `startsWith` 绕过模式。

**修复方案**：

复用 P0-1 提取的 `isPathInside`：

```typescript
import { isPathInside } from '../utils/pathSecurity'

// 在 extractAndScan 中：
for (const f of files) {
  const extractedPath = path.resolve(tempDir, f.path)
  if (!isPathInside(tempDir, extractedPath)) {
    throw new Error('Archive contains entries outside the target directory')
  }
}
```

---

### P0-3：修复 `BackgroundTaskService` stderr 误写入 stdout

**当前 bug**（`BackgroundTaskService.ts:111-115`）：

```typescript
child.stderr?.on('data', (data: Buffer) => {
  task.stdout += data.toString()  // ❌ BUG: 应该是 task.stderr
})
```

**修复方案**：

1. **扩展 `BackgroundTask` 类型**（`shared/types.ts:10-25`），添加 `stderr` 字段：

```typescript
export interface BackgroundTask {
  // ... existing fields
  stdout: string
  stderr: string  // 新增
  error?: string
}
```

2. **修改 `BackgroundTaskService`**：

- `register()` 中初始化 `stderr: ''`
- 修改 `child.stderr.on('data')` 写入 `task.stderr`
- 修改 `child.on('exit')` 的 error detail 使用 `task.stderr`：

```typescript
child.on('exit', (code) => {
  if (code === 0) {
    this.markSuccess(id)
  } else {
    const detail = task.stderr.trim() || task.stdout.trim()
    this.markError(id, `Exit code: ${code}${detail ? `\n${detail}` : ''}`)
  }
})
```

- `retryBuiltIn()` 中同步清空 `stderr`（与 `stdout` 一起）

3. **验证 `tasks.ipc.ts`**：确保 `task:update` 事件消费端能正确显示 stderr（如有 UI 显示需求）。

---

### P0-4：加强 `skills:install` source 参数输入验证

**当前问题**：`skills:install` handler 直接透传 `source`，无任何校验。

**修复方案**：

在 `skills:install` 和 `skills:install-streaming` handler 中添加前置校验：

```typescript
function validateInstallSource(source: unknown): string {
  if (typeof source !== 'string' || source.trim() === '') {
    throw new Error('安装来源不能为空')
  }
  const trimmed = source.trim()
  if (trimmed.length > 200) {
    throw new Error('安装来源过长')
  }
  // skills source 格式：owner/repo 或 owner/repo/subpath
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)*$/.test(trimmed)) {
    throw new Error('安装来源格式无效，应为 owner/repo 格式')
  }
  return trimmed
}
```

```typescript
ipcMain.handle('skills:install', async (_, opts) => {
  try {
    const source = validateInstallSource(opts.source)
    return { ok: true, data: await skillsService.install(source, opts.agents, opts.global) }
  } catch (e) {
    return { ok: false, error: serializeError(e) }
  }
})
```

---

### P0-5：将后台任务编排逻辑从 IPC 迁移到 Service 层

**当前问题**：
- `skills.ipc.ts:261-353` 直接包含 `skill-update`/`skill-update-all`/`skill-remove-batch` 的任务执行逻辑
- `skills.ipc.ts:355-388` `tasks:retry-skill-update` 也在 IPC 中实现
- `BackgroundTaskService` 只支持 `update-skills`/`install-skills`，其他类型报错

**修复方案**：

1. **在 `BackgroundTaskService` 中引入 `TaskExecutor` 注册表**：

```typescript
// 新增接口
export interface TaskExecutor {
  /** 执行任务，负责调用 markSuccess / markError */
  execute(taskId: string, payload: unknown): Promise<void>
}

class BackgroundTaskService {
  private executors = new Map<string, TaskExecutor>()

  registerExecutor(type: TaskType, executor: TaskExecutor): void {
    this.executors.set(type, executor)
  }

  async startTask(type: TaskType, payload: unknown): Promise<string> {
    if (hasPendingTask(type)) {
      throw new Error(`A ${type} task is already running`)
    }
    const id = this.register(type)
    const executor = this.executors.get(type)
    if (!executor) {
      throw new Error(`No executor registered for task type: ${type}`)
    }
    this.markRunning(id)
    executor.execute(id, payload).catch((error) => {
      this.markError(id, error instanceof Error ? error.message : String(error))
      this.cleanup(id)
    })
    return id
  }
}
```

2. **在 Service 初始化时注册 skills 任务执行器**（例如 `SkillsService.ts` 或独立文件）：

```typescript
// src/main/services/SkillTaskExecutors.ts
export function registerSkillTaskExecutors(): void {
  backgroundTaskService.registerExecutor('skill-update', {
    async execute(taskId, payload) {
      const { packageRef, global } = payload as { packageRef: string; global?: boolean }
      const result = await skillsService.update(packageRef, global)
      if (result.success) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        backgroundTaskService.markError(taskId, result.stderr || '更新失败')
      }
    }
  })

  backgroundTaskService.registerExecutor('skill-update-all', {
    async execute(taskId, payload) {
      const { global } = payload as { global?: boolean }
      const result = await skillsService.updateAll(global)
      if (result.success) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        backgroundTaskService.markError(taskId, result.stderr || '更新失败')
      }
    }
  })

  backgroundTaskService.registerExecutor('skill-remove-batch', {
    async execute(taskId, payload) {
      const { packageRefs, agentFlag } = payload as { packageRefs: string[]; agentFlag?: string }
      // ... 原有的批量删除逻辑
      if (failedNames.length === 0) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        backgroundTaskService.markError(taskId, `删除失败：...`)
      }
    }
  })
}
```

3. **简化 IPC handler**，只做参数校验和调用：

```typescript
// skills.ipc.ts
ipcMain.handle('skills:update-background', async (_, opts) => {
  try {
    const taskId = await backgroundTaskService.startTask('skill-update', opts)
    return { taskId }
  } catch (e) {
    return { taskId: '', error: e instanceof Error ? e.message : String(e) }
  }
})
```

4. **支持 `tasks:retry`** 对 skill 任务的重试：
`retryBuiltIn()` 从 `this.executors` 获取 executor 重新执行。

5. **移动 `tasks:retry-skill-update`** 到 `tasks.ipc.ts`（命名空间修正，为 P1-10 做准备）。

---

## P0 验收标准

| 验收项 | 验证方法 |
|--------|---------|
| cleanup-temp 拒绝 `C:\...\Tempfake\skills-xxx` | 单元测试等价：手动构造非法路径验证 |
| Archive 解压拒绝 `../etc/passwd` 路径 | 手动构造恶意 zip 验证 |
| BackgroundTask stderr 内容写入 `task.stderr` | 触发一个失败任务，检查 task.stderr 有内容 |
| skills:install 拒绝非法 source | 传入空字符串/超长字符串/非法字符，验证返回 error |
| skill-update/skill-update-all/skill-remove-batch 通过 BackgroundTaskService 执行 | 功能回归测试：三种任务正常完成 |
| `npm run build` + `npm run lint` 通过 | 构建验证 |

---

## P0 实施顺序

P0 的 5 个任务相互之间有依赖关系：

1. **P0-1 + P0-2**（共用 `isPathInside` 工具函数，必须一起实施）
2. **P0-3**（类型变更，影响所有任务消费方）
3. **P0-4**（独立，无依赖）
4. **P0-5**（依赖 P0-3 的 `stderr` 字段）

---

## 附录：P0.5-P3 简要概述

P0.5-P3 的详细设计将在各自阶段开始前独立进行。以下为简要概述：

### P0.5

- **拆分 useSkillsStore**：将 `searchKeyword`、`selectedAgents`、`filteredSkills` 等 UI 过滤状态提取到 `useSkillsFilterStore`，原 Store 只保留数据获取和操作逻辑。
- **提取 useBatchRemove**：将 `InstalledList.vue` 和 `AgentView.vue` 中重复的批量删除逻辑提取为 `useBatchRemove` composable。
- **Preload 类型断言**：在 `preload/index.ts` 中为每个 `invoke` 调用添加显式类型断言，与 `index.d.ts` 对齐。

### P1

- **统一错误格式**：将 `CommandErrorInfo` 合并到 `IpcError`，保留 CLI 扩展字段为可选。
- **拆分 skills.ipc.ts**：按子域拆分为 `skills-query.ipc.ts`、`skills-install.ipc.ts`、`skills-update.ipc.ts` 等。
- **解耦 BackgroundTaskService**：通过 EventEmitter 替代直接 `getMainWindow().webContents.send()`。
- **提取下载工具**：提取 `downloadWithProgress` 供 `EnvService` 和 `GitHubSkillInstaller` 复用。
- **拆分 SettingsView**：拆分为 GeneralSettings、AgentSettings、NpmSettings、EnvSettings、UpdaterSettings 子组件。
- **提取 LocalInstallerLayout**：统一 GitHub/Archive 安装器的双栏布局。

### P2

- **ISkillSourceInstaller 接口**：为三种 Installer 定义统一接口。
- **CommandRunner 多进程**：支持同时运行多个命令，返回带 `cancel()` 的句柄。
- **TaskStore 注册表**：将 if/else 链改为任务类型注册表模式。
- **统一 SkillInstallDialog 状态**：由 composable 统一管理安装状态。
- **清理 shared/types.ts**：删除未使用的 Skill 接口，迁移工具函数到独立文件。

### P3

- **依赖注入容器**：评估是否引入 DI 容器替代全局单例。
- **统一 zip 解压库**：使用 `decompress` 替代 `yauzl`。
- **useCachedResource TTL**：添加可选 ttl 参数。
