# NPX Skills UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Electron desktop app that provides a graphical interface for the `npx skills` CLI tool.

**Architecture:** Layered IPC architecture with 3 windows (Main, Environment Detection, Settings). Main process contains Services (SkillsService, EnvService, StoreService, WindowManager) accessed via IPC handlers. Renderer uses Vue 3 + Naive UI + Pinia.

**Tech Stack:** Electron 39, electron-vite, Vue 3, Naive UI, Pinia, Vue Router 4, VueUse, execa, electron-store, strip-ansi

---

## Phase 1: Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install naive-ui pinia vue-router@4 @vueuse/core execa electron-store strip-ansi
```

- [ ] **Step 2: Install dev dependencies for types**

```bash
npm install -D @types/strip-ansi
```

- [ ] **Step 3: Verify installation**

Run: `npm run typecheck`
Expected: No new errors (existing template code should still pass)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add project dependencies (naive-ui, pinia, vue-router, execa, electron-store, etc.)"
```

---

### Task 2: Create Directory Structure

**Files:**
- Create: `src/main/services/` directory
- Create: `src/main/ipc/` directory
- Create: `src/renderer/src/router/index.ts`
- Create: `src/renderer/src/stores/skills.ts`
- Create: `src/renderer/src/stores/env.ts`
- Create: `src/renderer/src/stores/settings.ts`
- Create: `src/renderer/src/views/MainView.vue`
- Create: `src/renderer/src/views/SkillsSearch.vue`
- Create: `src/renderer/src/views/SkillsList.vue`
- Create: `src/renderer/src/views/SkillDetail.vue`
- Create: `src/renderer/src/components/layout/AppSidebar.vue`
- Create: `src/renderer/src/components/layout/AppHeader.vue`
- Create: `src/renderer/src/components/skills/SkillCard.vue`
- Create: `src/renderer/src/components/skills/SkillSearchBar.vue`
- Create: `src/renderer/src/components/skills/SkillInstallDialog.vue`
- Create: `src/renderer/src/components/common/CommandOutput.vue`
- Create: `src/renderer/src/components/common/EnvStatusBadge.vue`
- Create: `src/renderer/src/composables/useIpc.ts`
- Create: `src/renderer/src/constants/agents.ts`
- Create: `src/renderer/src/styles/index.css`

- [ ] **Step 1: Create all directories**

```bash
mkdir -p src/main/services
mkdir -p src/main/ipc
mkdir -p src/renderer/src/router
mkdir -p src/renderer/src/stores
mkdir -p src/renderer/src/views
mkdir -p src/renderer/src/components/layout
mkdir -p src/renderer/src/components/skills
mkdir -p src/renderer/src/components/common
mkdir -p src/renderer/src/composables
mkdir -p src/renderer/src/constants
mkdir -p src/renderer/src/styles
```

- [ ] **Step 2: Create placeholder files so directories are tracked by git**

Create empty `.gitkeep` or minimal TypeScript files in each new directory.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: scaffold project directory structure"
```

---

## Phase 2: Agent Constants & Type Definitions

### Task 3: Agent Constants

**Files:**
- Create: `src/renderer/src/constants/agents.ts`

- [ ] **Step 1: Create agents.ts with full agent list from SupportedAgents.md**

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

export function getAgentByFlag(flag: string): Agent | undefined {
  return AGENTS.find((a) => a.agentFlag === flag)
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/constants/agents.ts
git commit -m "feat: add supported agents constants from SupportedAgents.md"
```

---

### Task 4: Shared Type Definitions

**Files:**
- Create: `src/main/types.ts`

- [ ] **Step 1: Create shared types file**

```ts
export interface EnvStatus {
  nodeInstalled: boolean
  nodeVersion: string | null
  npxInstalled: boolean
  skillsInstalled: boolean
}

export interface SearchResult {
  packageRef: string
  rawLine: string
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

export interface InstallResult {
  success: boolean
  packageRef: string
  agents: string[]
  message: string
}

export interface UpdateResult {
  success: boolean
  message: string
}

export interface RemoveResult {
  success: boolean
  name: string
  message: string
}

export interface AppSettings {
  defaultAgent: string
  autoCheckEnv: boolean
  nodeCustomPath: string | null
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/main/types.ts
git commit -m "feat: add shared type definitions"
```

---

## Phase 3: Main Process Services

### Task 5: StoreService

**Files:**
- Create: `src/main/services/StoreService.ts`

- [ ] **Step 1: Implement StoreService**

```ts
import Store from 'electron-store'
import type { AppSettings, EnvStatus } from '../types'

interface StoreSchema {
  settings: AppSettings
  envStatus: EnvStatus | null
}

const store = new Store<StoreSchema>({
  defaults: {
    settings: {
      defaultAgent: 'claude-code',
      autoCheckEnv: true,
      nodeCustomPath: null
    },
    envStatus: null
  }
})

export function getSettings(): AppSettings {
  return store.get('settings')
}

export function setSettings(partial: Partial<AppSettings>): void {
  const current = store.get('settings')
  store.set('settings', { ...current, ...partial })
}

export function getEnvStatus(): EnvStatus | null {
  return store.get('envStatus')
}

export function setEnvStatus(status: EnvStatus): void {
  store.set('envStatus', status)
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/main/services/StoreService.ts
git commit -m "feat: add StoreService for electron-store persistence"
```

---

### Task 6: SkillsService

**Files:**
- Create: `src/main/services/SkillsService.ts`

- [ ] **Step 1: Implement SkillsService**

```ts
import { execa } from 'execa'
import stripAnsi from 'strip-ansi'
import type { CommandResult, Skill } from '../types'

const COMMAND_TIMEOUT = 60000

export class SkillsError extends Error {
  constructor(
    public code: 'COMMAND_NOT_FOUND' | 'NETWORK_ERROR' | 'TIMEOUT' | 'EXECUTION_FAILED' | 'UNKNOWN',
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
      reject: false
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

export async function installSkill(packageRef: string, agents: string[], global?: boolean): Promise<CommandResult> {
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

export async function removeSkill(name: string, agent?: string, global?: boolean): Promise<CommandResult> {
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
git commit -m "feat: add SkillsService for npx skills command execution"
```

---

### Task 7: EnvService

**Files:**
- Create: `src/main/services/EnvService.ts`

- [ ] **Step 1: Implement EnvService**

```ts
import { execa } from 'execa'
import { app } from 'electron'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { EnvStatus } from '../types'

async function checkCommand(command: string, args: string[]): Promise<{ ok: boolean; version: string | null }> {
  try {
    const result = await execa(command, args, { timeout: 10000, reject: false })
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

const NODE_VERSIONS: Record<string, string> = {
  win32: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip',
  darwin: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-darwin-arm64.tar.gz',
  linux: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz'
}

export function getNodeDownloadUrl(): string {
  return NODE_VERSIONS[process.platform] || NODE_VERSIONS.linux
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
  const filePath = join(installDir, fileName)

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed: ${response.statusText}`)
  const contentLength = Number(response.headers.get('content-length') || 0)
  let downloaded = 0

  const stream = createWriteStream(filePath)
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

  return filePath
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/main/services/EnvService.ts
git commit -m "feat: add EnvService for environment detection and Node.js download"
```

---

### Task 8: WindowManager

**Files:**
- Create: `src/main/services/WindowManager.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Implement WindowManager**

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

function loadWindow(window: BrowserWindow): void {
  window.on('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    ...createWindowOptions({ width: 1200, height: 800, title: 'NPX Skills UI' })
  })
  loadWindow(mainWindow)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  return mainWindow
}

export function createEnvWindow(): BrowserWindow {
  if (envWindow) {
    envWindow.focus()
    return envWindow
  }
  envWindow = new BrowserWindow({
    ...createWindowOptions({ width: 500, height: 400, title: 'Environment Detection' }),
    parent: mainWindow || undefined,
    modal: true
  })
  loadWindow(envWindow)
  envWindow.on('closed', () => {
    envWindow = null
  })
  return envWindow
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow) {
    settingsWindow.focus()
    return settingsWindow
  }
  settingsWindow = new BrowserWindow({
    ...createWindowOptions({ width: 600, height: 500, title: 'Settings' }),
    parent: mainWindow || undefined,
    modal: true
  })
  loadWindow(settingsWindow)
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

- [ ] **Step 2: Update src/main/index.ts to use WindowManager**

Replace the entire file with:

```ts
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow, createEnvWindow } from './services/WindowManager'
import { checkAll } from './services/EnvService'
import { registerIpcHandlers } from './ipc'
import { getSettings } from './services/StoreService'
import { setEnvStatus } from './services/StoreService'

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.npx-skills-ui')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()

  const settings = getSettings()
  if (settings.autoCheckEnv) {
    const status = await checkAll()
    setEnvStatus(status)
    if (!status.nodeInstalled || !status.npxInstalled || !status.skillsInstalled) {
      createEnvWindow()
    }
  }

  createMainWindow()

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
})
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/main/services/WindowManager.ts src/main/index.ts
git commit -m "feat: add WindowManager and update main entry with env check flow"
```

---

## Phase 4: IPC Layer

### Task 9: IPC Handlers

**Files:**
- Create: `src/main/ipc/skills.ipc.ts`
- Create: `src/main/ipc/env.ipc.ts`
- Create: `src/main/ipc/store.ipc.ts`
- Create: `src/main/ipc/index.ts`

- [ ] **Step 1: Create skills.ipc.ts**

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

  ipcMain.handle('skills:install', async (_, opts: { packageRef: string; agents: string[]; global?: boolean }) => {
    return installSkill(opts.packageRef, opts.agents, opts.global)
  })

  ipcMain.handle('skills:update', async (_, opts: { name: string; global?: boolean }) => {
    return updateSkill(opts.name, opts.global)
  })

  ipcMain.handle('skills:update-all', async (_, opts?: { global?: boolean }) => {
    return updateAllSkills(opts?.global)
  })

  ipcMain.handle('skills:remove', async (_, opts: { name: string; agent?: string; global?: boolean }) => {
    return removeSkill(opts.name, opts.agent, opts.global)
  })
}
```

- [ ] **Step 2: Create env.ipc.ts**

```ts
import { ipcMain, BrowserWindow } from 'electron'
import { checkAll, downloadNode } from '../services/EnvService'
import { setEnvStatus } from '../services/StoreService'
import { closeEnvWindow } from '../services/WindowManager'

export function registerEnvIpc(): void {
  ipcMain.handle('env:check', async () => {
    const status = await checkAll()
    setEnvStatus(status)
    return status
  })

  ipcMain.handle('env:install-node', async (event) => {
    try {
      await downloadNode((percent) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win?.webContents.send('env:download-progress', percent)
      })
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
}
```

- [ ] **Step 3: Create store.ipc.ts**

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

- [ ] **Step 4: Create ipc/index.ts**

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
git commit -m "feat: add IPC handlers for skills, env, and store"
```

---

### Task 10: Preload API Bridge

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Update preload/index.ts**

```ts
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  skills: {
    search: (keyword: string) => ipcRenderer.invoke('skills:search', keyword),
    list: (opts?: { global?: boolean; agent?: string }) => ipcRenderer.invoke('skills:list', opts),
    install: (opts: { packageRef: string; agents: string[]; global?: boolean }) =>
      ipcRenderer.invoke('skills:install', opts),
    update: (opts: { name: string; global?: boolean }) => ipcRenderer.invoke('skills:update', opts),
    updateAll: (opts?: { global?: boolean }) => ipcRenderer.invoke('skills:update-all', opts),
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
    setSettings: (partial: Record<string, unknown>) => ipcRenderer.invoke('store:set-settings', partial)
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

- [ ] **Step 2: Update preload/index.d.ts**

```ts
import { ElectronAPI } from '@electron-toolkit/preload'

export interface SkillsApi {
  search: (keyword: string) => Promise<string>
  list: (opts?: { global?: boolean; agent?: string }) => Promise<any[]>
  install: (opts: { packageRef: string; agents: string[]; global?: boolean }) => Promise<any>
  update: (opts: { name: string; global?: boolean }) => Promise<any>
  updateAll: (opts?: { global?: boolean }) => Promise<any>
  remove: (opts: { name: string; agent?: string; global?: boolean }) => Promise<any>
}

export interface EnvApi {
  check: () => Promise<any>
  installNode: () => Promise<any>
  onDownloadProgress: (callback: (percent: number) => void) => () => void
}

export interface StoreApi {
  getSettings: () => Promise<any>
  setSettings: (partial: Record<string, unknown>) => Promise<void>
}

export interface WindowApi {
  openSettings: () => Promise<void>
}

export interface AppApi {
  skills: SkillsApi
  env: EnvApi
  store: StoreApi
  window: WindowApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppApi
  }
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/preload/
git commit -m "feat: add preload API bridge with typed IPC channels"
```

---

## Phase 5: Renderer Foundation

### Task 11: Vue Router + Pinia Setup

**Files:**
- Modify: `src/renderer/src/main.ts`
- Create: `src/renderer/src/router/index.ts`
- Create: `src/renderer/src/stores/skills.ts`
- Create: `src/renderer/src/stores/env.ts`
- Create: `src/renderer/src/stores/settings.ts`

- [ ] **Step 1: Create router/index.ts**

```ts
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/search' },
  { path: '/search', name: 'search', component: () => import('../views/SkillsSearch.vue') },
  { path: '/list', name: 'list', component: () => import('../views/SkillsList.vue') },
  { path: '/detail/:packageRef', name: 'detail', component: () => import('../views/SkillDetail.vue'), props: true }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
```

- [ ] **Step 2: Create stores/skills.ts**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSkillsStore = defineStore('skills', () => {
  const searchOutput = ref('')
  const installedSkills = ref<any[]>([])
  const loading = ref(false)
  const currentOperation = ref<{ type: string; name: string } | null>(null)

  async function search(keyword: string) {
    loading.value = true
    try {
      searchOutput.value = await window.api.skills.search(keyword)
    } finally {
      loading.value = false
    }
  }

  async function fetchInstalled(global?: boolean) {
    loading.value = true
    try {
      installedSkills.value = await window.api.skills.list({ global })
    } finally {
      loading.value = false
    }
  }

  async function install(packageRef: string, agents: string[], global?: boolean) {
    currentOperation.value = { type: 'install', name: packageRef }
    try {
      return await window.api.skills.install({ packageRef, agents, global })
    } finally {
      currentOperation.value = null
    }
  }

  async function update(name: string, global?: boolean) {
    currentOperation.value = { type: 'update', name }
    try {
      return await window.api.skills.update({ name, global })
    } finally {
      currentOperation.value = null
    }
  }

  async function updateAll(global?: boolean) {
    currentOperation.value = { type: 'update', name: 'all' }
    try {
      return await window.api.skills.updateAll({ global })
    } finally {
      currentOperation.value = null
    }
  }

  async function remove(name: string, agent?: string, global?: boolean) {
    currentOperation.value = { type: 'remove', name }
    try {
      return await window.api.skills.remove({ name, agent, global })
    } finally {
      currentOperation.value = null
    }
  }

  return {
    searchOutput,
    installedSkills,
    loading,
    currentOperation,
    search,
    fetchInstalled,
    install,
    update,
    updateAll,
    remove
  }
})
```

- [ ] **Step 3: Create stores/env.ts**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEnvStore = defineStore('env', () => {
  const nodeInstalled = ref(false)
  const nodeVersion = ref<string | null>(null)
  const npxInstalled = ref(false)
  const skillsInstalled = ref(false)
  const checking = ref(false)

  async function check() {
    checking.value = true
    try {
      const status = await window.api.env.check()
      nodeInstalled.value = status.nodeInstalled
      nodeVersion.value = status.nodeVersion
      npxInstalled.value = status.npxInstalled
      skillsInstalled.value = status.skillsInstalled
    } finally {
      checking.value = false
    }
  }

  return {
    nodeInstalled,
    nodeVersion,
    npxInstalled,
    skillsInstalled,
    checking,
    check
  }
})
```

- [ ] **Step 4: Create stores/settings.ts**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const defaultAgent = ref('claude-code')
  const autoCheckEnv = ref(true)
  const nodeCustomPath = ref<string | null>(null)

  async function load() {
    const settings = await window.api.store.getSettings()
    if (settings) {
      defaultAgent.value = settings.defaultAgent
      autoCheckEnv.value = settings.autoCheckEnv
      nodeCustomPath.value = settings.nodeCustomPath
    }
  }

  async function save(partial: Record<string, unknown>) {
    await window.api.store.setSettings(partial)
    if (partial.defaultAgent !== undefined) defaultAgent.value = partial.defaultAgent as string
    if (partial.autoCheckEnv !== undefined) autoCheckEnv.value = partial.autoCheckEnv as boolean
    if (partial.nodeCustomPath !== undefined) nodeCustomPath.value = partial.nodeCustomPath as string | null
  }

  return { defaultAgent, autoCheckEnv, nodeCustomPath, load, save }
})
```

- [ ] **Step 5: Update main.ts to include router and pinia**

```ts
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

- [ ] **Step 6: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/main.ts src/renderer/src/router/ src/renderer/src/stores/
git commit -m "feat: add Vue Router, Pinia stores (skills, env, settings)"
```

---

### Task 12: App Layout Shell

**Files:**
- Modify: `src/renderer/src/App.vue`
- Create: `src/renderer/src/views/MainView.vue`
- Create: `src/renderer/src/components/layout/AppSidebar.vue`

- [ ] **Step 1: Create AppSidebar.vue**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NMenu, NIcon, NSpace, NDivider, NText } from 'naive-ui'
import { h, computed } from 'vue'
import { useEnvStore } from '../../stores/env'
import EnvStatusBadge from '../common/EnvStatusBadge.vue'

const router = useRouter()
const envStore = useEnvStore()

const menuOptions = [
  { label: '搜索技能', key: 'search' },
  { label: '已安装列表', key: 'list' }
]

function handleMenuClick(key: string) {
  router.push({ name: key })
}

const currentKey = computed(() => {
  const name = router.currentRoute.value.name
  if (name === 'search' || name === 'detail') return 'search'
  return name as string
})
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-logo">
      <NText strong style="font-size: 16px">NPX Skills</NText>
    </div>
    <NMenu
      :value="currentKey"
      :options="menuOptions"
      @update:value="handleMenuClick"
    />
    <NDivider style="margin: 8px 0" />
    <div class="sidebar-env">
      <NText depth="3" style="font-size: 12px; margin-bottom: 4px">环境状态</NText>
      <EnvStatusBadge label="Node" :ok="envStore.nodeInstalled" />
      <EnvStatusBadge label="npx" :ok="envStore.npxInstalled" />
      <EnvStatusBadge label="skills" :ok="envStore.skillsInstalled" />
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px 8px;
  width: 200px;
  border-right: 1px solid var(--n-border-color);
  background-color: var(--n-color);
}
.sidebar-logo {
  padding: 8px 12px 16px;
}
.sidebar-env {
  margin-top: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
```

- [ ] **Step 2: Create MainView.vue**

```vue
<script setup lang="ts">
import AppSidebar from '../components/layout/AppSidebar.vue'
</script>

<template>
  <div class="main-layout">
    <AppSidebar />
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
}
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}
</style>
```

- [ ] **Step 3: Update App.vue**

```vue
<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import MainView from './views/MainView.vue'
</script>

<template>
  <NConfigProvider>
    <NMessageProvider>
      <MainView />
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
```

- [ ] **Step 4: Create EnvStatusBadge.vue**

```vue
<script setup lang="ts">
import { NText } from 'naive-ui'
defineProps<{ label: string; ok: boolean }>()
</script>

<template>
  <div class="env-badge">
    <span :class="ok ? 'dot-ok' : 'dot-err'">{{ ok ? '✓' : '✗' }}</span>
    <NText :depth="ok ? undefined : 3" :type="ok ? 'success' : 'error'" style="font-size: 12px">
      {{ label }}
    </NText>
  </div>
</template>

<style scoped>
.env-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot-ok { color: #18a058; }
.dot-err { color: #d03050; }
</style>
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/App.vue src/renderer/src/views/MainView.vue src/renderer/src/components/
git commit -m "feat: add app layout shell with sidebar, env badges, and Naive UI config"
```

---

## Phase 6: Core UI Pages

### Task 13: Search Page

**Files:**
- Create: `src/renderer/src/views/SkillsSearch.vue`
- Create: `src/renderer/src/components/skills/SkillSearchBar.vue`
- Create: `src/renderer/src/components/common/CommandOutput.vue`

- [ ] **Step 1: Create CommandOutput.vue**

Terminal-style output panel with clickable `owner/repo@skill-name` patterns.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NCode } from 'naive-ui'

const props = defineProps<{ content: string }>()
const emit = defineEmits<{ (e: 'select-skill', packageRef: string): void }>()

interface Segment {
  id: number
  type: 'text' | 'skill-ref'
  text: string
}

const SKILL_REF_REGEX = /[a-zA-Z0-9_.\-]+\/[a-zA-Z0-9_.\-]+@[a-zA-Z0-9_.\-]+/g

const segments = computed<Segment[]>(() => {
  const result: Segment[] = []
  let lastIndex = 0
  let id = 0
  const content = props.content
  const regex = new RegExp(SKILL_REF_REGEX.source, 'g')
  let match
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      result.push({ id: id++, type: 'text', text: content.slice(lastIndex, match.index) })
    }
    result.push({ id: id++, type: 'skill-ref', text: match[0] })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < content.length) {
    result.push({ id: id++, type: 'text', text: content.slice(lastIndex) })
  }
  return result
})
</script>

<template>
  <div class="command-output">
    <template v-for="seg in segments" :key="seg.id">
      <a
        v-if="seg.type === 'skill-ref'"
        class="skill-ref"
        @click="emit('select-skill', seg.text)"
      >{{ seg.text }}</a>
      <span v-else>{{ seg.text }}</span>
    </template>
    <div v-if="!content" class="empty">暂无输出</div>
  </div>
</template>

<style scoped>
.command-output {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}
.skill-ref {
  color: #569cd6;
  cursor: pointer;
  text-decoration: underline;
}
.skill-ref:hover {
  color: #9cdcfe;
}
.empty {
  color: #666;
}
</style>
```

- [ ] **Step 2: Create SkillSearchBar.vue**

```vue
<script setup lang="ts">
import { NInput } from 'naive-ui'
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

const keyword = ref('')
const emit = defineEmits<{ (e: 'search', keyword: string): void }>()

const debouncedSearch = useDebounceFn(() => {
  if (keyword.value.trim()) {
    emit('search', keyword.value.trim())
  }
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

- [ ] **Step 3: Create SkillsSearch.vue**

```vue
<script setup lang="ts">
import { useSkillsStore } from '../../stores/skills'
import { useRouter } from 'vue-router'
import { NSpin, NEmpty } from 'naive-ui'
import SkillSearchBar from '../../components/skills/SkillSearchBar.vue'
import CommandOutput from '../../components/common/CommandOutput.vue'
import SkillInstallDialog from '../../components/skills/SkillInstallDialog.vue'
import { ref } from 'vue'

const skillsStore = useSkillsStore()
const router = useRouter()
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
.search-page {
  max-width: 900px;
}
</style>
```

- [ ] **Step 4: Create placeholder SkillInstallDialog.vue (will be completed in Task 15)**

```vue
<script setup lang="ts">
import { NModal, NCard } from 'naive-ui'

defineProps<{ show: boolean; packageRef: string }>()
const emit = defineEmits<{ (e: 'update:show', value: boolean): void; (e: 'complete'): void }>()
</script>

<template>
  <NModal :show="show" @update:show="emit('update:show', $event)">
    <NCard title="安装技能" style="width: 500px">
      <p>安装: {{ packageRef }}</p>
      <p>Agent 选择器待实现</p>
    </NCard>
  </NModal>
</template>
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/views/SkillsSearch.vue src/renderer/src/components/skills/SkillSearchBar.vue src/renderer/src/components/common/CommandOutput.vue src/renderer/src/components/skills/SkillInstallDialog.vue
git commit -m "feat: add search page with terminal output panel and clickable skill refs"
```

---

### Task 14: Installed List Page

**Files:**
- Create: `src/renderer/src/views/SkillsList.vue`

- [ ] **Step 1: Create SkillsList.vue**

```vue
<script setup lang="ts">
import { useSkillsStore } from '../../stores/skills'
import { NDataTable, NButton, NSpace, NTabPane, NTabs, NEmpty, NSpin, useMessage } from 'naive-ui'
import { onMounted, ref, h } from 'vue'
import type { DataTableColumns } from 'naive-ui'

const skillsStore = useSkillsStore()
const message = useMessage()
const currentTab = ref('project')

async function loadSkills() {
  const isGlobal = currentTab.value === 'global'
  await skillsStore.fetchInstalled(isGlobal)
}

onMounted(() => {
  loadSkills()
})

async function handleUpdateAll() {
  const isGlobal = currentTab.value === 'global'
  const result = await skillsStore.updateAll(isGlobal)
  if (result.success) {
    message.success('更新成功')
    loadSkills()
  } else {
    message.error('更新失败: ' + (result.stderr || '未知错误'))
  }
}

async function handleUpdate(name: string) {
  const isGlobal = currentTab.value === 'global'
  const result = await skillsStore.update(name, isGlobal)
  if (result.success) {
    message.success(`${name} 更新成功`)
    loadSkills()
  } else {
    message.error(`${name} 更新失败`)
  }
}

async function handleRemove(name: string) {
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
      <NButton type="primary" size="small" @click="handleUpdateAll" :loading="skillsStore.loading">
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
git commit -m "feat: add installed skills list page with update/delete actions"
```

---

### Task 15: Install Dialog (Agent Multi-Select)

**Files:**
- Modify: `src/renderer/src/components/skills/SkillInstallDialog.vue`

- [ ] **Step 1: Implement full SkillInstallDialog.vue**

```vue
<script setup lang="ts">
import {
  NModal,
  NCard,
  NCheckboxGroup,
  NCheckbox,
  NSpace,
  NButton,
  NInput,
  NCollapse,
  NCollapseItem,
  NText,
  useMessage
} from 'naive-ui'
import { ref, computed } from 'vue'
import { AGENTS, COMMON_AGENT_FLAGS, getCommonAgents } from '../../constants/agents'
import { useSkillsStore } from '../../stores/skills'

const props = defineProps<{ show: boolean; packageRef: string }>()
const emit = defineEmits<{ (e: 'update:show', value: boolean): void; (e: 'complete'): void }>()
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
    (a) =>
      a.name.toLowerCase().includes(text) ||
      a.agentFlag.toLowerCase().includes(text)
  )
})

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
    const result = await skillsStore.install(
      props.packageRef,
      selectedAgents.value,
      isGlobal.value
    )
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
              <NSpace vertical>
                <NCheckbox
                  v-for="agent in commonAgents"
                  :key="agent.agentFlag"
                  :value="agent.agentFlag"
                  :label="agent.name"
                />
              </NSpace>
            </NCollapseItem>
            <NCollapseItem title="全部" name="all">
              <NSpace vertical>
                <NCheckbox
                  v-for="agent in allAgents"
                  :key="agent.agentFlag"
                  :value="agent.agentFlag"
                  :label="agent.name"
                />
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
          <NButton
            type="primary"
            :loading="installing"
            @click="handleInstall"
          >
            确认安装
          </NButton>
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
git commit -m "feat: add multi-agent install dialog with search filter"
```

---

### Task 16: Skill Detail Page

**Files:**
- Create: `src/renderer/src/views/SkillDetail.vue`

- [ ] **Step 1: Create SkillDetail.vue**

```vue
<script setup lang="ts">
import { useSkillsStore } from '../../stores/skills'
import { useRoute, useRouter } from 'vue-router'
import { NPageHeader, NButton, NSpace, NDescriptions, NDescriptionsItem, useMessage } from 'naive-ui'
import { ref } from 'vue'
import SkillInstallDialog from '../components/skills/SkillInstallDialog.vue'
import CommandOutput from '../components/common/CommandOutput.vue'

const route = useRoute()
const router = useRouter()
const skillsStore = useSkillsStore()
const message = useMessage()

const packageRef = route.params.packageRef as string
const showInstallDialog = ref(false)
const operationOutput = ref('')
const operationLoading = ref(false)

async function handleUpdate() {
  operationLoading.value = true
  operationOutput.value = ''
  try {
    const result = await skillsStore.update(packageRef)
    operationOutput.value = result.stdout || result.stderr || ''
    if (result.success) {
      message.success('更新成功')
    } else {
      message.error('更新失败')
    }
  } finally {
    operationLoading.value = false
  }
}

async function handleRemove() {
  operationLoading.value = true
  operationOutput.value = ''
  try {
    const result = await skillsStore.remove(packageRef)
    operationOutput.value = result.stdout || result.stderr || ''
    if (result.success) {
      message.success('删除成功')
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
    <NPageHeader @back="router.back()" :title="packageRef" subtitle="技能详情" />

    <NSpace style="margin-top: 16px">
      <NButton type="primary" @click="showInstallDialog = true">安装到...</NButton>
      <NButton @click="handleUpdate" :loading="operationLoading">更新</NButton>
      <NButton type="error" @click="handleRemove" :loading="operationLoading">删除</NButton>
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
git commit -m "feat: add skill detail page with install/update/remove actions"
```

---

## Phase 7: Environment Detection Window

### Task 17: Environment Detection Window

**Files:**
- Create: `src/renderer/src/views/EnvDetection.vue`
- Add IPC handler for `window:open-settings`
- Modify: `src/main/ipc/env.ipc.ts` (add window:open-settings handler)

Note: The environment detection window uses a URL query parameter `?window=env` to distinguish itself from the main window. All windows load the same `index.html` but render different content based on the query param.

- [ ] **Step 1: Add window query param detection in App.vue**

Update App.vue to detect which window to render based on URL params:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import MainView from './views/MainView.vue'
import EnvDetection from './views/EnvDetection.vue'
import SettingsView from './views/SettingsView.vue'

const windowType = computed(() => {
  const params = new URLSearchParams(window.location.search)
  return params.get('window') || 'main'
})
</script>

<template>
  <NConfigProvider>
    <NMessageProvider>
      <MainView v-if="windowType === 'main'" />
      <EnvDetection v-else-if="windowType === 'env'" />
      <SettingsView v-else-if="windowType === 'settings'" />
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
```

- [ ] **Step 2: Update WindowManager to pass window type as query param**

In WindowManager.ts, change `loadWindow` to append query params:

```ts
function loadWindow(window: BrowserWindow, query?: string): void {
  window.on('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const baseUrl = process.env['ELECTRON_RENDERER_URL']
    window.loadURL(query ? `${baseUrl}${query}` : baseUrl)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'), { query: query ? Object.fromEntries(new URLSearchParams(query)) : undefined })
  }
}
```

Update `createEnvWindow` and `createSettingsWindow` to pass query params:

```ts
export function createEnvWindow(): BrowserWindow {
  if (envWindow) { envWindow.focus(); return envWindow }
  envWindow = new BrowserWindow({
    ...createWindowOptions({ width: 500, height: 400, title: 'Environment Detection' }),
    parent: mainWindow || undefined,
    modal: true
  })
  loadWindow(envWindow, '?window=env')
  envWindow.on('closed', () => { envWindow = null })
  return envWindow
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow) { settingsWindow.focus(); return settingsWindow }
  settingsWindow = new BrowserWindow({
    ...createWindowOptions({ width: 600, height: 500, title: 'Settings' }),
    parent: mainWindow || undefined,
    modal: true
  })
  loadWindow(settingsWindow, '?window=settings')
  settingsWindow.on('closed', () => { settingsWindow = null })
  return settingsWindow
}
```

- [ ] **Step 3: Create EnvDetection.vue**

```vue
<script setup lang="ts">
import { useEnvStore } from '../stores/env'
import { NCard, NButton, NSpace, NResult, NSpin, NProgress, NText } from 'naive-ui'
import { onMounted, ref } from 'vue'

const envStore = useEnvStore()
const downloading = ref(false)
const downloadProgress = ref(0)

onMounted(() => {
  envStore.check()
})

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

async function handleRecheck() {
  await envStore.check()
}
</script>

<template>
  <div class="env-page">
    <NCard title="环境检测">
      <NSpin :show="envStore.checking">
        <NSpace vertical size="large">
          <div class="env-item">
            <NText :type="envStore.nodeInstalled ? 'success' : 'error'">
              {{ envStore.nodeInstalled ? '✓' : '✗' }} Node.js {{ envStore.nodeVersion || '' }}
            </NText>
          </div>
          <div class="env-item">
            <NText :type="envStore.npxInstalled ? 'success' : 'error'">
              {{ envStore.npxInstalled ? '✓' : '✗' }} npx
            </NText>
          </div>
          <div class="env-item">
            <NText :type="envStore.skillsInstalled ? 'success' : 'error'">
              {{ envStore.skillsInstalled ? '✓' : '✗' }} npx skills
            </NText>
          </div>
        </NSpace>
      </NSpin>

      <div v-if="!envStore.nodeInstalled" style="margin-top: 16px">
        <NProgress v-if="downloading" :percentage="downloadProgress" :indicator-placement="'inside'" />
        <NButton v-else type="primary" @click="handleInstallNode" :loading="downloading">
          下载并安装 Node.js
        </NButton>
      </div>

      <NSpace justify="end" style="margin-top: 16px">
        <NButton @click="handleRecheck" :loading="envStore.checking">重新检测</NButton>
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
.env-item { font-size: 15px; }
</style>
```

- [ ] **Step 4: Add window:open-settings IPC handler**

In `src/main/ipc/env.ipc.ts`, add:

```ts
ipcMain.handle('window:open-settings', () => {
  createSettingsWindow()
})
```

Add import for `createSettingsWindow` at the top.

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/App.vue src/renderer/src/views/EnvDetection.vue src/main/services/WindowManager.ts src/main/ipc/env.ipc.ts
git commit -m "feat: add environment detection window with Node.js download"
```

---

## Phase 8: Settings Window

### Task 18: Settings Window

**Files:**
- Create: `src/renderer/src/views/SettingsView.vue`

- [ ] **Step 1: Create SettingsView.vue**

```vue
<script setup lang="ts">
import { useSettingsStore } from '../stores/settings'
import { NCard, NForm, NFormItem, NSelect, NSwitch, NButton, NSpace, useMessage } from 'naive-ui'
import { onMounted } from 'vue'
import { AGENTS, COMMON_AGENT_FLAGS } from '../constants/agents'

const settingsStore = useSettingsStore()
const message = useMessage()

const agentOptions = AGENTS.map((a) => ({
  label: a.name,
  value: a.agentFlag
}))

onMounted(() => {
  settingsStore.load()
})

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
          <NSelect
            v-model:value="settingsStore.defaultAgent"
            :options="agentOptions"
            filterable
          />
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
.settings-page {
  padding: 24px;
  height: 100vh;
}
</style>
```

- [ ] **Step 2: Add settings button to AppSidebar.vue**

Add a button in the sidebar that opens settings window:

```vue
<!-- Add after NMenu in AppSidebar.vue -->
<NButton quaternary size="small" block @click="window.api.window.openSettings()" style="margin-top: 8px">
  设置
</NButton>
```

Import `NButton` from naive-ui.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/views/SettingsView.vue src/renderer/src/components/layout/AppSidebar.vue
git commit -m "feat: add settings window with default agent and env check toggle"
```

---

## Phase 9: Integration & Polish

### Task 19: Global Styles & Polish

**Files:**
- Modify: `src/renderer/src/styles/index.css` (or `src/renderer/src/assets/main.css`)
- Modify: `src/renderer/index.html` (update title)

- [ ] **Step 1: Update index.html title**

Change `<title>Electron</title>` to `<title>NPX Skills UI</title>`

- [ ] **Step 2: Update global CSS**

Replace content of `src/renderer/src/assets/main.css` with minimal reset:

```css
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/index.html src/renderer/src/assets/main.css
git commit -m "chore: update app title and global styles"
```

---

### Task 20: Smoke Test & Fix

**Files:**
- Various fixes as needed

- [ ] **Step 1: Run full typecheck**

```bash
npm run typecheck
```

Expected: No errors. Fix any issues found.

- [ ] **Step 2: Run dev build**

```bash
npm run dev
```

Expected: App launches, main window shows with sidebar and search page.

- [ ] **Step 3: Manual test checklist**

- [ ] Main window renders with sidebar
- [ ] Search input triggers `npx skills find` and shows output in terminal panel
- [ ] Skill refs are clickable in search output
- [ ] Install dialog shows agent multi-select
- [ ] Installed list loads from `npx skills list --json`
- [ ] Environment status badges show in sidebar

- [ ] **Step 4: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: resolve smoke test issues"
```

---

## Task Dependency Graph

```
Task 1 (deps) → Task 2 (dirs)
  ↓
Task 3 (agents) + Task 4 (types) [parallel]
  ↓
Task 5 (StoreService) + Task 6 (SkillsService) + Task 7 (EnvService) [parallel]
  ↓
Task 8 (WindowManager)
  ↓
Task 9 (IPC handlers) + Task 10 (Preload) [parallel]
  ↓
Task 11 (Router + Pinia)
  ↓
Task 12 (App Layout)
  ↓
Task 13 (Search) + Task 14 (List) + Task 15 (Install Dialog) [parallel]
  ↓
Task 16 (Detail)
  ↓
Task 17 (Env Window) + Task 18 (Settings) [parallel]
  ↓
Task 19 (Polish) → Task 20 (Smoke Test)
```
