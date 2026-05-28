# P1 剩余任务执行计划

## 任务清单

### 任务 A：P1-13 重构 SettingsView.vue（~30 分钟）

**目标**：将 SettingsView.vue（1000 行）精简为 orchestrator，使用 4 个已创建的子组件。

**子组件位置**：
- `components/settings/GeneralSettings.vue` — props: autoCheckEnv, closeAction; emits: update:autoCheckEnv, update:closeAction
- `components/settings/NetworkSettings.vue` — props: proxyUrl, npmRegistry; emits: update:proxyUrl, update:npmRegistry
- `components/settings/EnvSettings.vue` — 自包含，无 props/emit（直接操作 envStore/taskStore）
- `components/settings/UpdaterSettings.vue` — props: appVersion; emits: check, install

**SettingsView 保留职责**：
1. 页面头部（标题+描述）
2. NCard 容器 + 未保存提示（NAlert）
3. `hasUnsavedChanges` 计算属性（比较 settingsStore 当前值 vs originalSettings）
4. `handleSave` 方法（校验 + 调用 settingsStore.save）
5. 浮动保存按钮
6. `onMounted` 中加载设置和获取版本号

**SettingsView 移除内容**：
- 通用设置模板+逻辑 → 替换为 `<GeneralSettings v-model:autoCheckEnv v-model:closeAction />`
- 网络设置模板+逻辑 → 替换为 `<NetworkSettings v-model:proxyUrl v-model:npmRegistry />`
- 运行环境模板+逻辑 → 替换为 `<EnvSettings />`
- 关于模板+逻辑 → 替换为 `<UpdaterSettings :appVersion @check @install />`
- 所有 proxy/registry 相关状态、选项、渲染函数、环境安装/更新逻辑

**hasUnsavedChanges 调整**：
直接使用 settingsStore 的值比较，因为 v-model 已经同步到 store：
```
settingsStore.autoCheckEnv !== original.autoCheckEnv
|| settingsStore.proxyUrl !== original.proxyUrl
|| settingsStore.npmRegistry !== original.npmRegistry
|| settingsStore.closeAction !== original.closeAction
```

**样式清理**：
SettingsView 中与子组件相关的样式（.settings-form, .proxy-field, .env-checks 等）全部移除，这些样式已在子组件中自包含。

**验证**：`npm run typecheck` + `npm run build`

---

### 任务 B：P1-14 提取 LocalInstallerLayout（~40 分钟）

**目标**：提取 GitHubInstaller.vue 和 ArchiveInstaller.vue 的共同布局。

**前置**：需要先读取两个文件，识别共同的双栏布局结构。

**验证**：`npm run typecheck` + `npm run build`

---

### 任务 C：P1-15 统一 themeOverrides 维护机制（~30 分钟）

**目标**：建立 App.vue themeOverrides 与 references/naiveui-theme.md 的同步机制。

**前置**：需要读取 App.vue 和 references/naiveui-theme.md。

**验证**：`npm run typecheck`

---

## 执行顺序

任务 A → 任务 B → 任务 C（串行，避免冲突）

## 最终验收

全部完成后：
1. `npm run build` 零错误
2. `npm run typecheck` 零类型错误
3. `npm run lint` 通过
4. 更新设计文档标记 P1 完成
