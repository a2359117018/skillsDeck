# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NPX Skills UI is an Electron desktop app providing a GUI for managing AI coding agent skills via the `npx skills` CLI. It supports searching, installing, updating, and removing skills across 50+ AI agents (Claude Code, Cursor, Codex, etc.). The search API is hosted at `skills.sh`.

**Tech Stack:** Electron 39 + Vue 3.5 + TypeScript 5.9 + Pinia 3 + Naive UI 2.44 + electron-vite 5

## Development Commands

```bash
npm install            # Install dependencies
npm run dev            # Dev server with hot reload (port 7456)
npm run build          # Typecheck + production build
npm run lint           # ESLint
npm run format         # Prettier formatting
npm run typecheck      # Run both node and web typechecks
npm run build:win      # Build Windows NSIS installer
npm run build:mac      # Build macOS DMG
npm run build:linux    # Build Linux AppImage/deb
```

No test infrastructure exists in this project.

## Architecture

Built with **electron-vite**. Three-process Electron architecture:

```
src/
├── main/                    # Main process (Node.js)
│   ├── index.ts             # App lifecycle, window creation, IPC registration
│   ├── services/            # Business logic (singletons)
│   │   ├── CommandRunner.ts        # execa wrapper: streaming, timeout, cancel
│   │   ├── SkillsService.ts        # All `npx skills` CLI interactions
│   │   ├── AgentScanner.ts         # Filesystem scanning for agent skill dirs
│   │   ├── EnvService.ts           # Node.js detection, download, extraction
│   │   ├── StoreService.ts         # electron-store wrapper for settings
│   │   ├── BackgroundTaskService.ts # Long-running task management
│   │   ├── WindowManager.ts        # Multi-window (main 1200×800, settings 600×500)
│   │   ├── LocalSkillInstaller.ts  # Copy skill dirs into agent skill paths
│   │   ├── GitHubSkillInstaller.ts # Download & extract GitHub repos as skill sources
│   │   └── ArchiveSkillInstaller.ts # Extract .zip/.tar.gz/.tgz archives as skill sources
│   ├── api/
│   │   └── skills.ts               # HTTP client for skills.sh search API
│   └── ipc/                         # IPC handler modules
│       ├── index.ts                 # Central registration + error serialization
│       ├── skills.ipc.ts            # Skill CRUD + streaming install + GitHub/archive
│       ├── agents.ipc.ts            # Agent scanning
│       ├── env.ipc.ts               # Environment detection & Node.js install
│       ├── store.ipc.ts             # Settings persistence
│       └── tasks.ipc.ts             # Background task lifecycle
├── preload/                 # Preload script (contextBridge)
│   ├── index.ts             # Exposes window.api.* with typed IPC methods
│   └── index.d.ts           # TypeScript declarations for window.api
├── renderer/                # Renderer process (Vue 3 SPA)
│   └── src/
│       ├── App.vue               # Root: NaiveUI config, sidebar + router-view
│       ├── router/index.ts       # Hash-based routing (6 routes)
│       ├── views/                # Page components
│       ├── components/           # Reusable (layout, skills, common)
│       ├── stores/               # Pinia stores (skills, env, tasks, settings)
│       ├── composables/          # useCachedResource, useConfirm
│       ├── constants/            # Agent definitions from shared/agents.json
│       └── assets/               # CSS design system (tokens.css, main.css, card.css)
└── shared/
    ├── types.ts             # Shared interfaces and utility functions
    └── agents.json          # Agent registry: name, agentFlag, project/global paths
```

### Key Patterns

- **IPC communication**: Main↔renderer via typed Electron IPC. Preload exposes `window.api.*`; handlers registered in `src/main/ipc/`. All IPC errors are serialized via `CommandErrorInfo`. Handlers return `{ ok: true, data: T } | { ok: false, error: CommandErrorInfo }`.
- **Stale-while-revalidate**: `useCachedResource<T>` provides `ensure()`, `invalidate()`, `refresh()` for all Pinia store data fetching.
- **CLI interaction**: `CommandRunner` wraps `execa` with streaming output, timeout, and cancel. `SkillsService` uses it for all `npx skills` commands. `shell: true` on Windows.
- **Agent scanning**: `AgentScanner` reads `shared/agents.json` and scans each agent's `globalPath` to discover installed skills. Renderer enriches data with agent associations via path matching.
- **Background tasks**: `BackgroundTaskService` manages long-running operations (update-skills, install-node, install-skills, skill-update, skill-update-all) with progress streaming via IPC.
- **Multi-source install**: Three install paths—CLI (`SkillsService`), GitHub URL (`GitHubSkillInstaller` → download zipball → extract → `LocalSkillInstaller`), and local archive (`ArchiveSkillInstaller` → extract → `LocalSkillInstaller`). `LocalSkillInstaller` copies skill dirs into agent skill paths and handles cleanup.
- **Multi-window**: `WindowManager` manages main window and settings modal. Window type passed via `?window=` query parameter.
- **Design system**: NaiveUI with custom theme overrides in `App.vue`. CSS tokens in `tokens.css`. Pill-shaped buttons (9999px radius), rounded cards (16px). Font: DM Sans.
- **Drag-drop file paths**: Uses `webUtils.getPathForFile()` (not `file.path`) for contextIsolation compatibility.

### IPC Channels

| Category    | Channels                                                                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills      | `skills:search`, `skills:list`, `skills:install`, `skills:install-streaming`, `skills:install-cancel`, `skills:update`, `skills:update-all`, `skills:remove`, `skills:update-background`, `skills:update-all-background`, `skills:parse-github`, `skills:select-archive`, `skills:extract-archive`, `skills:install-local`, `skills:cancel-github-download`, `skills:cleanup-temp` |
| Skills (←main) | `skills:install-output`, `skills:github-download-progress` (main→renderer push)                                                                                              |
| Agents      | `agent:scan-all`, `agent:scan-one`                                                                                                                           |
| Environment | `env:check`, `env:install-node`, `env:install-skills`, `env:cancel-install-node`, `env:download-progress`                                                    |
| Settings    | `store:get-settings`, `store:set-settings`                                                                                                                   |
| Tasks       | `tasks:start`, `tasks:cancel`, `tasks:get-all`, `tasks:update`                                                                                               |
| Shell       | `shell:open-path`, `window:open-settings`                                                                                                                    |

### Shared Types (shared/types.ts)

Key interfaces: `EnvStatus`, `BackgroundTask`, `Skill`, `AgentScanResult`, `InstalledSkill`, `InstalledSkillAgent`, `CommandResult`, `CommandErrorInfo`, `AppSettings`, `SkillSearchResult`, `SkillSearchResponse`, `ScannedSkill`, `LocalInstallResult`, `ParsedGitHubUrl`, `GitHubParseResult`. Utility functions: `toPackageRef()`, `formatInstalls()`.

## Code Style

- **Prettier**: single quotes, no semicolons, 100 char print width, no trailing commas
- **ESLint**: Vue + TypeScript rules (`vue/require-default-prop` and `vue/multi-word-component-names` disabled, `vue/block-lang` enforces `lang="ts"`)
- **Vue SFCs**: `<script setup lang="ts">` exclusively
- **Path alias**: `@renderer` → `src/renderer/src` (configured in `electron.vite.config.ts`)
- **Component naming**: PascalCase `.vue` files, camelCase for composables (`use*.ts`)
- **IPC naming**: `category:action` format (e.g., `skills:install-streaming`)

## CSS 约束

- **必须使用 design tokens**：颜色、间距、圆角、阴影、字体大小等一律使用 `tokens.css` 中的 CSS 变量（如 `var(--color-ink)`、`var(--space-md)`）
- **禁止硬编码视觉值**：不得在 scoped style 中直接写 hex/rgb 颜色或 magic number 间距，应使用对应的 token
- **scoped 优先**：组件样式使用 `<style scoped>`，仅在需要穿透 teleport/portal 元素时才用 `<style>` 并加注释说明原因
- **类名规范**：使用 BEM-like 命名（`.block-element`、`.block--modifier`），单词用 kebab-case 连接
- **新增 token 流程**：如果现有 token 不满足需求，先在 `tokens.css` 中按命名规范添加新变量，再在组件中使用
- **样式块长度**：单个组件的 `<style>` 超过 80 行时，考虑拆分子组件或提取公共 class 到 `card.css` 等全局文件
- **NaiveUI 样式覆盖**：优先使用 `themeOverrides` prop，其次用 `:deep()` 选择器
- **流式布局优先**：所有页面容器使用 `width: 100%` + padding，禁止写死 `max-width` 或固定像素宽度
- **网格使用 auto-fill**：多列卡片列表使用 `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`，禁止写死 `repeat(N, 1fr)`
- **零 media query 原则**：布局弹性通过 flex 和 grid 的内建能力实现，不引入断点；仅在极特殊场景下可例外

## 布局约束

- **整体布局使用 flex**：app shell（`.app-shell`）为 `display: flex` 水平排列（sidebar + content area），每个页面容器为 `flex-direction: column` 垂直排列
- **卡片网格用 CSS grid**：多列卡片列表（如 Agent 卡片、搜索结果）使用 `display: grid` + `grid-template-columns: repeat(N, 1fr)`，不用 flex wrap
- **工具栏统一 flex row**：页面顶部 toolbar 使用 `display: flex; align-items: center; gap: var(--space-*)`
- **页面容器填满内容区**：每个页面根元素为 `width: 100%`，通过 `padding` 控制内容边距，不用 `max-width` 限制
- **间距用 gap**：flex/grid 容器中子元素间距使用 `gap` 属性 + spacing token，不在子元素上用 margin 拆分
- **工具栏允许换行**：`display: flex` 的 toolbar 必须设置 `flex-wrap: wrap`，防止空间不足时溢出
- **Drawer 使用相对宽度**：侧滑抽屉宽度使用 `min(固定值, 窗口百分比)`，不用固定像素
- **最小窗口保障**：Electron 主进程设置 `minWidth: 1200, minHeight: 800`，布局在此尺寸下必须可用

## Constraints

- **No test infrastructure**: No test runner or test files exist in this project
- **Windows `shell: true`**: Required for `execa` on Windows for CLI compatibility
- **Dev server port**: Hardcoded to 7456 in `electron.vite.config.ts`
- **Hash routing**: Uses `createWebHashHistory()` (required for Electron file:// protocol)
- **Agent paths**: `agents.json` contains platform-specific paths; `~` expansion handled in `AgentScanner`
- **Chinese mirror**: Build scripts use `npmmirror.com` for Electron binary downloads (`ELECTRON_MIRROR` env vars in package.json)
