## Context

当前应用存在 4 个影响用户体验的 bug，均在 renderer 层面：

1. **设置页脏检测**：`SettingsView.vue` 中 `originalSettings` 用空值初始化，而 store 默认值为 `'claude-code'`，在异步 `load()` 完成前 `hasUnsavedChanges` computed 就会返回 true
2. **Agent 技能列表**：`AgentView.vue` 中 `selectedAgent` 是通过 `openAgentCard()` 捕获的静态对象引用，删除后 store 虽已刷新但 drawer 仍显示旧数据
3. **安装默认目标**：`SkillInstallDialog.vue` 中 `selectedAgents` 初始化为空数组，从未读取 `settingsStore.defaultAgent`
4. **安装进度**：当前使用 NaiveUI `NProgress` 的 indeterminate 模式（`processing` + `percentage=100`），无百分比数字

## Goals / Non-Goals

**Goals:**
- 修复 4 个已知 bug，使核心流程（设置、Agent 管理、安装）行为符合用户预期
- 安装进度条提供模拟百分比反馈，提升安装过程的感知体验

**Non-Goals:**
- 不改变安装的实际进度追踪机制（仍然是 streaming output）
- 不重构 Store 层或 IPC 层（这些层逻辑正确）
- 不引入新的依赖或组件库

## Decisions

### 1. 设置脏检测：加载守卫方案

**选择**：添加 `isLoaded` ref，在 `load()` 完成后设为 true，`hasUnsavedChanges` 在 `isLoaded === false` 时始终返回 false。

**替代方案**：将 `originalSettings` 初始值设为与 store 默认值一致的硬编码值。缺点：store 默认值变化时需同步修改，容易遗忘。

**理由**：加载守卫方案语义清晰，不依赖默认值同步，且不改变现有数据结构。

### 2. Agent 技能列表：Computed 派生方案

**选择**：将 `selectedAgent` 从 `ref` 改为 `computed`，通过 `selectedAgentFlag` ref 从 `skillsStore.sortedAgentResults` 动态查找。

**替代方案**：删除后手动更新 `selectedAgent.value`。缺点：需要在每个修改操作后手动同步，容易遗漏。

**理由**：computed 自动响应 store 数据变化，一次修改解决所有增删场景。

### 3. 安装默认目标：初始化注入

**选择**：在 dialog 打开时（watch `show` prop）将 `selectedAgents` 初始化为 `[settingsStore.defaultAgent]`，`resetState()` 也重置为默认值。

**理由**：最小改动，直接利用现有 store 数据。

### 4. 安装进度模拟：时间驱动递增

**选择**：安装开始时启动一个定时器，以非线性速度递增模拟百分比（0→~85% 约 5 秒，然后减速停在 ~92%），安装完成时跳到 100%。具体曲线：
- 0-3 秒：每 200ms 增加 3-5%（随机）
- 3-6 秒：每 300ms 增加 1-3%（随机）
- 6 秒后：每 500ms 增加 0-1%，上限 92%
- 成功/失败：立即设为 100%/保持当前

**替代方案**：基于 streaming output 行数递增。缺点：不同 skill 输出量差异大，不可预测。

**理由**：时间驱动提供稳定的视觉节奏，用户感知到的"正在工作"反馈一致。

## Risks / Trade-offs

- **模拟进度不是真实进度** → 在状态文字中说明"正在安装中..."而非暗示具体剩余时间，避免误导
- **computed 方案依赖 store 刷新** → store 刷新已有 `fetchInstalled()` 保证，风险低
- **加载守卫增加一个状态变量** → 极低复杂度，可接受
