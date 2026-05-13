## Why

国内用户在通过 npm 安装或更新 npx、skills CLI 等全局包时，经常因网络问题导致下载失败或超时。虽然已有 GitHub 代理加速 git 操作，但 npm registry 访问仍走默认源，需要为 npm 命令提供镜像源选项。

## What Changes

- 在 AppSettings 中新增 `npmRegistry` 字段，存储用户选择的 npm 镜像地址
- 在设置页面「网络设置」区域新增 npm 镜像选择器，提供预设（淘宝、清华）和自定义选项
- BackgroundTaskService 的 update-npx、update-skills、install-skills 命令附加 `--registry` 参数
- EnvService 的 installSkillsCli 命令附加 `--registry` 参数

## Capabilities

### New Capabilities

- `npm-mirror`: npm 镜像源配置能力，包括设置持久化、预设选项、自定义 URL 输入，以及在 npm install/update 命令中注入 `--registry` 参数

### Modified Capabilities

## Impact

- `src/shared/types.ts` — AppSettings 接口新增字段
- `src/main/services/StoreService.ts` — 默认设置新增 npmRegistry
- `src/main/services/BackgroundTaskService.ts` — 3 个 npm 命令加 --registry
- `src/main/services/EnvService.ts` — installSkillsCli 加 --registry
- `src/renderer/src/views/SettingsView.vue` — 新增镜像选择 UI
- `src/renderer/src/stores/settings.ts` — 新增 npmRegistry 响应式字段
