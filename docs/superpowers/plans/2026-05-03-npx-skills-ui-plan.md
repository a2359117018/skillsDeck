# NPX Skills UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Electron desktop app that provides a graphical interface for the `npx skills` CLI tool.

**Architecture:** Layered IPC — Main process Services ↔ IPC handlers ↔ Preload bridge ↔ Renderer (Vue 3 + Naive UI + Pinia). 3 windows: Main (skill management), Environment Detection, Settings.

**Tech Stack:** Electron 39, electron-vite, Vue 3, Naive UI, Pinia, Vue Router 4, VueUse, execa, electron-store, strip-ansi, decompress

---

## Priority & Dependency Map

```
P0 — Project Foundation (must complete before anything else)
  ├─ 1.1 Install dependencies
  ├─ 1.2 Create directory structure
  └─ 1.3 Shared type definitions

P1 — Core Services & Constants (depends on P0)
  ├─ 2.1 Agent constants                    ← depends: 1.3
  ├─ 2.2 StoreService                       ← depends: 1.3
  ├─ 2.3 SkillsService                      ← depends: 1.3
  ├─ 2.4 EnvService                         ← depends: 1.3
  └─ 2.5 WindowManager + main entry         ← depends: 2.2, 2.4

P2 — IPC Bridge (depends on P1)
  ├─ 3.1 IPC handlers (skills/env/store)    ← depends: 2.2, 2.3, 2.4, 2.5
  └─ 3.2 Preload API bridge + type decls    ← depends: 3.1

P3 — Renderer Foundation (depends on P2)
  ├─ 4.1 Vue Router + Pinia setup           ← depends: 3.2
  └─ 4.2 App layout shell (sidebar + nav)   ← depends: 4.1

P4 — Core UI Pages (depends on P3)
  ├─ 5.1 CommandOutput component            ← depends: 4.2
  ├─ 5.2 Search page                        ← depends: 5.1, 5.4
  ├─ 5.3 Installed list page                ← depends: 4.2
  ├─ 5.4 Install dialog (agent multi-select)← depends: 2.1, 4.2
  └─ 5.5 Skill detail page                  ← depends: 5.4

P5 — Secondary Windows (depends on P4)
  ├─ 6.1 Environment detection window       ← depends: 2.5, 4.2
  └─ 6.2 Settings window                    ← depends: 4.2, 2.1

P6 — Polish & Integration (depends on P5)
  ├─ 7.1 Global styles & HTML title
  └─ 7.2 Smoke test & fix
```

**Parallelizable groups:**
- P1: 2.1, 2.2, 2.3, 2.4 can run in parallel
- P4: 5.1, 5.3, 5.4 can run in parallel; 5.2 needs 5.1 + 5.4; 5.5 needs 5.4
- P5: 6.1 and 6.2 can run in parallel

---

## P-1: Pre-Implementation Verification

### 0.1 Verify npx skills CLI Interface

**Priority:** P-1 (before P0) | **Depends on:** nothing

Before building services, verify all assumed CLI flags against the actual CLI.

- [ ] **Step 1: Run `npx skills --help` and verify these commands exist**

Expected subcommands: `find`, `list`, `add`, `remove`, `update`
Expected flags: `--json` (list only), `--agent`, `-g`, `-y`, `--all`, `--version`

- [ ] **Step 2: Run `npx skills list --json` and inspect output schema**

Document the JSON structure (field names, types) — this becomes the contract for SkillsService.listSkills() parsing.

- [ ] **Step 3: Run `npx skills find <keyword>` and confirm output format**

Confirm that `find` does NOT support `--json`. Document the raw text format for CommandOutput component parsing.

- [ ] **Step 4: Record verified CLI interface in a comment in SkillsService.ts**

---

## P0: Project Foundation

### 1.1 Install Dependencies

**Priority:** P0 (blocking) | **Depends on:** nothing

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install naive-ui pinia vue-router@4 @vueuse/core execa electron-store strip-ansi decompress
```

- [ ] **Step 2: Install dev type dependencies**

```bash
npm install -D @types/strip-ansi @types/decompress
```

- [ ] **Step 3: Verify existing template still typechecks**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install project dependencies"
```

---

### 1.2 Create Directory Structure

**Priority:** P0 (blocking) | **Depends on:** 1.1

**Files:**
- Create: `src/main/services/` directory
- Create: `src/main/ipc/` directory
- Create: `src/renderer/src/router/` directory
- Create: `src/renderer/src/stores/` directory
- Create: `src/renderer/src/views/` directory
- Create: `src/renderer/src/components/layout/` directory
- Create: `src/renderer/src/components/skills/` directory
- Create: `src/renderer/src/components/common/` directory
- Create: `src/renderer/src/composables/` directory
- Create: `src/renderer/src/constants/` directory

- [ ] **Step 1: Create all directories**

```bash
mkdir -p src/main/services src/main/ipc
mkdir -p src/renderer/src/router src/renderer/src/stores src/renderer/src/views
mkdir -p src/renderer/src/components/layout src/renderer/src/components/skills src/renderer/src/components/common
mkdir -p src/renderer/src/composables src/renderer/src/constants
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: scaffold directory structure"
```

---

### 1.3 Shared Type Definitions

**Priority:** P0 (blocking) | **Depends on:** 1.2

**Files:**
- Create: `src/shared/types.ts` (new shared location accessible to both tsconfig.node.json and tsconfig.web.json)
- Modify: `tsconfig.node.json` (add `src/shared/**/*` to include)
- Modify: `tsconfig.web.json` (add `src/shared/**/*` to include)

These types are used by both Main process services and Renderer (via Preload declarations). They define the data contracts for IPC communication. Placing them in `src/shared/` ensures both tsconfig scopes can import them, eliminating the `any` typing problem in the preload bridge.

- [ ] **Step 1: Create `src/shared/types.ts`**

```ts
export interface EnvStatus {
  nodeInstalled: boolean
  nodeVersion: string | null
  npxInstalled: boolean
  skillsInstalled: boolean
}

export interface Skill {
  name: string
  version: string
  source: string
  scope: 'global' | 'project'
  agents: string[]
}

export interface CommandResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

export interface AppSettings {
  defaultAgent: string
  autoCheckEnv: boolean
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/types.ts
git commit -m "feat: add shared type definitions for IPC contracts"
```

> **Important:** All subsequent `import type { ... } from '../types'` references in Main process files should use `import type { ... } from '../../shared/types'` (adjusted for relative path). The Preload `index.d.ts` should import from `../../shared/types` to replace `any` return types with proper types.

---

## P1: Core Services & Constants

### 2.1 Agent Constants

**Priority:** P1 | **Depends on:** 1.3

**Files:**
- Create: `src/renderer/src/constants/agents.ts`

Agent list from `SupportedAgents.md`, hardcoded as a TypeScript constant array. This file lives in renderer because it's only used by UI components (install dialog, list page).

> **Maintenance note:** This list must be synced manually when `SupportedAgents.md` is updated. Add a comment at the top of the file documenting this. Consider adding a CI check or build script that compares this file against SupportedAgents.md in the future.

- [ ] **Step 1: Create `src/renderer/src/constants/agents.ts`**

```ts
export interface Agent {
  name: string
  agentFlag: string
  projectPath: string
  globalPath: string
}

export const COMMON_AGENT_FLAGS = ['claude-code', 'cursor', 'github-copilot', 'gemini-cli']

export const AGENTS: Agent[] = [
  { name: 'AiderDesk', agentFlag: 'aider-desk', projectPath: '.aider-desk/skills/', globalPath: '~/.aider-desk/skills/' },
  { name: 'Amp', agentFlag: 'amp', projectPath: '.agents/skills/', globalPath: '~/.config/agents/skills/' },
  { name: 'Kimi Code CLI', agentFlag: 'kimi-cli', projectPath: '.agents/skills/', globalPath: '~/.config/agents/skills/' },
  { name: 'Replit', agentFlag: 'replit', projectPath: '.agents/skills/', globalPath: '~/.config/agents/skills/' },
  { name: 'Universal', agentFlag: 'universal', projectPath: '.agents/skills/', globalPath: '~/.config/agents/skills/' },
  { name: 'Antigravity', agentFlag: 'antigravity', projectPath: '.agents/skills/', globalPath: '~/.gemini/antigravity/skills/' },
  { name: 'Augment', agentFlag: 'augment', projectPath: '.augment/skills/', globalPath: '~/.augment/skills/' },
  { name: 'IBM Bob', agentFlag: 'bob', projectPath: '.bob/skills/', globalPath: '~/.bob/skills/' },
  { name: 'Claude Code', agentFlag: 'claude-code', projectPath: '.claude/skills/', globalPath: '~/.claude/skills/' },
  { name: 'OpenClaw', agentFlag: 'openclaw', projectPath: 'skills/', globalPath: '~/.openclaw/skills/' },
  { name: 'Cline', agentFlag: 'cline', projectPath: '.agents/skills/', globalPath: '~/.agents/skills/' },
  { name: 'Dexto', agentFlag: 'dexto', projectPath: '.agents/skills/', globalPath: '~/.agents/skills/' },
  { name: 'Warp', agentFlag: 'warp', projectPath: '.agents/skills/', globalPath: '~/.agents/skills/' },
  { name: 'CodeArts Agent', agentFlag: 'codearts-agent', projectPath: '.codeartsdoer/skills/', globalPath: '~/.codeartsdoer/skills/' },
  { name: 'CodeBuddy', agentFlag: 'codebuddy', projectPath: '.codebuddy/skills/', globalPath: '~/.codebuddy/skills/' },
  { name: 'Codemaker', agentFlag: 'codemaker', projectPath: '.codemaker/skills/', globalPath: '~/.codemaker/skills/' },
  { name: 'Code Studio', agentFlag: 'codestudio', projectPath: '.codestudio/skills/', globalPath: '~/.codestudio/skills/' },
  { name: 'Codex', agentFlag: 'codex', projectPath: '.agents/skills/', globalPath: '~/.codex/skills/' },
  { name: 'Command Code', agentFlag: 'command-code', projectPath: '.commandcode/skills/', globalPath: '~/.commandcode/skills/' },
  { name: 'Continue', agentFlag: 'continue', projectPath: '.continue/skills/', globalPath: '~/.continue/skills/' },
  { name: 'Cortex Code', agentFlag: 'cortex', projectPath: '.cortex/skills/', globalPath: '~/.snowflake/cortex/skills/' },
  { name: 'Crush', agentFlag: 'crush', projectPath: '.crush/skills/', globalPath: '~/.config/crush/skills/' },
  { name: 'Cursor', agentFlag: 'cursor', projectPath: '.agents/skills/', globalPath: '~/.cursor/skills/' },
  { name: 'Deep Agents', agentFlag: 'deepagents', projectPath: '.agents/skills/', globalPath: '~/.deepagents/agent/skills/' },
  { name: 'Devin for Terminal', agentFlag: 'devin', projectPath: '.devin/skills/', globalPath: '~/.config/devin/skills/' },
  { name: 'Droid', agentFlag: 'droid', projectPath: '.factory/skills/', globalPath: '~/.factory/skills/' },
  { name: 'Firebender', agentFlag: 'firebender', projectPath: '.agents/skills/', globalPath: '~/.firebender/skills/' },
  { name: 'ForgeCode', agentFlag: 'forgecode', projectPath: '.forge/skills/', globalPath: '~/.forge/skills/' },
  { name: 'Gemini CLI', agentFlag: 'gemini-cli', projectPath: '.agents/skills/', globalPath: '~/.gemini/skills/' },
  { name: 'GitHub Copilot', agentFlag: 'github-copilot', projectPath: '.agents/skills/', globalPath: '~/.copilot/skills/' },
  { name: 'Goose', agentFlag: 'goose', projectPath: '.goose/skills/', globalPath: '~/.config/goose/skills/' },
  { name: 'Junie', agentFlag: 'junie', projectPath: '.junie/skills/', globalPath: '~/.junie/skills/' },
  { name: 'iFlow CLI', agentFlag: 'iflow-cli', projectPath: '.iflow/skills/', globalPath: '~/.iflow/skills/' },
  { name: 'Kilo Code', agentFlag: 'kilo', projectPath: '.kilocode/skills/', globalPath: '~/.kilocode/skills/' },
  { name: 'Kiro CLI', agentFlag: 'kiro-cli', projectPath: '.kiro/skills/', globalPath: '~/.kiro/skills/' },
  { name: 'Kode', agentFlag: 'kode', projectPath: '.kode/skills/', globalPath: '~/.kode/skills/' },
  { name: 'MCPJam', agentFlag: 'mcpjam', projectPath: '.mcpjam/skills/', globalPath: '~/.mcpjam/skills/' },
  { name: 'Mistral Vibe', agentFlag: 'mistral-vibe', projectPath: '.vibe/skills/', globalPath: '~/.vibe/skills/' },
  { name: 'Mux', agentFlag: 'mux', projectPath: '.mux/skills/', globalPath: '~/.mux/skills/' },
  { name: 'OpenCode', agentFlag: 'opencode', projectPath: '.agents/skills/', globalPath: '~/.config/opencode/skills/' },
  { name: 'OpenHands', agentFlag: 'openhands', projectPath: '.openhands/skills/', globalPath: '~/.openhands/skills/' },
  { name: 'Pi', agentFlag: 'pi', projectPath: '.pi/skills/', globalPath: '~/.pi/agent/skills/' },
  { name: 'Qoder', agentFlag: 'qoder', projectPath: '.qoder/skills/', globalPath: '~/.qoder/skills/' },
  { name: 'Qwen Code', agentFlag: 'qwen-code', projectPath: '.qwen/skills/', globalPath: '~/.qwen/skills/' },
  { name: 'Rovo Dev', agentFlag: 'rovodev', projectPath: '.rovodev/skills/', globalPath: '~/.rovodev/skills/' },
  { name: 'Roo Code', agentFlag: 'roo', projectPath: '.roo/skills/', globalPath: '~/.roo/skills/' },
  { name: 'Tabnine CLI', agentFlag: 'tabnine-cli', projectPath: '.tabnine/agent/skills/', globalPath: '~/.tabnine/agent/skills/' },
  { name: 'Trae', agentFlag: 'trae', projectPath: '.trae/skills/', globalPath: '~/.trae/skills/' },
  { name: 'Trae CN', agentFlag: 'trae-cn', projectPath: '.trae/skills/', globalPath: '~/.trae-cn/skills/' },
  { name: 'Windsurf', agentFlag: 'windsurf', projectPath: '.windsurf/skills/', globalPath: '~/.codeium/windsurf/skills/' },
  { name: 'Zencoder', agentFlag: 'zencoder', projectPath: '.zencoder/skills/', globalPath: '~/.zencoder/skills/' },
  { name: 'Neovate', agentFlag: 'neovate', projectPath: '.neovate/skills/', globalPath: '~/.neovate/skills/' },
  { name: 'Pochi', agentFlag: 'pochi', projectPath: '.pochi/skills/', globalPath: '~/.pochi/skills/' },
  { name: 'AdaL', agentFlag: 'adal', projectPath: '.adal/skills/', globalPath: '~/.adal/skills/' }
]

export function getCommonAgents(): Agent[] {
  return AGENTS.filter((a) => COMMON_AGENT_FLAGS.includes(a.agentFlag))
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/constants/agents.ts
git commit -m "feat: add supported agents constants (40+ agents from SupportedAgents.md)"
```

---

### 2.2 StoreService

**Priority:** P1 | **Depends on:** 1.3

**Files:**
- Create: `src/main/services/StoreService.ts`

Thin wrapper around `electron-store`. Persists user settings and environment check results.

- [ ] **Step 1: Create `src/main/services/StoreService.ts`**

```ts
import Store from 'electron-store'
import type { AppSettings, EnvStatus } from '../types'

interface StoreSchema {
  settings: AppSettings
  envStatus: EnvStatus | null
}

let store: Store<StoreSchema> | null = null

function getStore(): Store<StoreSchema> {
  if (!store) {
    store = new Store<StoreSchema>({
      defaults: {
        settings: {
          defaultAgent: 'claude-code',
          autoCheckEnv: true
        },
        envStatus: null
      }
    })
  }
  return store
}

export function getSettings(): AppSettings {
  return getStore().get('settings')
}

export function setSettings(partial: Partial<AppSettings>): void {
  const current = getStore().get('settings')
  getStore().set('settings', { ...current, ...partial })
}

export function getEnvStatus(): EnvStatus | null {
  return getStore().get('envStatus')
}

export function setEnvStatus(status: EnvStatus): void {
  getStore().set('envStatus', status)
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/main/services/StoreService.ts
git commit -m "feat: add StoreService (electron-store wrapper)"
```

---

### 2.3 SkillsService

**Priority:** P1 | **Depends on:** 1.3

**Files:**
- Create: `src/main/services/SkillsService.ts`

Core service that wraps all `npx skills` CLI commands via `execa`. Handles error classification, output parsing, and timeout management.

- [ ] **Step 1: Create `src/main/services/SkillsService.ts`**

```ts
import { execa } from 'execa'
import stripAnsi from 'strip-ansi'
import type { CommandResult, Skill } from '../types'

const COMMAND_TIMEOUT = 60000

export class SkillsError extends Error {
  constructor(
    public code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'EXECUTION_FAILED' | 'UNKNOWN',
    public command: string,
    public stderr: string,
    public exitCode: number | null
  ) {
    super(`Skills command failed: ${code}`)
    this.name = 'SkillsError'
  }
}

async function execute(args: string[]): Promise<CommandResult> {
  try {
    const result = await execa('npx', ['skills', ...args], {
      timeout: COMMAND_TIMEOUT,
      reject: false,
      shell: process.platform === 'win32'
    })
    return {
      success: result.exitCode === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new SkillsError('COMMAND_NOT_FOUND', `npx skills ${args.join(' ')}`, '', null)
    }
    if (error.timedOut) {
      throw new SkillsError('TIMEOUT', `npx skills ${args.join(' ')}`, '', null)
    }
    throw new SkillsError('UNKNOWN', `npx skills ${args.join(' ')}`, error.message, null)
  }
}

export async function searchSkills(keyword: string): Promise<string> {
  const result = await execute(['find', keyword])
  if (!result.success) {
    throw new SkillsError('EXECUTION_FAILED', 'find', result.stderr, result.exitCode)
  }
  return stripAnsi(result.stdout)
}

export async function listSkills(global?: boolean, agent?: string): Promise<Skill[]> {
  const args = ['list', '--json']
  if (global) args.push('-g')
  if (agent) args.push('-a', agent)
  const result = await execute(args)
  if (!result.success) {
    throw new SkillsError('EXECUTION_FAILED', 'list', result.stderr, result.exitCode)
  }
  try {
    return JSON.parse(result.stdout)
  } catch {
    return []
  }
}

export async function installSkill(
  packageRef: string,
  agents: string[],
  global?: boolean
): Promise<CommandResult> {
  const args = ['add', packageRef]
  if (global) {
    args.push('-g')
  } else if (agents.length > 0) {
    args.push('--agent', ...agents)
  }
  args.push('-y')
  return execute(args)
}

export async function updateSkill(name: string, global?: boolean): Promise<CommandResult> {
  const args = ['update', name, '-y']
  if (global) args.push('-g')
  return execute(args)
}

export async function updateAllSkills(global?: boolean): Promise<CommandResult> {
  const args = ['update', '-y']
  if (global) args.push('-g')
  return execute(args)
}

export async function removeSkill(
  name: string,
  agent?: string,
  global?: boolean
): Promise<CommandResult> {
  const args = ['remove', name, '-y']
  if (global) args.push('-g')
  if (agent) args.push('-a', agent)
  return execute(args)
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/main/services/SkillsService.ts
git commit -m "feat: add SkillsService (execa wrapper for npx skills CLI)"
```

---

### 2.4 EnvService

**Priority:** P1 | **Depends on:** 1.3

**Files:**
- Create: `src/main/services/EnvService.ts`

Detects Node.js / npx / skills availability. Provides Node.js download + extraction + PATH registration for non-technical users.

- [ ] **Step 1: Create `src/main/services/EnvService.ts`**

```ts
import { execa } from 'execa'
import { app } from 'electron'
import { createWriteStream, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import decompress from 'decompress'
import type { EnvStatus } from '../../shared/types'

async function checkCommand(
  command: string,
  args: string[]
): Promise<{ ok: boolean; version: string | null }> {
  try {
    const result = await execa(command, args, { timeout: 10000, reject: false, shell: process.platform === 'win32' })
    if (result.exitCode === 0) {
      return { ok: true, version: result.stdout.trim() }
    }
    return { ok: false, version: null }
  } catch {
    return { ok: false, version: null }
  }
}

export async function checkAll(): Promise<EnvStatus> {
  const node = await checkCommand('node', ['--version'])
  const npx = await checkCommand('npx', ['--version'])
  const skills = await checkCommand('npx', ['skills', '--version'])
  return {
    nodeInstalled: node.ok,
    nodeVersion: node.version,
    npxInstalled: npx.ok,
    skillsInstalled: skills.ok
  }
}

const NODE_DOWNLOAD_URLS: Record<string, () => string> = {
  win32: () => 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip',
  darwin: () =>
    process.arch === 'arm64'
      ? 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-darwin-arm64.tar.gz'
      : 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-darwin-x64.tar.gz',
  linux: () => 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz'
}

export function getNodeDownloadUrl(): string {
  return (NODE_DOWNLOAD_URLS[process.platform] || NODE_DOWNLOAD_URLS.linux)()
}

export function getNodeInstallDir(): string {
  return join(app.getPath('userData'), 'node')
}

export async function downloadNode(
  onProgress: (percent: number) => void
): Promise<string> {
  const url = getNodeDownloadUrl()
  const installDir = getNodeInstallDir()
  if (!existsSync(installDir)) {
    mkdirSync(installDir, { recursive: true })
  }
  const fileName = url.split('/').pop()!
  const archivePath = join(installDir, fileName)

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed: ${response.statusText}`)
  const contentLength = Number(response.headers.get('content-length') || 0)
  let downloaded = 0

  const stream = createWriteStream(archivePath)
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    stream.write(value)
    downloaded += value.length
    if (contentLength > 0) {
      onProgress(Math.round((downloaded / contentLength) * 100))
    }
  }
  stream.end()

  return archivePath
}

export async function extractAndRegisterNode(archivePath: string): Promise<string> {
  const installDir = getNodeInstallDir()
  await decompress(archivePath, installDir)
  const extractedDirName = readdirSync(installDir).find(
    (d) => d.startsWith('node-v') && !d.endsWith('.zip') && !d.endsWith('.tar.gz') && !d.endsWith('.tar.xz')
  )
  if (!extractedDirName) throw new Error('Extraction failed: no node directory found')
  return join(installDir, extractedDirName)
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/main/services/EnvService.ts
git commit -m "feat: add EnvService (env detection + Node.js download)"
```

---

### 2.5 WindowManager

**Priority:** P1 | **Depends on:** 2.2, 2.4

**Files:**
- Create: `src/main/services/WindowManager.ts`
- Modify: `src/main/index.ts`

> **Note:** Task 2.5 rewrites index.ts which imports `./ipc` (created in task 3.1). Create a minimal `src/main/ipc/index.ts` stub in this step:
> ```ts
> export function registerIpcHandlers(): void {}
> ```
> This stub will be replaced with the full implementation in task 3.1.

Manages lifecycle of all 3 windows. Each window loads the same `index.html` but with a `?window=<type>` query param to distinguish which view to render. Main entry updated to run env check on startup.

- [ ] **Step 1: Create `src/main/services/WindowManager.ts`**

```ts
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null
let envWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

function createWindowOptions(opts: {
  width: number
  height: number
  title: string
}): Electron.BrowserWindowConstructorOptions {
  return {
    width: opts.width,
    height: opts.height,
    show: false,
    autoHideMenuBar: true,
    title: opts.title,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  }
}

function loadWindow(win: BrowserWindow, query?: Record<string, string>): void {
  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const base = process.env['ELECTRON_RENDERER_URL']
    const qs = query ? '?' + new URLSearchParams(query).toString() : ''
    win.loadURL(`${base}${qs}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { query })
  }
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow(
    createWindowOptions({ width: 1200, height: 800, title: 'NPX Skills UI' })
  )
  loadWindow(mainWindow)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  return mainWindow
}

export function createEnvWindow(): BrowserWindow {
  if (envWindow && !envWindow.isDestroyed()) {
    envWindow.focus()
    return envWindow
  }
  envWindow = new BrowserWindow({
    ...createWindowOptions({ width: 500, height: 400, title: 'Environment Detection' }),
    parent: mainWindow || undefined,
    modal: true
  })
  loadWindow(envWindow, { window: 'env' })
  envWindow.on('closed', () => {
    envWindow = null
  })
  return envWindow
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }
  settingsWindow = new BrowserWindow({
    ...createWindowOptions({ width: 600, height: 500, title: 'Settings' }),
    parent: mainWindow || undefined,
    modal: true
  })
  loadWindow(settingsWindow, { window: 'settings' })
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
  return settingsWindow
}

export function closeEnvWindow(): void {
  if (envWindow && !envWindow.isDestroyed()) {
    envWindow.close()
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
```

- [ ] **Step 2: Rewrite `src/main/index.ts`**

```ts
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow, createEnvWindow } from './services/WindowManager'
import { checkAll } from './services/EnvService'
import { registerIpcHandlers } from './ipc'
import { getSettings, setEnvStatus } from './services/StoreService'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.npx-skills-ui')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createMainWindow()

  const settings = getSettings()
  if (settings.autoCheckEnv) {
    checkAll().then((status) => {
      setEnvStatus(status)
      if (!status.nodeInstalled || !status.npxInstalled || !status.skillsInstalled) {
        createEnvWindow()
      }
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/main/services/WindowManager.ts src/main/index.ts
git commit -m "feat: add WindowManager and update main entry with startup flow"
```

---

## P2: IPC Bridge

### 3.1 IPC Handlers

**Priority:** P2 | **Depends on:** 2.2, 2.3, 2.4, 2.5

**Files:**
- Create: `src/main/ipc/skills.ipc.ts`
- Create: `src/main/ipc/env.ipc.ts`
- Create: `src/main/ipc/store.ipc.ts`
- Create: `src/main/ipc/index.ts`

Three IPC handler modules, one per domain. `index.ts` aggregates and exposes a single `registerIpcHandlers()` function used by main entry.

- [ ] **Step 1: Create `src/main/ipc/skills.ipc.ts`**

```ts
import { ipcMain } from 'electron'
import {
  searchSkills,
  listSkills,
  installSkill,
  updateSkill,
  updateAllSkills,
  removeSkill
} from '../services/SkillsService'

export function registerSkillsIpc(): void {
  ipcMain.handle('skills:search', async (_, keyword: string) => {
    return searchSkills(keyword)
  })

  ipcMain.handle('skills:list', async (_, opts?: { global?: boolean; agent?: string }) => {
    return listSkills(opts?.global, opts?.agent)
  })

  ipcMain.handle(
    'skills:install',
    async (_, opts: { packageRef: string; agents: string[]; global?: boolean }) => {
      return installSkill(opts.packageRef, opts.agents, opts.global)
    }
  )

  ipcMain.handle(
    'skills:update',
    async (_, opts: { name: string; global?: boolean }) => {
      return updateSkill(opts.name, opts.global)
    }
  )

  ipcMain.handle('skills:update-all', async (_, opts?: { global?: boolean }) => {
    return updateAllSkills(opts?.global)
  })

  ipcMain.handle(
    'skills:remove',
    async (_, opts: { name: string; agent?: string; global?: boolean }) => {
      return removeSkill(opts.name, opts.agent, opts.global)
    }
  )
}
```

- [ ] **Step 2: Create `src/main/ipc/env.ipc.ts`**

```ts
import { ipcMain, BrowserWindow } from 'electron'
import { checkAll, downloadNode, extractAndRegisterNode } from '../services/EnvService'
import { setEnvStatus } from '../services/StoreService'
import { closeEnvWindow, createSettingsWindow } from '../services/WindowManager'

export function registerEnvIpc(): void {
  ipcMain.handle('env:check', async () => {
    const status = await checkAll()
    setEnvStatus(status)
    return status
  })

  ipcMain.handle('env:install-node', async (event) => {
    try {
      const archivePath = await downloadNode((percent) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win?.webContents.send('env:download-progress', percent)
      })
      await extractAndRegisterNode(archivePath)
      const status = await checkAll()
      setEnvStatus(status)
      if (status.nodeInstalled && status.npxInstalled && status.skillsInstalled) {
        closeEnvWindow()
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('window:open-settings', () => {
    createSettingsWindow()
  })
}
```

- [ ] **Step 3: Create `src/main/ipc/store.ipc.ts`**

```ts
import { ipcMain } from 'electron'
import { getSettings, setSettings } from '../services/StoreService'

export function registerStoreIpc(): void {
  ipcMain.handle('store:get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('store:set-settings', (_, partial) => {
    setSettings(partial)
  })
}
```

- [ ] **Step 4: Create `src/main/ipc/index.ts`**

```ts
import { registerSkillsIpc } from './skills.ipc'
import { registerEnvIpc } from './env.ipc'
import { registerStoreIpc } from './store.ipc'

export function registerIpcHandlers(): void {
  registerSkillsIpc()
  registerEnvIpc()
  registerStoreIpc()
}
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/main/ipc/
git commit -m "feat: add IPC handlers (skills, env, store, window)"
```

---

### 3.2 Preload API Bridge + Type Declarations

**Priority:** P2 | **Depends on:** 3.1

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

Exposes typed API to renderer via `contextBridge`. Each domain (skills, env, store, window) maps to an IPC channel.

- [ ] **Step 1: Rewrite `src/preload/index.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  skills: {
    search: (keyword: string) => ipcRenderer.invoke('skills:search', keyword),
    list: (opts?: { global?: boolean; agent?: string }) =>
      ipcRenderer.invoke('skills:list', opts),
    install: (opts: { packageRef: string; agents: string[]; global?: boolean }) =>
      ipcRenderer.invoke('skills:install', opts),
    update: (opts: { name: string; global?: boolean }) =>
      ipcRenderer.invoke('skills:update', opts),
    updateAll: (opts?: { global?: boolean }) =>
      ipcRenderer.invoke('skills:update-all', opts),
    remove: (opts: { name: string; agent?: string; global?: boolean }) =>
      ipcRenderer.invoke('skills:remove', opts)
  },
  env: {
    check: () => ipcRenderer.invoke('env:check'),
    installNode: () => ipcRenderer.invoke('env:install-node'),
    onDownloadProgress: (callback: (percent: number) => void) => {
      const listener = (_: any, percent: number) => callback(percent)
      ipcRenderer.on('env:download-progress', listener)
      return () => ipcRenderer.removeListener('env:download-progress', listener)
    }
  },
  store: {
    getSettings: () => ipcRenderer.invoke('store:get-settings'),
    setSettings: (partial: Record<string, unknown>) =>
      ipcRenderer.invoke('store:set-settings', partial)
  },
  window: {
    openSettings: () => ipcRenderer.invoke('window:open-settings')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI as any
  window.api = api as any
}
```

- [ ] **Step 2: Rewrite `src/preload/index.d.ts`**

```ts
import { ElectronAPI } from '@electron-toolkit/preload'

export interface AppApi {
  skills: {
    search: (keyword: string) => Promise<string>
    list: (opts?: { global?: boolean; agent?: string }) => Promise<any[]>
    install: (opts: { packageRef: string; agents: string[]; global?: boolean }) => Promise<any>
    update: (opts: { name: string; global?: boolean }) => Promise<any>
    updateAll: (opts?: { global?: boolean }) => Promise<any>
    remove: (opts: { name: string; agent?: string; global?: boolean }) => Promise<any>
  }
  env: {
    check: () => Promise<any>
    installNode: () => Promise<{ success: boolean; error?: string }>
    onDownloadProgress: (callback: (percent: number) => void) => () => void
  }
  store: {
    getSettings: () => Promise<any>
    setSettings: (partial: Record<string, unknown>) => Promise<void>
  }
  window: {
    openSettings: () => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppApi
  }
}
```

- [ ] **Step 2: Add `src/shared` to both tsconfig files**

In `tsconfig.node.json`, add `"src/shared/**/*"` to the `include` array.
In `tsconfig.web.json`, add `"src/shared/**/*"` to the `include` array.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/preload/ src/shared/ tsconfig.node.json tsconfig.web.json
git commit -m "feat: add preload API bridge with shared types"
```

---

### 4.1 Vue Router + Pinia Setup

**Priority:** P3 | **Depends on:** 3.2

**Files:**
- Modify: `src/renderer/src/main.ts`
- Create: `src/renderer/src/router/index.ts`
- Create: `src/renderer/src/stores/skills.ts`
- Create: `src/renderer/src/stores/env.ts`

Router with 4 routes: `/` (installed list), `/search` (search), `/skill/:packageRef` (detail), plus env/settings window routes. Pinia stores for skills and env state.

- [ ] **Step 1: Create `src/renderer/src/router/index.ts`**

```ts
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'installed', component: () => import('../views/InstalledList.vue') },
  { path: '/search', name: 'search', component: () => import('../views/SkillsSearch.vue') },
  { path: '/skill/:packageRef', name: 'skill-detail', component: () => import('../views/SkillDetail.vue'), props: true }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
```

- [ ] **Step 2: Create `src/renderer/src/stores/skills.ts`**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSkillsStore = defineStore('skills', () => {
  const searchOutput = ref('')
  const installedSkills = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function clearError() { error.value = null }

  async function search(keyword: string) {
    loading.value = true
    error.value = null
    try {
      searchOutput.value = await window.api.skills.search(keyword)
    } catch (e: any) {
      error.value = e.message || 'Search failed'
    } finally {
      loading.value = false
    }
  }

  async function fetchInstalled(global?: boolean) {
    loading.value = true
    error.value = null
    try {
      installedSkills.value = await window.api.skills.list({ global })
    } catch (e: any) {
      error.value = e.message || 'Failed to load skills'
    } finally {
      loading.value = false
    }
  }

  async function install(packageRef: string, agents: string[], isGlobal: boolean) {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.install({ packageRef, agents, global: isGlobal })
    } catch (e: any) {
      error.value = e.message || 'Install failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(packageRef: string) {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.update({ packageRef })
    } catch (e: any) {
      error.value = e.message || 'Update failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(packageRef: string) {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.remove({ packageRef })
    } catch (e: any) {
      error.value = e.message || 'Remove failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { searchOutput, installedSkills, loading, error, clearError, search, fetchInstalled, install, update, remove }
})
```

- [ ] **Step 3: Create `src/renderer/src/stores/env.ts`**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEnvStore = defineStore('env', () => {
  const status = ref<any>(null)
  const checking = ref(false)
  const downloading = ref(false)
  const downloadProgress = ref(0)
  const error = ref<string | null>(null)

  async function check() {
    checking.value = true
    error.value = null
    try {
      status.value = await window.api.env.check()
    } catch (e: any) {
      error.value = e.message || 'Environment check failed'
    } finally {
      checking.value = false
    }
  }

  async function installNode() {
    downloading.value = true
    downloadProgress.value = 0
    error.value = null
    try {
      const result = await window.api.env.installNode()
      if (!result.success) throw new Error(result.error)
      await check()
    } catch (e: any) {
      error.value = e.message || 'Node.js install failed'
    } finally {
      downloading.value = false
    }
  }

  return { status, checking, downloading, downloadProgress, error, check, installNode }
})
```

- [ ] **Step 4: Rewrite `src/renderer/src/main.ts`**

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/main.ts src/renderer/src/router/ src/renderer/src/stores/
git commit -m "feat: add Vue Router, Pinia stores for skills and env"
```

---

### 4.2 App Layout Shell

**Priority:** P3 | **Depends on:** 4.1

**Files:**
- Modify: `src/renderer/src/App.vue`

Layout shell with left sidebar navigation. Sidebar shows: installed list, search, settings. The content area renders `<router-view />`. Window-type detection: env/settings windows render their own views, main window renders this shell.

- [ ] **Step 1: Rewrite `src/renderer/src/App.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NLayout, NLayoutSider, NMenu, NIcon } from 'naive-ui'
import { useRouter, useRoute } from 'vue-router'
import type { MenuOption } from 'naive-ui'
import { h } from 'vue'

const router = useRouter()
const route = useRoute()

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'

const menuOptions: MenuOption[] = [
  { label: '已安装', key: 'installed' },
  { label: '搜索', key: 'search' }
]

function handleMenuUpdate(key: string) {
  router.push({ name: key })
}

const activeKey = computed(() => route.name as string)
</script>

<template>
  <div v-if="windowType === 'main'" class="app-shell">
    <NLayout has-sider>
      <NLayoutSider bordered :width="180" :collapsed-width="0" collapse-mode="width">
        <div class="sidebar-header" style="padding: 16px; font-weight: 600; font-size: 14px">
          NPX Skills
        </div>
        <NMenu :options="menuOptions" :value="activeKey" @update:value="handleMenuUpdate" />
      </NLayoutSider>
      <NLayout>
        <div style="padding: 24px; overflow-y: auto; height: 100vh">
          <router-view />
        </div>
      </NLayout>
    </NLayout>
  </div>
  <div v-else-if="windowType === 'env'">
    <router-view />
  </div>
  <div v-else-if="windowType === 'settings'">
    <router-view />
  </div>
</template>

<style scoped>
.app-shell { height: 100vh; }
.sidebar-header { border-bottom: 1px solid var(--n-border-color); }
</style>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/App.vue
git commit -m "feat: add app layout shell with sidebar navigation"
```

---

### 5.1 CommandOutput Component

**Priority:** P4 | **Depends on:** 4.2

**Files:**
- Create: `src/renderer/src/components/common/CommandOutput.vue`

Terminal-style output display. Parses skill refs (`owner/repo@skill-name`) into clickable spans that emit navigate events.

- [ ] **Step 1: Create `src/renderer/src/components/common/CommandOutput.vue`**

```vue
<script setup lang="ts">
import { computed, h } from 'vue'

const props = defineProps<{ content: string }>()
const emit = defineEmits<{ (e: 'navigate', packageRef: string): void }>()

const SKILL_REF_RE = /([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+)/g

const segments = computed(() => {
  const parts: { type: 'text' | 'ref'; value: string }[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const re = new RegExp(SKILL_REF_RE.source, 'g')
  while ((match = re.exec(props.content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: props.content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'ref', value: match[1] })
    lastIndex = re.lastIndex
  }
  if (lastIndex < props.content.length) {
    parts.push({ type: 'text', value: props.content.slice(lastIndex) })
  }
  return parts
})
</script>

<template>
  <div class="terminal-output">
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.type === 'text'" class="text">{{ seg.value }}</span>
      <a v-else class="skill-ref" @click.prevent="emit('navigate', seg.value)">{{ seg.value }}</a>
    </template>
  </div>
</template>

<style scoped>
.terminal-output {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}
.skill-ref {
  color: #4fc3f7;
  cursor: pointer;
  text-decoration: underline;
}
.skill-ref:hover { color: #81d4fa; }
</style>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/common/CommandOutput.vue
git commit -m "feat: add CommandOutput component with clickable skill refs"
```

---

### 5.2 Search Page

**Priority:** P4 | **Depends on:** 5.1, 5.4

**Files:**
- Create: `src/renderer/src/components/skills/SkillSearchBar.vue`
- Create: `src/renderer/src/views/SkillsSearch.vue`

Search bar with 300ms debounce. Results displayed in CommandOutput terminal panel. Clicking a skill ref opens install dialog.

> **Design note:** `npx skills find` does NOT support `--json` output. The terminal-style display with clickable skill refs is the intended UX given this CLI limitation. This is documented and accepted.

- [ ] **Step 1: Create `src/renderer/src/components/skills/SkillSearchBar.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { NInput } from 'naive-ui'
import { useDebounceFn } from '@vueuse/core'

const keyword = ref('')
const emit = defineEmits<{ (e: 'search', keyword: string): void }>()

const debouncedSearch = useDebounceFn(() => {
  if (keyword.value.trim()) emit('search', keyword.value.trim())
}, 300)

function onInput(value: string) {
  keyword.value = value
  debouncedSearch()
}
</script>

<template>
  <NInput
    :value="keyword"
    placeholder="搜索技能..."
    clearable
    @input="onInput"
    @clear="keyword = ''"
  />
</template>
```

- [ ] **Step 2: Create `src/renderer/src/views/SkillsSearch.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { NSpin, NEmpty } from 'naive-ui'
import { useSkillsStore } from '../../stores/skills'
import SkillSearchBar from '../../components/skills/SkillSearchBar.vue'
import CommandOutput from '../../components/common/CommandOutput.vue'
import SkillInstallDialog from '../../components/skills/SkillInstallDialog.vue'

const skillsStore = useSkillsStore()
const showInstallDialog = ref(false)
const selectedPackage = ref('')

function handleSearch(keyword: string) {
  skillsStore.search(keyword)
}

function handleSelectSkill(packageRef: string) {
  selectedPackage.value = packageRef
  showInstallDialog.value = true
}

function handleInstallComplete() {
  showInstallDialog.value = false
  selectedPackage.value = ''
}
</script>

<template>
  <div class="search-page">
    <SkillSearchBar @search="handleSearch" />
    <NSpin :show="skillsStore.loading" style="margin-top: 16px">
      <CommandOutput
        v-if="skillsStore.searchOutput"
        :content="skillsStore.searchOutput"
        @select-skill="handleSelectSkill"
      />
      <NEmpty v-else description="输入关键词搜索技能" style="margin-top: 48px" />
    </NSpin>
    <SkillInstallDialog
      v-model:show="showInstallDialog"
      :package-ref="selectedPackage"
      @complete="handleInstallComplete"
    />
  </div>
</template>

<style scoped>
.search-page { max-width: 900px; }
</style>
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/skills/SkillSearchBar.vue src/renderer/src/views/SkillsSearch.vue
git commit -m "feat: add search page with debounce and clickable results"
```

---

### 5.3 Installed List Page

**Priority:** P4 | **Depends on:** 4.2

**Files:**
- Create: `src/renderer/src/views/SkillsList.vue`

Table view of installed skills. Tabs for project/global scope. Update/delete actions per row, plus "Update All" batch action.

- [ ] **Step 1: Create `src/renderer/src/views/SkillsList.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref, h } from 'vue'
import { NDataTable, NButton, NSpace, NTabPane, NTabs, NEmpty, NSpin, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useSkillsStore } from '../../stores/skills'

const skillsStore = useSkillsStore()
const message = useMessage()
const currentTab = ref('project')

async function loadSkills() {
  await skillsStore.fetchInstalled(currentTab.value === 'global')
}

onMounted(() => loadSkills())

async function handleUpdateAll() {
  const result = await skillsStore.updateAll(currentTab.value === 'global')
  if (result.success) {
    message.success('更新成功')
    loadSkills()
  } else {
    message.error('更新失败: ' + (result.stderr || '未知错误'))
  }
}

async function handleUpdate(name: string) {
  const result = await skillsStore.update(name, currentTab.value === 'global')
  if (result.success) {
    message.success(`${name} 更新成功`)
    loadSkills()
  } else {
    message.error(`${name} 更新失败`)
  }
}

async function handleRemove(name: string) {
  if (!window.confirm(`确定删除 ${name}? 此操作不可撤销`)) return
  const result = await skillsStore.remove(name)
  if (result.success) {
    message.success(`${name} 已删除`)
    loadSkills()
  } else {
    message.error(`${name} 删除失败`)
  }
}

const columns: DataTableColumns = [
  { title: '名称', key: 'name' },
  { title: '版本', key: 'version', width: 100 },
  { title: '来源', key: 'source', ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row: any) {
      return h(NSpace, { size: 'small' }, () => [
        h(NButton, { size: 'small', onClick: () => handleUpdate(row.name) }, () => '更新'),
        h(NButton, { size: 'small', type: 'error', onClick: () => handleRemove(row.name) }, () => '删除')
      ])
    }
  }
]
</script>

<template>
  <div class="list-page">
    <div class="list-header">
      <NTabs v-model:value="currentTab" @update:value="loadSkills">
        <NTabPane name="project" tab="项目技能" />
        <NTabPane name="global" tab="全局技能" />
      </NTabs>
      <NButton type="primary" size="small" :loading="skillsStore.loading" @click="handleUpdateAll">
        全部更新
      </NButton>
    </div>
    <NSpin :show="skillsStore.loading">
      <NDataTable
        v-if="skillsStore.installedSkills.length > 0"
        :columns="columns"
        :data="skillsStore.installedSkills"
        :bordered="false"
      />
      <NEmpty v-else description="暂无已安装的技能" style="margin-top: 48px" />
    </NSpin>
  </div>
</template>

<style scoped>
.list-page { max-width: 900px; }
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/SkillsList.vue
git commit -m "feat: add installed skills list page with update/delete"
```

---

### 5.4 Install Dialog (Agent Multi-Select)

**Priority:** P4 | **Depends on:** 2.1, 4.2

**Files:**
- Create: `src/renderer/src/components/skills/SkillInstallDialog.vue`

Multi-select agent picker. Common agents shown in a collapsed group at top, all agents below with search filter. Global install toggle. Inline command output on completion.

- [ ] **Step 1: Create `src/renderer/src/components/skills/SkillInstallDialog.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NModal, NCard, NCheckboxGroup, NCheckbox, NSpace, NButton, NInput,
  NCollapse, NCollapseItem, NText, useMessage
} from 'naive-ui'
import { AGENTS, getCommonAgents } from '../../constants/agents'
import { useSkillsStore } from '../../stores/skills'

const props = defineProps<{ show: boolean; packageRef: string }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'complete'): void
}>()
const skillsStore = useSkillsStore()
const message = useMessage()

const isGlobal = ref(false)
const selectedAgents = ref<string[]>([])
const filterText = ref('')
const installing = ref(false)
const commandOutput = ref('')
const commandDone = ref(false)

const commonAgents = getCommonAgents()

const allAgents = computed(() => {
  const text = filterText.value.toLowerCase()
  if (!text) return AGENTS
  return AGENTS.filter(
    (a) => a.name.toLowerCase().includes(text) || a.agentFlag.toLowerCase().includes(text)
  )
})

const allCommonSelected = computed(() =>
  commonAgents.length > 0 && commonAgents.every((a) => selectedAgents.value.includes(a.agentFlag))
)
const allFilteredSelected = computed(() =>
  allAgents.value.length > 0 && allAgents.value.every((a) => selectedAgents.value.includes(a.agentFlag))
)

function toggleSelectCommon() {
  const flags = commonAgents.map((a) => a.agentFlag)
  if (allCommonSelected.value) {
    selectedAgents.value = selectedAgents.value.filter((s) => !flags.includes(s))
  } else {
    selectedAgents.value = [...new Set([...selectedAgents.value, ...flags])]
  }
}

function toggleSelectAll() {
  const flags = allAgents.value.map((a) => a.agentFlag)
  if (allFilteredSelected.value) {
    selectedAgents.value = selectedAgents.value.filter((s) => !flags.includes(s))
  } else {
    selectedAgents.value = [...new Set([...selectedAgents.value, ...flags])]
  }
}

function toggleGlobal(val: boolean) {
  isGlobal.value = val
  if (val) selectedAgents.value = []
}

async function handleInstall() {
  if (!isGlobal.value && selectedAgents.value.length === 0) {
    message.warning('请选择至少一个安装目标')
    return
  }
  installing.value = true
  commandDone.value = false
  commandOutput.value = ''
  try {
    const result = await skillsStore.install(props.packageRef, selectedAgents.value, isGlobal.value)
    commandOutput.value = result.stdout || result.stderr || ''
    commandDone.value = true
    if (result.success) {
      message.success('安装成功')
    } else {
      message.error('安装失败')
    }
  } catch (error: any) {
    commandOutput.value = error.message
    commandDone.value = true
    message.error('安装失败: ' + error.message)
  } finally {
    installing.value = false
  }
}

function handleClose() {
  if (!installing.value) {
    emit('update:show', false)
    if (commandDone.value) emit('complete')
  }
}
</script>

<template>
  <NModal :show="show" @update:show="handleClose">
    <NCard title="安装技能" style="width: 560px">
      <NText>安装: <strong>{{ packageRef }}</strong></NText>

      <div style="margin-top: 16px">
        <NCheckbox :checked="isGlobal" @update:checked="toggleGlobal">
          全局安装（不指定 agent）
        </NCheckbox>
      </div>

      <div v-if="!isGlobal" style="margin-top: 12px">
        <NInput
          v-model:value="filterText"
          placeholder="筛选 agent..."
          clearable
          size="small"
          style="margin-bottom: 8px"
        />
        <NCheckboxGroup v-model:value="selectedAgents">
          <NCollapse :default-expanded-names="['common', 'all']">
            <NCollapseItem title="常用" name="common">
              <NCheckbox
                :checked="allCommonSelected"
                :indeterminate="selectedAgents.some(s => commonAgents.some(a => a.agentFlag === s)) && !allCommonSelected"
                @update:checked="toggleSelectCommon"
                style="margin-bottom: 8px"
              >
                全选常用
              </NCheckbox>
              <NSpace vertical>
                <NCheckbox v-for="agent in commonAgents" :key="agent.agentFlag" :value="agent.agentFlag" :label="agent.name" />
              </NSpace>
            </NCollapseItem>
            <NCollapseItem title="全部" name="all">
              <NCheckbox
                :checked="allFilteredSelected"
                :indeterminate="selectedAgents.some(s => allAgents.some(a => a.agentFlag === s)) && !allFilteredSelected"
                @update:checked="toggleSelectAll"
                style="margin-bottom: 8px"
              >
                全选当前筛选
              </NCheckbox>
              <NSpace vertical style="max-height: 200px; overflow-y: auto">
                <NCheckbox v-for="agent in allAgents" :key="agent.agentFlag" :value="agent.agentFlag" :label="agent.name" />
              </NSpace>
            </NCollapseItem>
          </NCollapse>
        </NCheckboxGroup>
        <NText depth="3" style="font-size: 12px; margin-top: 8px; display: block">
          已选: {{ selectedAgents.length }} 个 agent
        </NText>
      </div>

      <div v-if="commandOutput" style="margin-top: 12px">
        <div class="mini-terminal">{{ commandOutput }}</div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="handleClose">取消</NButton>
          <NButton type="primary" :loading="installing" @click="handleInstall">确认安装</NButton>
        </NSpace>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.mini-terminal {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
}
</style>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/skills/SkillInstallDialog.vue
git commit -m "feat: add install dialog with multi-agent picker and search filter"
```

---

### 5.5 Skill Detail Page

**Priority:** P4 | **Depends on:** 5.4

**Files:**
- Create: `src/renderer/src/views/SkillDetail.vue`

Detail page for managing a specific skill. Shows install/update/delete actions with inline command output. Reached from search results (clicking a skill ref navigates here) or from installed list.

- [ ] **Step 1: Create `src/renderer/src/views/SkillDetail.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NPageHeader, NButton, NSpace, NDescriptions, NDescriptionsItem, NText, useMessage } from 'naive-ui'
import { useSkillsStore } from '../../stores/skills'
import SkillInstallDialog from '../../components/skills/SkillInstallDialog.vue'
import CommandOutput from '../../components/common/CommandOutput.vue'

const route = useRoute()
const router = useRouter()
const skillsStore = useSkillsStore()
const message = useMessage()

const packageRef = decodeURIComponent(route.params.packageRef as string)
const showInstallDialog = ref(false)
const operationOutput = ref('')
const operationLoading = ref(false)

async function handleUpdate() {
  operationLoading.value = true
  operationOutput.value = ''
  try {
    const result = await skillsStore.update(packageRef)
    operationOutput.value = result.stdout || result.stderr || ''
    if (result.success) message.success('更新成功')
    else message.error('更新失败')
  } finally {
    operationLoading.value = false
  }
}

async function handleRemove() {
  if (!window.confirm(`确定删除 ${packageRef}? 此操作不可撤销`)) return
  operationLoading.value = true
  operationOutput.value = ''
  try {
    const result = await skillsStore.remove(packageRef)
    operationOutput.value = result.stdout || result.stderr || ''
    if (result.success) {
      message.success('删除成功')
      setTimeout(() => router.back(), 500)
    } else {
      message.error('删除失败')
    }
  } finally {
    operationLoading.value = false
  }
}
</script>

<template>
  <div class="detail-page">
    <NPageHeader @back="router.back()" :title="packageRef" subtitle="技能管理" />
    <NDescriptions bordered :column="1" label-placement="left" style="margin-top: 16px">
      <NDescriptionsItem label="包名">
        <NText code>{{ packageRef }}</NText>
      </NDescriptionsItem>
    </NDescriptions>
    <NSpace style="margin-top: 16px">
      <NButton type="primary" @click="showInstallDialog = true">安装到...</NButton>
      <NButton :loading="operationLoading" @click="handleUpdate">更新</NButton>
      <NButton type="error" :loading="operationLoading" @click="handleRemove">删除</NButton>
    </NSpace>
    <div v-if="operationOutput" style="margin-top: 16px">
      <CommandOutput :content="operationOutput" />
    </div>
    <SkillInstallDialog
      v-model:show="showInstallDialog"
      :package-ref="packageRef"
      @complete="operationOutput = ''"
    />
  </div>
</template>

<style scoped>
.detail-page { max-width: 900px; }
</style>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/SkillDetail.vue
git commit -m "feat: add skill detail page with install/update/delete"
```

---

## P5: Secondary Windows

### 6.1 Environment Detection Window

**Priority:** P5 | **Depends on:** 2.5, 4.2

**Files:**
- Create: `src/renderer/src/views/EnvDetection.vue`

Modal window shown when environment check fails. Displays Node/npx/skills status with download button for Node.js.

- [ ] **Step 1: Create `src/renderer/src/views/EnvDetection.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NButton, NSpace, NText, NSpin, NProgress } from 'naive-ui'
import { useEnvStore } from '../stores/env'

const envStore = useEnvStore()
const downloading = ref(false)
const downloadProgress = ref(0)

onMounted(() => envStore.check())

async function handleInstallNode() {
  downloading.value = true
  const cleanup = window.api.env.onDownloadProgress((percent) => {
    downloadProgress.value = percent
  })
  try {
    await window.api.env.installNode()
    await envStore.check()
  } finally {
    downloading.value = false
    cleanup()
  }
}
</script>

<template>
  <div class="env-page">
    <NCard title="环境检测">
      <NSpin :show="envStore.checking">
        <NSpace vertical size="large">
          <NText :type="envStore.nodeInstalled ? 'success' : 'error'">
            {{ envStore.nodeInstalled ? '✓' : '✗' }} Node.js {{ envStore.nodeVersion || '' }}
          </NText>
          <NText :type="envStore.npxInstalled ? 'success' : 'error'">
            {{ envStore.npxInstalled ? '✓' : '✗' }} npx
          </NText>
          <NText :type="envStore.skillsInstalled ? 'success' : 'error'">
            {{ envStore.skillsInstalled ? '✓' : '✗' }} npx skills
          </NText>
        </NSpace>
      </NSpin>

      <div v-if="!envStore.nodeInstalled" style="margin-top: 16px">
        <NProgress v-if="downloading" :percentage="downloadProgress" indicator-placement="inside" />
        <NButton v-else type="primary" :loading="downloading" @click="handleInstallNode">
          下载并安装 Node.js
        </NButton>
      </div>

      <NSpace justify="end" style="margin-top: 16px">
        <NButton @click="window.close()">跳过</NButton>
        <NButton :loading="envStore.checking" @click="envStore.check()">重新检测</NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.env-page {
  padding: 24px;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/EnvDetection.vue
git commit -m "feat: add environment detection window with Node.js download"
```

---

### 6.2 Settings Window

**Priority:** P5 | **Depends on:** 4.2, 2.1

**Files:**
- Create: `src/renderer/src/views/SettingsView.vue`

Settings window for default agent selection and env check toggle.

- [ ] **Step 1: Create `src/renderer/src/views/SettingsView.vue`**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { NCard, NForm, NFormItem, NSelect, NSwitch, NButton, NSpace, useMessage } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'
import { AGENTS } from '../constants/agents'

const settingsStore = useSettingsStore()
const message = useMessage()

const agentOptions = AGENTS.map((a) => ({ label: a.name, value: a.agentFlag }))

onMounted(() => settingsStore.load())

async function handleSave() {
  await settingsStore.save({
    defaultAgent: settingsStore.defaultAgent,
    autoCheckEnv: settingsStore.autoCheckEnv
  })
  message.success('设置已保存')
}
</script>

<template>
  <div class="settings-page">
    <NCard title="设置">
      <NForm label-placement="left" label-width="140">
        <NFormItem label="默认安装目标">
          <NSelect v-model:value="settingsStore.defaultAgent" :options="agentOptions" filterable />
        </NFormItem>
        <NFormItem label="启动时检查环境">
          <NSwitch v-model:value="settingsStore.autoCheckEnv" />
        </NFormItem>
      </NForm>
      <NSpace justify="end" style="margin-top: 16px">
        <NButton type="primary" @click="handleSave">保存</NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.settings-page { padding: 24px; height: 100vh; }
</style>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/SettingsView.vue
git commit -m "feat: add settings window with default agent and env check toggle"
```

---

## P6: Polish & Integration

### 7.1 Global Styles & HTML Title

**Priority:** P6 | **Depends on:** 6.1, 6.2

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/src/assets/main.css`

- [ ] **Step 1: Update HTML title in `src/renderer/index.html`**

Change `<title>Electron</title>` to `<title>NPX Skills UI</title>`

- [ ] **Step 2: Update `src/renderer/src/assets/main.css`**

```css
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
#app { height: 100vh; width: 100vw; overflow: hidden; }
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/index.html src/renderer/src/assets/main.css
git commit -m "chore: update app title and global styles"
```

---

### 7.2 Smoke Test & Fix

**Priority:** P6 | **Depends on:** 7.1

**Files:**
- Various fixes as needed

- [ ] **Step 1: Full typecheck**

```bash
npm run typecheck
```

Expected: No errors. Fix any issues.

- [ ] **Step 2: Dev build**

```bash
npm run dev
```

Expected: App launches.

- [ ] **Step 3: Manual checklist**

- [ ] Main window renders with sidebar and env badges
- [ ] Search triggers `npx skills find` and shows terminal output
- [ ] Skill refs are clickable → install dialog opens
- [ ] Install dialog shows agent multi-select with filter
- [ ] List page loads `npx skills list --json`
- [ ] Update/delete buttons work
- [ ] Settings window opens from sidebar button

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve smoke test issues"
```
