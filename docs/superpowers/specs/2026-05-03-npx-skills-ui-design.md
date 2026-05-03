# NPX Skills UI — Design Specification

## Overview

An Electron-based cross-platform desktop application that provides a graphical interface for the `npx skills` CLI tool. The application wraps common skills operations (search, install, update, remove, list) into a user-friendly GUI, serving both developers and non-technical users.

## Technology Stack

| Category | Tool | Purpose |
|----------|------|---------|
| Framework | Electron 39 + electron-vite | Desktop app runtime |
| UI | Vue 3 + Naive UI (default light theme) | Component library & reactivity |
| State Management | Pinia | Global state (skills, env, settings) |
| Routing | Vue Router 4 | Main window page navigation |
| Utilities | VueUse | Composable helpers |
| Command Execution | execa | Spawn `npx skills` commands in main process |
| Persistence | electron-store | User preferences, env cache |
| HTTP Download | Node.js built-in `fetch` | Download Node.js for offline users |

### Excluded

- `got` — replaced by Node.js built-in `fetch` for optional Node.js download
- `DESIGN.md` — not used as design reference

## Architecture

### Layered IPC Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Renderer (Vue 3)                    │
│  ┌──────────┐ ┌──────────────┐ ┌───────────────────┐│
│  │主窗口     │ │环境检测窗口   │ │设置窗口           ││
│  │(Router)  │ │(Node/npx)    │ │(偏好配置)         ││
│  └──────────┘ └──────────────┘ └───────────────────┘│
├─────────────── IPC Bridge (preload) ─────────────────┤
│                   Main Process                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │SkillsService │ │EnvService    │ │WindowManager │ │
│  │(execa调用)   │ │(环境检测)    │ │(3窗口管理)    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
│  ┌──────────────┐                                    │
│  │StoreService  │                                    │
│  │(electron-store)│                                  │
│  └──────────────┘                                    │
└─────────────────────────────────────────────────────┘
```

### Communication Rules

- All windows communicate exclusively through Main process (no direct window-to-window communication)
- Shared state via `electron-store` (persistence) + Pinia (memory cache)
- Renderer never executes shell commands directly — all command execution happens in Main process

## Window Architecture

### 3 Windows

| Window | Responsibility | Trigger | Lifecycle |
|--------|---------------|---------|-----------|
| **Main Window** (1200×800) | Skill search, list, install/update/delete, sidebar nav | App launch | Persistent; closing exits app |
| **Environment Detection** (500×400) | Node/npx/skills status, one-click fix | Auto on launch if env broken | Auto-close when env OK |
| **Settings** (600×500) | Default agent, Node.js path, env check toggle | Main window button | On-demand open/close |

### Startup Flow

```
App Launch
  │
  ├─→ EnvService.checkAll()
  │     ├─ Node.js missing ──→ Open Environment Detection window
  │     ├─ npx missing     ──→ Same
  │     └─ skills unavailable ──→ Same (offer install)
  │
  ├─→ All env OK → Close Environment Detection (if open)
  │
  └─→ WindowManager.createMainWindow()
        └─→ Load Pinia stores → Render UI
```

## Project Structure

```
src/
├── main/
│   ├── index.ts
│   ├── services/
│   │   ├── WindowManager.ts
│   │   ├── SkillsService.ts
│   │   ├── EnvService.ts
│   │   └── StoreService.ts
│   └── ipc/
│       ├── index.ts
│       ├── skills.ipc.ts
│       ├── env.ipc.ts
│       └── store.ipc.ts
├── preload/
│   ├── index.ts
│   └── index.d.ts
└── renderer/
    ├── index.html
    └── src/
        ├── main.ts
        ├── App.vue
        ├── router/
        │   └── index.ts
        ├── stores/
        │   ├── skills.ts
        │   ├── env.ts
        │   └── settings.ts
        ├── views/
        │   ├── MainView.vue
        │   ├── SkillsSearch.vue
        │   ├── SkillsList.vue
        │   └── SkillDetail.vue
        ├── components/
        │   ├── layout/
        │   │   ├── AppSidebar.vue
        │   │   └── AppHeader.vue
        │   ├── skills/
        │   │   ├── SkillCard.vue
        │   │   ├── SkillSearchBar.vue
        │   │   └── SkillInstallDialog.vue
        │   └── common/
        │       ├── CommandOutput.vue
        │       └── EnvStatusBadge.vue
        ├── composables/
        │   └── useIpc.ts
        ├── constants/
        │   └── agents.ts
        ├── styles/
        │   └── index.css
        └── assets/
```

## Main Window Layout

```
┌──────────────────────────────────────────────────────┐
│  ◉ NPX Skills UI                    ─  □  ✕         │
├────────┬─────────────────────────────────────────────┤
│        │  🔍 搜索技能...                              │
│ Nav    ├─────────────────────────────────────────────┤
│        │                                             │
│ 🔍 搜索 │  Content area (route-driven)               │
│ 📋 列表 │                                             │
│ ⚙ 设置 │  /search  → search results grid             │
│        │  /list    → installed skills list            │
│────────│  /detail  → skill detail + actions           │
│ Env    │                                             │
│ ✅ Node│                                             │
│ ✅ npx │                                             │
│ ✅ skill│                                            │
└────────┴─────────────────────────────────────────────┘
```

- **Sidebar** (200px fixed): navigation menu + environment status indicators at bottom
- **Content area**: Vue Router controlled

### Pages

**Search (`/search`)**
- Search bar with 300ms debounce auto-search
- Results in 3-column card grid: name, description, source, install count, [Install] button
- Empty state prompt

**Installed List (`/list`)**
- Tab groups: Global / per-agent skills
- Each row: name, version, install location, actions (update/delete)
- Batch action bar: "Update All"

**Skill Detail (`/detail/:name`)**
- Full skill info (name, description, version, source repo)
- Action area: Install to (multi-select agents) / Update / Delete
- Inline command output panel (collapsible)

## IPC Channels

```ts
// skills.ipc.ts
'skills:search'       // → { keyword: string }       ← SearchResult[]
'skills:list'         // → void                       ← Skill[]
'skills:install'      // → { package, agents[] }      ← InstallResult
'skills:update'       // → { name, agents[] }         ← UpdateResult
'skills:update-all'   // → { agents[] }               ← UpdateAllResult
'skills:remove'       // → { name, agents[] }         ← RemoveResult

// env.ipc.ts
'env:check'           // → void                       ← EnvStatus
'env:install-node'    // → void                       ← DownloadProgress (streaming)
'env:install-skills'  // → void                       ← InstallResult

// store.ipc.ts
'store:get-settings'  // → void                       ← Settings
'store:set-settings'  // → Partial<Settings>          ← void
```

## Command Mapping

### Verified Commands (based on `npx skills --help`, v1.5.3)

| Function | Command | Notes |
|----------|---------|-------|
| **Search** | `npx skills find {keyword}` | No `--json` support; text output with ANSI, needs parsing |
| **List (project)** | `npx skills list --json` | Returns JSON array |
| **List (global)** | `npx skills list -g --json` | Returns JSON array |
| **List (by agent)** | `npx skills list -a {agent} --json` | Filter by agent |
| **Install** | `npx skills add {package} --agent {a1} {a2} -y` | Multi-agent via space-separated args; `-y` skips prompts |
| **Install (global)** | `npx skills add {package} -g -y` | Global install |
| **Install (all agents)** | `npx skills add {package} --all` | Shorthand for `--skill '*' --agent '*' -y` |
| **Update single** | `npx skills update {name} -y` | Update specific skill |
| **Update (global)** | `npx skills update -g -y` | Update all global skills |
| **Update (project)** | `npx skills update -p -y` | Update all project skills |
| **Remove** | `npx skills remove {name} -y` | Remove by name |
| **Remove (global)** | `npx skills remove {name} -g -y` | Remove from global |
| **Remove (by agent)** | `npx skills remove {name} -a {agent} -y` | Remove from specific agent |
| **Version check** | `npx skills --version` | Verify CLI available |

### Output Parsing

**`list --json`**: Direct `JSON.parse(stdout)` — returns structured array.

**`find`**: Text parsing required. Pattern:
```
owner/repo@skill-name  38.1K installs
└ https://skills.sh/owner/repo/skill-name
```
Regex extraction: `/^(.+)@(.+)\s+([\d.]+K?)\s+installs$/m`

### Execution Strategy

- **Install (multi-agent)**: Single command with `--agent a1 a2 a3 -y`
- **Update (single)**: Direct execution
- **Update (all)**: `npx skills update -y` (auto-detects scope)
- **Remove**: Confirmation dialog required before execution
- **All commands**: 60-second timeout, `-y` flag to skip interactive prompts

## Agent System

### Data Source

Agent list from `SupportedAgents.md` (40+ agents), hardcoded as TypeScript constant in `src/renderer/src/constants/agents.ts`.

```ts
interface Agent {
  name: string           // "Claude Code"
  agentFlag: string      // "claude-code"
  projectPath: string    // ".claude/skills/"
  globalPath: string     // "~/.claude/skills/"
}
```

### Install Dialog

Multi-select agent picker with:
- Search/filter input
- "Common" group (frequently used: Claude Code, Cursor, GitHub Copilot, Gemini CLI)
- "All" group (alphabetical, scrollable)
- Selection summary at bottom
- No custom input path (future enhancement)

## Environment Detection

### Check Strategy

```ts
// EnvService
async checkAll(): Promise<EnvStatus> {
  const node = await this.checkCommand('node', ['--version'])
  const npx = await this.checkCommand('npx', ['--version'])
  const skills = await this.checkCommand('npx', ['skills', '--version'])
  return { nodeInstalled, nodeVersion, npxInstalled, skillsInstalled }
}
```

- Uses `which`/`where` to detect commands
- Results cached in electron-store (skip check on subsequent launches, configurable)
- Settings window allows toggling "check env on startup"

### Node.js Download (Fallback for non-technical users)

- Download to `app.getPath('userData')/node/`
- Uses Node.js built-in `fetch` + `fs` — no external HTTP dependency
- Platform-specific binary selection (win/mac/linux)

## Error Handling

```ts
class SkillsError extends Error {
  constructor(
    public code: 'COMMAND_NOT_FOUND' | 'NETWORK_ERROR' | 'TIMEOUT' | 'EXECUTION_FAILED' | 'UNKNOWN',
    public command: string,
    public stderr: string,
    public exitCode: number | null
  ) { super(message) }
}
```

| Scenario | Response |
|----------|----------|
| Command not found (ENOENT) | Dialog + redirect to Environment Detection window |
| Network timeout | Inline toast "Operation timed out" + retry button |
| Execution failure | Inline error panel showing stderr, non-blocking |
| Already installed | Toast "Already installed" + offer update |
| Permission denied | Toast "Requires admin privileges" + relaunch prompt |

## Pinia Stores

```ts
// stores/skills.ts
interface SkillsState {
  searchResults: SearchResult[]
  installedSkills: Skill[]
  loading: boolean
  currentOperation: { type: string; skillName: string } | null
}

// stores/env.ts
interface EnvState {
  nodeInstalled: boolean
  nodeVersion: string | null
  npxInstalled: boolean
  skillsInstalled: boolean
  checking: boolean
}

// stores/settings.ts
interface SettingsState {
  defaultAgent: string
  theme: 'light' | 'dark'
  autoCheckEnv: boolean
  nodeCustomPath: string | null
}
```

## Future Enhancements (Out of Scope)

- Log window (real-time command output history)
- Custom agent path input
- Dark theme
- Auto-update (electron-updater already in dependencies)
- Skill rating/reviews integration
