# SkillDeck 架构审查报告

**审查日期：** 2026-05-27
**审查范围：** Main Process、Renderer Process、Preload & IPC 通信层
**审查维度：** 高内聚低耦合、单一职责原则、依赖方向、接口稳定性、类型安全

---

## 执行摘要

### 总体评分：7.0 / 10

| 维度 | 评分 | 状态 |
|------|------|------|
| Main Process | 6.5/10 | 模块划分清晰，但存在 God File 和职责泄露 |
| Renderer Process | 7.0/10 | 组件层次清晰，但 Store 职责过重、视图臃肿 |
| Preload & IPC | 6.5/10 | 安全边界基本合规，类型安全为编译时保障 |

> **项目约束说明：** 本应用为 Electron 桌面 GUI 包装器（单用户、无测试基础设施），架构审查应以此约束为前提，避免用 Web 后端服务的标准评判桌面应用。

**核心结论：** 项目整体采用了合理的三层架构（Main / Preload / Renderer），职责边界在大方向上是正确的。但存在一个**结构性问题**贯穿三层：`skills` 域的业务逻辑高度集中且缺乏抽象，导致 `skills.ipc.ts`（389行 God File）、`useSkillsStore`（数据层与UI层混合）、以及 Installer 类之间形成了**强耦合的编织层**。这个问题是大部分设计债务的根源。

### 风险矩阵

| 风险项 | 影响 | 概率 | 等级 |
|--------|------|------|------|
| cleanup-temp 路径逃逸（Windows 前缀绕过） | 高 | 中 | 🔴 Critical |
| skills.ipc.ts God File 导致修改冲突 | 中 | 高 | 🟡 Warning |
| Preload 类型安全仅为编译时保障（运行时 any） | 低 | 中 | 🟡 Warning |
| skills:install source 参数缺少输入验证 | 中 | 低 | 🟡 Warning |
| BackgroundTaskService 职责不完整导致维护困难 | 中 | 高 | 🟡 Warning |
| Store 混合 UI 状态导致难以测试 | 低 | 中 | 🟡 Warning |
| 批量删除逻辑在多处重复 | 低 | 中 | 🟡 Warning |
| 视图组件臃肿（SettingsView 1000行，含~300行样式） | 低 | 中 | 🟡 Warning |

---

## 跨维度架构问题

以下问题影响多个维度，需要跨层协作修复：

### X1 — `skills` 域缺乏统一抽象

**位置：** `src/main/ipc/skills.ipc.ts`、`src/main/services/*Installer.ts`、`src/renderer/src/stores/skills.ts`

**问题描述：**
Main Process 中三种 Installer（GitHub / Archive / Local）没有共同接口，`skills.ipc.ts` 必须分别了解每个 Installer 的 API。Renderer 中 `skillsStore` 同时管理了数据获取、UI过滤、操作状态。这形成了一个**技能域的知识在各个层中分散且重复**的局面。

**跨层影响：**
- Main：Installer 无法互换，新增来源需要修改 `skills.ipc.ts`
- Preload：需要为每种安装方式暴露独立的 IPC channel
- Renderer：`skillsStore` 承担了本应由多个 Store 分担的职责

**改进建议：**
1. Main 层定义 `ISkillSourceInstaller` 接口，统一三种 Installer 的契约
2. 将 `skills.ipc.ts` 按子域拆分为多个 IPC 模块
3. Renderer 层将 `useSkillsStore` 拆分为 `useSkillsDataStore` + `useSkillsFilterStore`

### X2 — 后台任务模型不一致

**位置：** `src/main/services/BackgroundTaskService.ts`、`src/main/ipc/skills.ipc.ts`、`src/main/ipc/tasks.ipc.ts`、`src/shared/types.ts`

**问题描述：**
`BackgroundTaskService` 只内置了 `update-skills` / `install-skills` 两种任务的执行逻辑，但 `skills.ipc.ts` 中直接注册了 `skill-update` / `skill-update-all` / `skill-remove-batch` 类型任务并自行管理执行。这导致：
- `tasks:retry` 无法重试 `skill-update`（`tasks.ipc.ts` 硬编码了不支持列表）
- `tasks:retry-skill-update` 以 `tasks:` 前缀命名却实现在 `skills.ipc.ts` 中
- `shared/types.ts` 中的 `TaskType` 联合类型需要被强制转换（`as TaskType`）

**改进建议：**
引入 `TaskExecutor` 接口，各业务模块注册自己的执行器到 `BackgroundTaskService`，统一由后者管理生命周期。

### X3 — 错误处理格式不统一（部分属于不同 API 模式）

**位置：** `src/shared/types.ts`、`src/main/ipc/skills.ipc.ts`、`src/main/ipc/index.ts`

**问题描述：**
`skills.ipc.ts` 使用 `serializeError()` 返回 `CommandErrorInfo`，`tasks.ipc.ts` 等使用 `toIpcError()` 返回 `IpcError`。两者结构不同。

**重要区分：** `skills` IPC 返回同步结果（`{ok, data/error}`），而 `tasks` IPC 返回异步任务句柄（`{taskId, error}`），这代表**两种不同的 API 模式**（同步结果 vs 异步任务 ID），并非同一模式下的格式混乱。

`skills.ipc.ts` 中的 `CommandErrorInfo` 包含 CLI 专用字段（`command`、`stderr`、`exitCode`），`IpcError` 是通用格式。两者语义不同，统一为扩展字段是合理优化方向。

**改进建议：**
统一为 `IpcError`，将 `command`/`stderr`/`exitCode` 作为可选扩展字段，保留语义差异。

---

## Main Process 详细审查（评分：6.5/10）

### 模块职责分析

#### `SkillsService` — 内聚度：中

**职责：** 封装 `npx skills` CLI 调用

**问题：**
- `remove()` 直接操作文件系统（`fs.promises.rm`），与 CLI 封装职责不一致。**注意：这是有意绕过**——skills CLI 对 universal agent 存在假成功 bug，因此直接操作文件系统。
- `readDoc()` 遍历 Agent 路径查找 SKILL.md，与 `AgentScanner` 职责重叠
- 依赖 `StoreService.getSettings()` 读取代理配置，增加了横向耦合

**位置：** `src/main/services/SkillsService.ts:52-83`

#### `BackgroundTaskService` — 内聚度：低 ⚠️

**职责：** 管理后台任务生命周期

**问题：**
- 只内置了 2 种任务执行逻辑，其他 3 种散落在 `skills.ipc.ts` 中
- 直接依赖 `WindowManager.getMainWindow()` 发送 IPC，违反分层原则
- `retryBuiltIn()` 与 `startBuiltin()` 大量重复

**位置：** `src/main/services/BackgroundTaskService.ts`、`src/main/ipc/skills.ipc.ts:261-353`

#### `CommandRunner` — 内聚度：高

**职责：** 封装 `execa` 调用

**问题：**
- 单例 `activeProcess` 限制全局只能同时运行一个命令
- `BackgroundTaskService` 绕过 `CommandRunner` 直接使用 `execa`

**位置：** `src/main/services/CommandRunner.ts:46`

#### 三种 Installer — 内聚度：中/中/高

**职责：** 不同来源的技能安装

**问题：**
- 无共同接口，导致调用方必须了解每个 Installer 的 API
- `LocalSkillInstaller` 名字暗示只处理本地，实际还承担扫描和清理职责
- `GitHubSkillInstaller` 和 `ArchiveSkillInstaller` 使用两套 zip 解压库（yauzl vs decompress）

**位置：** `src/main/services/GitHubSkillInstaller.ts`、`src/main/services/ArchiveSkillInstaller.ts`、`src/main/services/LocalSkillInstaller.ts`

### 耦合度分析

```
强耦合链：
skills.ipc.ts ──► SkillsService ──► CommandRunner（单例 activeProcess）
              ──► GitHubSkillInstaller ──► LocalSkillInstaller
              ──► ArchiveSkillInstaller ──► LocalSkillInstaller
              ──► BackgroundTaskService ──► WindowManager（跨层！）
              ──► AgentScanner
              ──► searchSkillsApi

跨层违规：
BackgroundTaskService.emitUpdate() 直接调用 getMainWindow().webContents.send()
```

### Main Process 关键问题清单

| # | 严重度 | 位置 | 问题 | 建议 |
|---|--------|------|------|------|
| M1 | 🟡 Warning | `skills.ipc.ts:261-353` | IPC handler 包含完整业务编排逻辑 | 迁移到 Service 层 |
| M2 | 🟡 Warning | `skills.ipc.ts`（389行） | God File，混合8种职责 | 按子域拆分 |
| M3 | 🟡 Warning | `BackgroundTaskService.ts` | 职责不完整，任务逻辑分散 | 引入 TaskExecutor 接口 |
| M4 | 🟡 Warning | `BackgroundTaskService.ts:239-243` | 直接依赖 WindowManager | 通过 EventEmitter 解耦 |
| M5 | 🟡 Warning | `SkillsService.ts:52-83` | remove() 直接操作文件系统 | 提取 FileSystemSkillManager |
| M6 | 🟡 Warning | `CommandRunner.ts:46` | 单例限制并发 | 返回带 cancel() 的句柄 |
| M7 | 🔵 Suggestion | 3个文件 | expandPath 逻辑重复 | 提取到 shared/path-utils.ts |
| M8 | 🔵 Suggestion | `EnvService` vs `GitHubSkillInstaller` | 下载逻辑重复70% | 提取通用 downloadWithProgress |

---

## Renderer Process 详细审查（评分：7.0/10）

### Store 层分析

#### `useSkillsStore` — 内聚度：中 ⚠️

**位置：** `src/renderer/src/stores/skills.ts`

**问题：**
- `searchKeyword`、`selectedAgents` 是 UI 过滤状态，与数据状态混在同一 Store
- `focusSearchTrigger` 是纯 UI hack（递增计数器触发 watch）
- `filteredSkills` computed 在 Store 中执行 UI 过滤，模糊了数据层与展示层边界
- `installing`/`removing`/`searching` 操作状态与缓存状态混合

**注意：** Pinia Composition API 风格中，Store 混合数据与过滤状态是常见做法，拆分是优化方向而非架构缺陷。

#### `useTaskStore` — 内聚度：高

**位置：** `src/renderer/src/stores/tasks.ts:14-49`

**问题：**
- `start()` 使用 if/else 链处理任务类型，违反开闭原则

#### `useSettingsStore` / `useEnvStore` — 内聚度：高

**问题：**
- `loading` 与 `fetching` / `checking` 是同一 computed 的别名，接口冗余
- `EnvStore` 中的 `downloading`/`downloadProgress` 是 UI 状态，与数据混合

### 组件架构分析

#### 过度臃肿的组件

| 组件 | 行数 | 包含的独立功能 |
|------|------|---------------|
| `SettingsView.vue` | ~1000行（约300行样式） | 通用设置、代理配置、npm镜像、环境检测、Node安装、应用更新 |
| `AgentView.vue` | 867行 | Agent网格、Drawer、批量管理、技能操作 |
| `InstalledList.vue` | 504行 | 工具栏、Agent过滤、技能列表、删除对话框、详情弹窗 |

#### 高耦合组件对

1. **GitHubInstaller ↔ ArchiveInstaller**
   - 共享完全相同的双栏布局、step header、action bar
   - 重复代码超过 200 行
   - **建议：** 提取 `LocalInstallerLayout` 组件

2. **InstalledList ↔ AgentView**
   - 两者独立实现了几乎一致的批量删除逻辑
   - 重复度超过 80%
   - **建议：** 提取 `useBatchRemove` composable

3. **SkillInstallDialog ↔ useSkillInstall**
   - 两者都管理 `selectedAgents`、`isGlobal`、`installing` 状态
   - 职责边界不清
   - **建议：** 统一由 composable 管理

### Renderer Process 关键问题清单

| # | 严重度 | 位置 | 问题 | 建议 |
|---|--------|------|------|------|
| R1 | 🟡 Warning | `stores/skills.ts` | Store 混合数据层与UI层状态 | 拆分为 dataStore + filterStore |
| R2 | 🟡 Warning | `InstalledList.vue` + `AgentView.vue` | 批量删除逻辑高度重复（存在合理差异） | 提取 useBatchRemove composable |
| R3 | 🟡 Warning | `SettingsView.vue`（~1000行，约300行样式） | 单个组件包含6个独立功能 | 拆分为4个子组件 |
| R4 | 🟡 Warning | `GitHubInstaller.vue` + `ArchiveInstaller.vue` | 布局结构高度重复 | 提取 LocalInstallerLayout |
| R5 | 🟡 Warning | `App.vue:127-301` | themeOverrides 硬编码颜色值 | 创建映射文件或同步脚本（受限于 NaiveUI `themeOverrides` 要求 JS 字符串字面量） |
| R6 | 🟡 Warning | `stores/tasks.ts:14-49` | if/else 链违反开闭原则 | 使用任务类型注册表 |
| R7 | 🟡 Warning | `useSkillInstall.ts` + `SkillInstallDialog.vue` | 状态管理重叠 | 统一职责边界 |
| R8 | 🔵 Suggestion | `useCachedResource.ts` | 缺少 TTL 机制 | 添加 ttl 参数 |

---

## Preload & IPC 详细审查（评分：6.0/10）

### Preload 层分析

#### 暴露 API 统计

总计 **48 个接口点**，分布在 11 个命名空间下。

#### 类型一致性 — 编译时与运行时差异 ⚠️

Preload 实现中约 **60% 的 invoke 方法**使用了 `Promise<unknown>` 或 `Promise<unknown[]>`，而 `index.d.ts` 中声明为精确类型。

| 声明文件类型 | 实现文件类型 | 说明 |
|-------------|-------------|------|
| `Promise<IpcResult<SkillSearchResponse>>` | `Promise<unknown>` | 运行时 `ipcRenderer.invoke` 天然返回 `Promise<unknown>` |
| `Promise<IpcResult<InstalledSkill[]>>` | `Promise<unknown[]>` | 类型安全由 `index.d.ts` 在编译时保障 |
| `Promise<EnvStatus>` | `Promise<unknown>` | Preload 层显式类型断言可消除差异 |
| `(task: BackgroundTask) => void` | `(task: unknown) => void` | 回调参数可在 handler 中做类型收窄 |

**说明：** `preload/index.ts` 是运行时 JS 文件，`ipcRenderer.invoke` 天然返回 `Promise<unknown>`，这是设计限制而非运行时安全漏洞。类型安全由 `index.d.ts` 在编译时保障。建议在 Preload 层显式添加类型断言以改善开发体验。

**位置：** `src/preload/index.ts:15-111`

### 安全边界评估

**正面：**
- 使用 `contextBridge` 暴露 API
- `webUtils.getPathForFile` 是安全方式
- `shell:open-path` 做了路径存在性检查

**负面：**
- `store:set-settings` 直接透传 `Record<string, unknown>`，无 schema 验证
- `skills:cleanup-temp` 的路径逃逸校验依赖 `startsWith`，Windows 下可能被绕过
- `skills:install` 的 `source` 参数缺少输入验证，可能导致非法 URL 传递给 CLI。注意：execa 使用数组参数传递时，即使 `shell: true`，也不会产生命令注入（execa 内部会正确处理转义）

### IPC Channel 审计

总计 **47 个 channel**，R→M 33 个，M→R 14 个。

**命名混乱：**
- `tasks:retry-skill-update` 以 `tasks:` 前缀命名却实现在 `skills.ipc.ts` 中
- `window:open-settings` 注册在 `env.ipc.ts` 中，与环境无关
- `app:get-version` 放在 `updater.ipc.ts` 中，略显不相关

### Shared Types 分析

**问题：**
1. `Skill` 接口（第 27-34 行）定义后未被任何文件引用
2. `CommandErrorInfo` 与 `IpcError` 并存，语义重叠，使用混乱
3. `toPackageRef`、`formatInstalls` 等 UI 工具函数混在类型定义文件中
4. `BackgroundTask` 的 `type` 字段硬编码为字面量联合，新增类型需要多处修改
5. `IpcResult<T>` 未被所有 channel 采用，存在 `{ success, error }` 和 `{ taskId, error }` 等多种格式

### Preload & IPC 关键问题清单

| # | 严重度 | 位置 | 问题 | 建议 |
|---|--------|------|------|------|
| P1 | 🟡 Warning | `preload/index.ts` | `ipcRenderer.invoke` 返回 `Promise<unknown>`，与声明文件类型不一致 | 在 Preload 层显式添加类型断言对齐声明 |
| P2 | 🟡 Warning | `ipc/skills.ipc.ts:44-56` | `skills:install` 的 `source` 参数缺少输入验证 | 添加 URL 格式正则校验 |
| P3 | 🔴 Critical | `ipc/skills.ipc.ts:245-253` | cleanup-temp 路径逃逸校验薄弱（Windows 前缀绕过风险） | 使用 `fs.realpath` 后比较 |
| P4 | 🟡 Warning | `shared/types.ts` | CommandErrorInfo 与 IpcError 并存（语义不同） | 统一为扩展字段 |
| P5 | 🟡 Warning | `ipc/skills.ipc.ts:355-388` | tasks:retry-skill-update 位置错误 | 合并到 tasks.ipc.ts |
| P6 | 🟡 Warning | `ipc/env.ipc.ts:50-52` | window:open-settings 放错文件 | 移至 window.ipc.ts |
| P7 | 🟡 Warning | `ipc/store.ipc.ts` | set-settings 无 schema 验证 | 引入运行时校验 |
| P8 | 🔵 Suggestion | `WindowManager.ts:35` | sandbox: false | 当前架构下启用 sandbox 会导致 preload 中 Node API 不可用，属必要选择 |
| P9 | 🔵 Suggestion | `shared/types.ts` | Skill 接口未被使用 | 删除 |
| P10 | 🔵 Suggestion | 3个文件 | resolvePath/expandPath 重复 | 提取共享工具函数 |

---

## 改进路线图（按优先级排序）

### P0 — 立即修复（安全问题与高影响可维护性问题）

| # | 问题 | 涉及文件 | 预估工作量 |
|---|------|---------|-----------|
| 1 | 修复 `skills:cleanup-temp` 路径逃逸漏洞（Windows 前缀绕过） | `ipc/skills.ipc.ts` | 1h |
| 2 | 修复 `ArchiveSkillInstaller.extractAndScan()` 相同路径校验问题 | `services/ArchiveSkillInstaller.ts` | 1h |
| 3 | 修复 `BackgroundTaskService` stderr 误写入 stdout | `services/BackgroundTaskService.ts` | 1h |
| 4 | 加强 `skills:install` source 参数输入验证 | `ipc/skills.ipc.ts` | 1h |
| 5 | 将后台任务编排逻辑从 IPC 迁移到 Service 层 | `ipc/skills.ipc.ts` + `BackgroundTaskService.ts` | 4h |

### P0.5 — 高优先级优化（DRY 与内聚）

| # | 问题 | 涉及文件 | 预估工作量 |
|---|------|---------|-----------|
| 6 | 拆分 `useSkillsStore`，分离 UI 状态（可选优化） | `stores/skills.ts` | 3h |
| 7 | 提取 `useBatchRemove` 减少批量删除重复逻辑 | `InstalledList.vue` + `AgentView.vue` | 2h |
| 8 | Preload `Promise<unknown>` 显式添加类型断言 | `preload/index.ts` | 2h |

### P1 — 短期改进（降低耦合、提升内聚）

| # | 问题 | 涉及文件 | 预估工作量 |
|---|------|---------|-----------|
| 9 | 统一错误响应格式（合并 CommandErrorInfo 到 IpcError） | `shared/types.ts` + 所有 IPC | 3h |
| 10 | 拆分 `skills.ipc.ts` 为多个子域模块 | `ipc/skills.ipc.ts` | 4h |
| 11 | 解耦 `BackgroundTaskService` 与 `WindowManager` | `BackgroundTaskService.ts` | 2h |
| 12 | 提取通用下载工具函数 | `EnvService.ts` + `GitHubSkillInstaller.ts` | 2h |
| 13 | 拆分 `SettingsView` 为子组件 | `SettingsView.vue` | 3h |
| 14 | 提取 `LocalInstallerLayout` 统一 GitHub/Archive 安装器布局 | `GitHubInstaller.vue` + `ArchiveInstaller.vue` | 2h |
| 15 | 统一 themeOverrides 维护机制 | `App.vue` + `tokens.css` | 2h |

### P2 — 中期重构（架构升级）

| # | 问题 | 涉及文件 | 预估工作量 |
|---|------|---------|-----------|
| 16 | 为 Installer 引入 `ISkillSourceInstaller` 接口 | `services/*Installer.ts` | 3h |
| 17 | 重构 `CommandRunner` 支持多进程管理 | `CommandRunner.ts` | 3h |
| 18 | 重构 `TaskStore.start()` 使用注册表模式 | `stores/tasks.ts` | 2h |
| 19 | 统一 `SkillInstallDialog` 与 `useSkillInstall` 状态管理 | `SkillInstallDialog.vue` + `useSkillInstall.ts` | 2h |
| 20 | 清理 `shared/types.ts`（删除 Skill、迁移工具函数） | `shared/types.ts` | 1h |
| 21 | 提取共享路径工具函数 `expandTildePath` | 3个文件 | 1h |

### P3 — 长期优化

| # | 问题 | 涉及文件 | 预估工作量 |
|---|------|---------|-----------|
| 22 | 引入依赖注入容器替代全局单例 | 所有 services | 8h |
| 23 | 统一 zip 解压库（decompress 替代 yauzl） | `GitHubSkillInstaller.ts` | 2h |
| 24 | 为 `useCachedResource` 添加 TTL 支持 | `useCachedResource.ts` | 1h |

**总预估工作量：** P0 约 8h，P0.5 约 7h，P1 约 18h，P2 约 12h，P3 约 11h，合计约 **56 小时**

---

## 遗漏问题（原报告未提及）

以下问题在审计复核中独立发现，原报告未覆盖：

### L1 — `BackgroundTaskService` 将 stderr 写入 stdout 字段

**位置：** `src/main/services/BackgroundTaskService.ts:111-114`

`child.stderr?.on('data', ...)` 中将 stderr 数据追加到 `task.stdout`，导致错误输出与正常输出混淆，无法区分。这是一个实际的运行时 bug。

### L2 — `retryBuiltIn()` 与 `startBuiltin()` 代码高度重复

**位置：** `src/main/services/BackgroundTaskService.ts:88-133` vs `162-215`

两个方法几乎完全相同，只有初始状态设置不同。应提取公共逻辑。

### L3 — `ArchiveSkillInstaller.extractAndScan()` 存在路径前缀绕过风险

**位置：** `src/main/services/ArchiveSkillInstaller.ts:34-38`

使用 `path.resolve(tempDir, f.path).startsWith(resolvedTemp + path.sep)` 校验，与 P3（cleanup-temp）有相同的 Windows 路径前缀绕过风险（`C:\...\Tempfake` 以 `C:\...\Temp` 开头）。

### L4 — `GitHubSkillInstaller` 的 `subPath` 清理逻辑缺陷

**位置：** `src/main/services/GitHubSkillInstaller.ts:241-242`

`subPath.replace(/\.\./g, '')` 会将 `....` 替换为空字符串，`a..b` 替换为 `ab`，可能产生非预期路径。应使用更安全的清理策略。

### L5 — `env.ipc.ts` 存在跨层依赖

**位置：** `src/main/ipc/env.ipc.ts:23-24`

`env:install-node` handler 直接调用 `BrowserWindow.fromWebContents(event.sender)` 发送进度，与 M4（BackgroundTaskService → WindowManager）是同类跨层问题。

### L6 — `agents.json` 缺少运行时类型验证

**位置：** `src/main/services/SkillsService.ts:53`、`src/main/services/LocalSkillInstaller.ts:13` 等

多处使用 `agentsData as AgentDef[]` 强制类型转换，无运行时验证。`agents.json` 来自外部文件系统，格式异常可能导致运行时错误。

---

## 附录

### A. 关键文件清单

| 文件 | 行数 | 风险等级 | 说明 |
|------|------|---------|------|
| `src/main/ipc/skills.ipc.ts` | 389 | 🟡 中 | 文件偏长（389行，19个 handler），都在 skills 域内，建议按子域拆分 |
| `src/renderer/src/views/SettingsView.vue` | 1000 | 🟡 中 | 过于臃肿，包含6个独立功能 |
| `src/renderer/src/views/AgentView.vue` | 867 | 🟡 中 | 包含批量管理、Drawer等 |
| `src/main/services/BackgroundTaskService.ts` | ~250 | 🟡 中 | 职责不完整，跨层耦合 |
| `src/preload/index.ts` | ~185 | 🟡 中 | 运行时 `invoke` 返回 `Promise<unknown>`，类型安全由 `index.d.ts` 在编译时保障 |
| `src/renderer/src/stores/skills.ts` | ~100 | 🟡 中 | Store 职责过重 |
| `src/shared/types.ts` | 153 | 🟢 低 | 类型组织混乱，工具函数混放 |

### B. 设计原则速查表

| 原则 | 状态 | 说明 |
|------|------|------|
| 单一职责原则（SRP） | ⚠️ 部分违背 | skills.ipc.ts、useSkillsStore 承担过多职责 |
| 开闭原则（OCP） | ⚠️ 部分违背 | TaskStore.start() 使用 if/else 链 |
| 里氏替换原则（LSP） | ✅ 基本遵循 | Installer 之间无继承关系 |
| 接口隔离原则（ISP） | ⚠️ 部分违背 | 缺乏 ISkillSourceInstaller 接口 |
| 依赖倒置原则（DIP） | ⚠️ 部分违背 | Service 直接依赖具体实现，缺乏抽象接口。小型项目中使用具体实现是合理选择，非架构缺陷 |
| 分层架构 | ⚠️ 部分违背 | BackgroundTaskService 直接调用 WindowManager |
| DRY（不重复自己） | ❌ 严重违背 | 批量删除、下载逻辑、expandPath 多处重复 |

---

*报告由 Claude Code 自动生成，基于 2026-05-27 的代码快照。*
