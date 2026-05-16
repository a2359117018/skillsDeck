# CLAUDE.md

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
│   │   └── WindowManager.ts        # Multi-window (main 1200×800, settings 600×500)
│   ├── api/
│   │   └── skills.ts               # HTTP client for skills.sh search API
│   └── ipc/                         # IPC handler modules
│       ├── index.ts                 # Central registration + error serialization
│       ├── skills.ipc.ts            # Skill CRUD + streaming install
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
│       │   ├── InstalledList.vue   # / — Main skills list
│       │   ├── SkillsSearch.vue    # /search — Skill search interface
│       │   ├── SkillDetail.vue     # /skill/:packageRef — Skill details
│       │   ├── AgentView.vue       # /agent-view — Agent management
│       │   └── SettingsView.vue    # /env + /settings — Settings & environment
│       ├── components/           # Reusable (layout, skills, common)
│       ├── stores/               # Pinia stores
│       │   ├── skills.ts           # Installed skills, search, install/remove/update
│       │   ├── env.ts              # Environment status, Node.js installation
│       │   ├── tasks.ts            # Background task subscriptions
│       │   └── settings.ts         # App settings persistence
│       ├── composables/
│       │   ├── useCachedResource.ts # Stale-while-revalidate for async data
│       │   └── useConfirm.ts       # Confirmation dialog composable
│       ├── constants/            # Agent definitions from shared/agents.json
│       └── assets/               # CSS design system
│           ├── tokens.css         # Design tokens (colors, spacing, typography, radius)
│           ├── main.css           # Reset, fonts (DM Sans), token imports
│           └── card.css           # .card-base with hover elevation
└── shared/
    ├── types.ts             # Shared interfaces (Skill, EnvStatus, CommandResult, etc.)
    └── agents.json          # Agent registry: name, agentFlag, project/global paths
```

### Key Patterns

- **IPC communication**: Main↔renderer via typed Electron IPC. Preload exposes `window.api.*`; handlers registered in `src/main/ipc/`. All IPC errors are serialized via `CommandErrorInfo`.
- **Stale-while-revalidate**: `useCachedResource<T>` provides `ensure()`, `invalidate()`, `refresh()` for all Pinia store data fetching.
- **CLI interaction**: `CommandRunner` wraps `execa` with streaming output, timeout, and cancel. `SkillsService` uses it for all `npx skills` commands. `shell: true` on Windows.
- **Agent scanning**: `AgentScanner` reads `shared/agents.json` and scans each agent's `globalPath` to discover installed skills. Renderer enriches data with agent associations via path matching.
- **Background tasks**: `BackgroundTaskService` manages long-running operations (update-skills, install-node, install-skills) with progress streaming via IPC.
- **Multi-window**: `WindowManager` manages main window and settings modal. Window type passed via `?window=` query parameter.
- **Design system**: NaiveUI with custom theme overrides in `App.vue`. CSS tokens in `tokens.css`. Pill-shaped buttons (9999px radius), rounded cards (16px). Font: DM Sans.

### IPC Channels

| Category    | Channels                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Skills      | `skills:search`, `skills:list`, `skills:install`, `skills:install-streaming`, `skills:install-cancel`, `skills:update`, `skills:update-all`, `skills:remove` |
| Agents      | `agent:scan-all`, `agent:scan-one`                                                                                                                           |
| Environment | `env:check`, `env:install-node`, `env:install-skills`, `env:cancel-install-node`, `env:download-progress`                                                    |
| Settings    | `store:get-settings`, `store:set-settings`                                                                                                                   |
| Tasks       | `tasks:start`, `tasks:cancel`, `tasks:get-all`, `tasks:update`                                                                                               |
| Shell       | `shell:open-path`, `window:open-settings`                                                                                                                    |

### Shared Types (shared/types.ts)

Key interfaces: `EnvStatus`, `BackgroundTask`, `Skill`, `AgentScanResult`, `InstalledSkill`, `CommandResult`, `CommandErrorInfo`, `AppSettings`, `SkillSearchResult`, `SkillSearchResponse`. Utility functions: `toPackageRef()`, `formatInstalls()`.

## Code Style

- **Prettier**: single quotes, no semicolons, 100 char print width, no trailing commas
- **ESLint**: Vue + TypeScript rules (`vue/require-default-prop` and `vue/multi-word-component-names` disabled)
- **Vue SFCs**: `<script setup lang="ts">` exclusively
- **Path alias**: `@renderer` → `src/renderer/src` (configured in `electron.vite.config.ts`)
- **Component naming**: PascalCase `.vue` files, camelCase for composables (`use*.ts`)
- **IPC naming**: `category:action` format (e.g., `skills:install-streaming`)

## Constraints

- **No test infrastructure**: No test runner or test files exist in this project
- **Windows `shell: true`**: Required for `execa` on Windows for CLI compatibility
- **Dev server port**: Hardcoded to 7456 in `electron.vite.config.ts`
- **Hash routing**: Uses `createWebHashHistory()` (required for Electron file:// protocol)
- **Agent paths**: `agents.json` contains platform-specific paths; `~` expansion handled in `AgentScanner`
