## 1. 设置页脏检测修复

- [x] 1.1 在 `SettingsView.vue` 中添加 `isLoaded` ref（初始 false），`load()` 完成后设为 true
- [x] 1.2 修改 `hasUnsavedChanges` computed：`isLoaded` 为 false 时直接返回 false
- [x] 1.3 验证：打开设置页不再出现"未保存改动"提示，修改后能正确检测

## 2. Agent 技能列表响应性修复

- [x] 2.1 在 `AgentView.vue` 中将 `selectedAgent` 从 `ref` 改为基于 `selectedAgentFlag` 的 computed 属性，从 `skillsStore.sortedAgentResults` 动态查找
- [x] 2.2 修改 `openAgentCard()` 改为存储 agentFlag 而非整个对象
- [x] 2.3 修改 `closeDrawer()` 清除 `selectedAgentFlag`
- [x] 2.4 验证：删除技能后抽屉列表自动更新

## 3. 安装默认目标联动

- [x] 3.1 在 `SkillInstallDialog.vue` 中引入 `useSettingsStore()`
- [x] 3.2 修改 dialog 打开逻辑（watch show prop 或 onMounted），将 `selectedAgents` 初始化为 `[settingsStore.defaultAgent]`
- [x] 3.3 修改 `resetState()` 中 `selectedAgents` 重置为 `[settingsStore.defaultAgent]`
- [x] 3.4 验证：打开安装对话框时默认 agent 已预选，重置后也恢复为默认值

## 4. 安装进度条 UI 改进

- [x] 4.1 添加 `simulatedProgress` ref 和进度模拟定时器逻辑（非线性递增：0→85% 快速，85→92% 减速）
- [x] 4.2 安装开始时启动定时器，成功时跳 100%，失败/取消时停止
- [x] 4.3 替换当前 `NProgress` 为带百分比显示的进度条（`indicator-placement="inside"` 或外部百分比文字）
- [x] 4.4 将取消按钮整合到进度条区域，样式紧凑
- [x] 4.5 组件卸载时清理定时器
- [x] 4.6 验证：安装时显示模拟百分比进度，取消后停止
