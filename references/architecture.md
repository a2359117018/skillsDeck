# Architecture

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

## Key Patterns

- **IPC communication**: Main↔renderer via typed Electron IPC. Preload exposes `window.api.*`; handlers registered in `src/main/ipc/`. All IPC errors are serialized via `CommandErrorInfo`. Handlers return `{ ok: true, data: T } | { ok: false, error: CommandErrorInfo }`.
- **Stale-while-revalidate**: `useCachedResource<T>` provides `ensure()`, `invalidate()`, `refresh()` for all Pinia store data fetching.
- **CLI interaction**: `CommandRunner` wraps `execa` with streaming output, timeout, and cancel. `SkillsService` uses it for all `npx skills` commands. `shell: true` on Windows.
- **Agent scanning**: `AgentScanner` reads `shared/agents.json` and scans each agent's `globalPath` to discover installed skills. Renderer enriches data with agent associations via path matching.
- **Background tasks**: `BackgroundTaskService` manages long-running operations (update-skills, install-node, install-skills, skill-update, skill-update-all) with progress streaming via IPC.
- **Multi-source install**: Three install paths—CLI (`SkillsService`), GitHub URL (`GitHubSkillInstaller` → download zipball → extract → `LocalSkillInstaller`), and local archive (`ArchiveSkillInstaller` → extract → `LocalSkillInstaller`). `LocalSkillInstaller` copies skill dirs into agent skill paths and handles cleanup.
- **Multi-window**: `WindowManager` manages main window and settings modal. Window type passed via `?window=` query parameter.
- **Design system**: NaiveUI with custom theme overrides in `App.vue`. CSS tokens in `tokens.css`. Pill-shaped buttons (9999px radius), rounded cards (16px). Font: DM Sans.
- **Drag-drop file paths**: Uses `webUtils.getPathForFile()` (not `file.path`) for contextIsolation compatibility.

## IPC Channels

| Category       | Channels                                                                                                                                                                                                                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills         | `skills:search`, `skills:list`, `skills:install`, `skills:install-streaming`, `skills:install-cancel`, `skills:update`, `skills:update-all`, `skills:remove`, `skills:update-background`, `skills:update-all-background`, `skills:parse-github`, `skills:select-archive`, `skills:extract-archive`, `skills:install-local`, `skills:cancel-github-download`, `skills:cleanup-temp` |
| Skills (←main) | `skills:install-output`, `skills:github-download-progress` (main→renderer push)                                                                                                                                                                                                                                                                                                    |
| Agents         | `agent:scan-all`, `agent:scan-one`                                                                                                                                                                                                                                                                                                                                                 |
| Environment    | `env:check`, `env:install-node`, `env:install-skills`, `env:cancel-install-node`, `env:download-progress`                                                                                                                                                                                                                                                                          |
| Settings       | `store:get-settings`, `store:set-settings`                                                                                                                                                                                                                                                                                                                                         |
| Tasks          | `tasks:start`, `tasks:cancel`, `tasks:get-all`, `tasks:update`                                                                                                                                                                                                                                                                                                                     |
| Shell          | `shell:open-path`, `window:open-settings`                                                                                                                                                                                                                                                                                                                                          |

## Shared Types (shared/types.ts)

Key interfaces: `EnvStatus`, `BackgroundTask`, `Skill`, `AgentScanResult`, `InstalledSkill`, `InstalledSkillAgent`, `CommandResult`, `CommandErrorInfo`, `AppSettings`, `SkillSearchResult`, `SkillSearchResponse`, `ScannedSkill`, `LocalInstallResult`, `ParsedGitHubUrl`, `GitHubParseResult`. Utility functions: `toPackageRef()`, `formatInstalls()`.
