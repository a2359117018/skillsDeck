## Context

当前设置页面已有一个 GitHub 代理配置（`proxyUrl`），用于在 `npx skills add` 时包装 git clone URL。但 npm 全局包的安装和更新（`npm install -g`、`npm update -g`）仍使用默认的 npm registry（`registry.npmjs.org`），国内用户经常遇到超时或下载失败。

涉及 npm 命令的执行点有两处：

1. `BackgroundTaskService` — update-npx、update-skills、install-skills 三个后台任务
2. `EnvService.installSkillsCli()` — 前台安装 skills CLI

两者都通过 execa 执行 npm 命令，需要统一注入 `--registry` 参数。

## Goals / Non-Goals

**Goals:**

- 让用户在设置中选择 npm 镜像源，加速全局包的安装和更新
- 提供常用预设（淘宝、清华）和自定义 URL 支持
- UI 交互复用现有 GitHub 代理的 preset + 自定义模式，保持一致性

**Non-Goals:**

- 不修改用户系统级 `.npmrc`，仅在进程命令中通过 `--registry` 参数生效
- 不影响 `npx skills add` 等 git 操作（那部分由 GitHub 代理处理）
- 不做自动检测网络并切换镜像的智能逻辑

## Decisions

### 1. 通过 `--registry` CLI 参数而非环境变量传递镜像地址

**选择**：在 npm 命令的 args 中追加 `--registry <url>`

**备选**：设置 `NPM_CONFIG_REGISTRY` 环境变量传给 execa

**理由**：`--registry` 更显式，与现有 `buildInstallArgs` 中拼接 `--agent`、`-g` 等参数的模式一致，代码可读性更好。且不需要修改 CommandRunner 的接口。

### 2. 在 BackgroundTaskService 的 getCommandConfig 中读取设置

**选择**：在 `getCommandConfig()` 方法中调用 `getSettings()` 读取 `npmRegistry`，有值则 push `--registry` 和镜像地址到 args

**理由**：所有 npm 命令的参数构建都集中在此方法，改动最小。EnvService 的 `installSkillsCli` 同理读取设置。

### 3. UI 复用 GitHub 代理的交互模式

**选择**：独立的 `npmRegistry` 下拉框 + 自定义输入，与 `proxyUrl` 平行放置在网络设置区域

**理由**：两个设置职责不同（git 加速 vs npm 包下载加速），不应耦合。复用交互模式降低用户学习成本。

## Risks / Trade-offs

- **镜像地址失效风险** → 预设提供多个选项，用户可随时切换或自定义
- **自定义 URL 输入错误** → 前端验证必须以 `https://` 开头（与 GitHub 代理一致）
- **npm 不识别 registry URL** → npm 原生支持 `--registry` 参数，无兼容性问题
