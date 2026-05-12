## 1. 数据模型与持久化

- [x] 1.1 在 `src/shared/types.ts` 的 `AppSettings` 接口中新增 `npmRegistry?: string` 字段
- [x] 1.2 在 `src/main/services/StoreService.ts` 的 `DEFAULT_SETTINGS` 中新增 `npmRegistry: ''`

## 2. 主进程命令注入

- [x] 2.1 在 `src/main/services/BackgroundTaskService.ts` 的 `resolveCommand()` 中，为 update-npx、update-skills、install-skills 三个 npm 命令追加 `--registry` 参数（当 npmRegistry 有值时）
- [x] 2.2 在 `src/main/services/EnvService.ts` 的 `installSkillsCli()` 中，读取设置并追加 `--registry` 参数

## 3. 渲染进程状态管理

- [x] 3.1 在 `src/renderer/src/stores/settings.ts` 中新增 `npmRegistry` 响应式字段，并在 load/save 中处理

## 4. 设置页面 UI

- [x] 4.1 在 `src/renderer/src/views/SettingsView.vue` 的网络设置区域新增 npm 镜像下拉框，包含预设选项（不使用镜像、淘宝、清华大学、自定义...）
- [x] 4.2 实现自定义镜像 URL 输入框（选择自定义时展开，验证 https:// 前缀）
- [x] 4.3 在 hasUnsavedChanges 和 handleSave 中纳入 npmRegistry 字段
