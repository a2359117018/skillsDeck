## Why

用户在实际使用中发现了 4 个影响体验的问题：设置页面始终误报"未保存改动"、Agent 技能删除后列表不刷新、安装技能时忽略默认安装目标设置、安装进度条缺乏直观的百分比反馈。这些问题直接影响核心使用流程，需要尽快修复。

## What Changes

- **修复设置页脏检测逻辑**：解决 `originalSettings` 初始化时序问题，确保在 store 数据加载完成前不触发假阳性的"未保存改动"提示
- **修复 Agent 技能列表响应性**：将 `selectedAgent` 从静态快照改为从 store 动态派生的 computed 属性，删除操作后列表自动刷新
- **联动默认安装目标**：安装对话框打开时自动预选设置中配置的默认 agent，`resetState()` 也重置为默认值
- **改进安装进度 UI**：用模拟百分比数字替换当前的无限循环进度条，提供直观的安装进度感知

## Capabilities

### New Capabilities

- `simulated-install-progress`: 安装进度模拟百分比显示，基于时间/输出行数驱动从 0% 递增到完成时跳 100%

### Modified Capabilities

- `settings-dirty-detection`: 修改脏检测机制，延迟启用或基于加载完成后的数据初始化
- `agent-skill-list-reactivity`: 修改 Agent 技能列表数据源，从静态快照改为响应式派生
- `install-default-agent`: 修改安装对话框初始化逻辑，联动设置的默认安装目标

## Impact

- `src/renderer/src/views/SettingsView.vue`：脏检测逻辑
- `src/renderer/src/views/AgentView.vue`：selectedAgent 数据源
- `src/renderer/src/components/skills/SkillInstallDialog.vue`：默认 agent 预选 + 进度 UI
- `src/renderer/src/stores/settings.ts`：可能需要暴露加载状态
- `src/renderer/src/stores/skills.ts`：无变更（Store 逻辑正确）
