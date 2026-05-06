# Unified NpxService Layered Architecture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor scattered npx CLI calls into a layered CommandRunner → NpxService architecture with unified error handling, consistent serialization, and a clean separation of concerns.

**Architecture:** Bottom-up: `CommandRunner` (generic execa wrapper) → `NpxService` (npx command business logic) → IPC handlers (serialization). HTTP API moves to `src/main/api/`. `SkillsService.ts` is deleted.

**Tech Stack:** Electron, execa, TypeScript, strip-ansi

---

## Task 1: Add CommandErrorInfo to shared types

**Files:**

- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add CommandErrorInfo interface**

Add after the existing `CommandResult` interface (after line 22):

```typescript
export interface CommandErrorInfo {
  code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'EXECUTION_FAILED' | 'UNKNOWN'
  command: string
  stderr: string
  exitCode: number | null
  message: string
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no consumer yet, pure addition)

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add CommandErrorInfo type for IPC error serialization"
```

---

## Task 2: Create CommandRunner

**Files:**

- Create: `src/main/services/CommandRunner.ts`

- [ ] **Step 1: Write CommandRunner implementation**

Create `src/main/services/CommandRunner.ts`:

```typescript
import { execa, type Options } from 'execa'
import stripAnsiModule from 'strip-ansi'
import os from 'node:os'
import type { CommandResult } from '../../shared/types'

const stripAnsi =
  (stripAnsiModule as unknown as { default?: typeof stripAnsiModule }).default ?? stripAnsiModule

const DEFAULT_TIMEOUT = 60000

function toString(value: string | unknown[] | Uint8Array | undefined): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  if (value instanceof Uint8Array) return new TextDecoder().decode(value)
  return String(value)
}

export interface RunOptions {
  timeout?: number
  cwd?: string
  onOutput?: (text: string) => void
}

export class CommandError extends Error {
  constructor(
    public code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'EXECUTION_FAILED' | 'UNKNOWN',
    public command: string,
    public stderr: string,
    public exitCode: number | null
  ) {
    super(`Command failed: ${code}`)
    this.name = 'CommandError'
  }

  toJSON(): import('../../shared/types').CommandErrorInfo {
    return {
      code: this.code,
      command: this.command,
      stderr: this.stderr,
      exitCode: this.exitCode,
      message: this.message
    }
  }
}

class CommandRunner {
  private activeProcess: ReturnType<typeof execa> | null = null

  async run(command: string, args: string[], opts?: RunOptions): Promise<CommandResult> {
    const timeout = opts?.timeout ?? DEFAULT_TIMEOUT
    const cwd = opts?.cwd ?? os.homedir()

    const execaOpts: Options = {
      timeout,
      reject: false,
      cwd,
      shell: process.platform === 'win32',
      encoding: 'utf8'
    }

    const commandStr = `${command} ${args.join(' ')}`

    try {
      if (opts?.onOutput) {
        return await this.runStreaming(command, args, execaOpts, commandStr, opts.onOutput)
      }

      const result = await execa(command, args, execaOpts)
      return {
        success: result.exitCode === 0,
        stdout: stripAnsi(toString(result.stdout)),
        stderr: stripAnsi(toString(result.stderr)),
        exitCode: result.exitCode ?? null
      }
    } catch (error: unknown) {
      throw this.mapError(error, commandStr)
    }
  }

  private async runStreaming(
    command: string,
    args: string[],
    execaOpts: Options,
    commandStr: string,
    onOutput: (text: string) => void
  ): Promise<CommandResult> {
    const child = execa(command, args, execaOpts)
    this.activeProcess = child

    child.stdout?.on('data', (data: Buffer) => {
      onOutput(stripAnsi(data.toString()))
    })
    child.stderr?.on('data', (data: Buffer) => {
      onOutput(stripAnsi(data.toString()))
    })

    try {
      const result = await child
      return {
        success: result.exitCode === 0,
        stdout: stripAnsi(toString(result.stdout)),
        stderr: stripAnsi(toString(result.stderr)),
        exitCode: result.exitCode ?? null
      }
    } catch (error: unknown) {
      throw this.mapError(error, commandStr)
    } finally {
      this.activeProcess = null
    }
  }

  private mapError(error: unknown, command: string): CommandError {
    const err = error as { code?: string; timedOut?: boolean; message?: string }
    if (err.code === 'ENOENT') {
      return new CommandError('COMMAND_NOT_FOUND', command, '', null)
    }
    if (err.timedOut) {
      return new CommandError('TIMEOUT', command, '', null)
    }
    return new CommandError('UNKNOWN', command, err.message || String(error), null)
  }

  cancel(): void {
    if (this.activeProcess) {
      this.activeProcess.kill()
      this.activeProcess = null
    }
  }
}

export const commandRunner = new CommandRunner()
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no consumer yet)

- [ ] **Step 3: Commit**

```bash
git add src/main/services/CommandRunner.ts
git commit -m "feat: add CommandRunner — generic execa wrapper with unified error handling"
```

---

## Task 3: Create NpxService

**Files:**

- Create: `src/main/services/NpxService.ts`

- [ ] **Step 1: Write NpxService implementation**

Create `src/main/services/NpxService.ts`:

```typescript
import type { CommandResult, Skill } from '../../shared/types'
import { commandRunner, CommandError } from './CommandRunner'

class NpxService {
  async checkNpxVersion(): Promise<{ ok: boolean; version: string | null }> {
    try {
      const result = await commandRunner.run('npx', ['--version'], { timeout: 10000 })
      if (result.success) {
        return { ok: true, version: result.stdout.trim() }
      }
      return { ok: false, version: null }
    } catch {
      return { ok: false, version: null }
    }
  }

  async checkSkillsVersion(): Promise<{ ok: boolean; version: string | null }> {
    try {
      const result = await commandRunner.run('npx', ['skills', '--version'], {
        timeout: 10000
      })
      if (result.success) {
        return { ok: true, version: result.stdout.trim() }
      }
      return { ok: false, version: null }
    } catch {
      return { ok: false, version: null }
    }
  }

  async list(global?: boolean): Promise<Skill[]> {
    const args = this.buildArgs('list', '--json')
    if (global) args.push('-g')
    const result = await commandRunner.run('npx', args)
    if (!result.success) {
      throw new CommandError(
        'EXECUTION_FAILED',
        `npx ${args.join(' ')}`,
        result.stderr,
        result.exitCode
      )
    }
    const cleaned = result.stdout.trim()
    if (!cleaned) return []
    try {
      return JSON.parse(cleaned)
    } catch {
      throw new CommandError(
        'EXECUTION_FAILED',
        `npx ${args.join(' ')}`,
        `Invalid JSON: ${cleaned}`,
        result.exitCode
      )
    }
  }

  async install(packageRef: string, agents: string[], global?: boolean): Promise<CommandResult> {
    const args = this.buildInstallArgs(packageRef, agents, global)
    return commandRunner.run('npx', args)
  }

  async installStreaming(
    onOutput: (text: string) => void,
    packageRef: string,
    agents: string[],
    global?: boolean
  ): Promise<CommandResult> {
    const args = this.buildInstallArgs(packageRef, agents, global)
    return commandRunner.run('npx', args, { onOutput })
  }

  cancelInstall(): void {
    commandRunner.cancel()
  }

  async update(name: string, global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('update', name, '-y')
    if (global) args.push('-g')
    return commandRunner.run('npx', args)
  }

  async updateAll(global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('update', '-y')
    if (global) args.push('-g')
    return commandRunner.run('npx', args)
  }

  async remove(name: string, agent?: string, global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('remove', name, '-y')
    if (global) args.push('-g')
    if (agent) args.push('-a', agent)
    return commandRunner.run('npx', args)
  }

  private buildArgs(subcommand: string, ...parts: string[]): string[] {
    return ['skills', subcommand, ...parts]
  }

  private buildInstallArgs(packageRef: string, agents: string[], global?: boolean): string[] {
    const args = this.buildArgs('add', packageRef)
    if (global) {
      args.push('--agent', '*')
    } else if (agents.length > 0) {
      args.push('--agent', ...agents)
    }
    args.push('-g', '-y')
    return args
  }
}

export const npxService = new NpxService()
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/services/NpxService.ts
git commit -m "feat: add NpxService — all npx CLI commands through CommandRunner"
```

---

## Task 4: Create HTTP API module

**Files:**

- Create: `src/main/api/skills.ts`

- [ ] **Step 1: Create api directory and skills.ts**

Create `src/main/api/skills.ts`:

```typescript
import type { SkillSearchResponse } from '../../shared/types'
import { CommandError } from '../services/CommandRunner'

export async function searchSkillsApi(keyword: string): Promise<SkillSearchResponse> {
  const url = `https://skills.sh/api/search?q=${encodeURIComponent(keyword)}&limit=10`
  const response = await fetch(url)
  if (!response.ok) {
    throw new CommandError('EXECUTION_FAILED', `GET ${url}`, `HTTP ${response.status}`, null)
  }
  return response.json() as Promise<SkillSearchResponse>
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/api/skills.ts
git commit -m "feat: add api/skills.ts — HTTP search API extracted from SkillsService"
```

---

## Task 5: Rewrite skills.ipc.ts to use NpxService

**Files:**

- Modify: `src/main/ipc/skills.ipc.ts`

- [ ] **Step 1: Replace skills.ipc.ts content**

Replace the entire content of `src/main/ipc/skills.ipc.ts` with:

```typescript
import { ipcMain } from 'electron'
import { npxService } from '../services/NpxService'
import { CommandError } from '../services/CommandRunner'
import { searchSkillsApi } from '../api/skills'

function serializeError(e: unknown) {
  if (e instanceof CommandError) {
    return e.toJSON()
  }
  return {
    code: 'UNKNOWN' as const,
    command: '',
    stderr: '',
    exitCode: null,
    message: e instanceof Error ? e.message : String(e)
  }
}

export function registerSkillsIpc(getMainWindow: () => Electron.BrowserWindow | null): void {
  ipcMain.handle('skills:search', async (_, keyword: string) => {
    try {
      return { ok: true, data: await searchSkillsApi(keyword) }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle('skills:list', async (_, opts?: { global?: boolean }) => {
    try {
      return { ok: true, data: await npxService.list(opts?.global) }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle(
    'skills:install',
    async (_, opts: { packageRef: string; agents: string[]; global?: boolean }) => {
      try {
        return {
          ok: true,
          data: await npxService.install(opts.packageRef, opts.agents, opts.global)
        }
      } catch (e) {
        return { ok: false, error: serializeError(e) }
      }
    }
  )

  ipcMain.handle(
    'skills:install-streaming',
    async (_, opts: { packageRef: string; agents: string[]; global?: boolean }) => {
      const mainWindow = getMainWindow()
      if (!mainWindow) {
        return {
          ok: false,
          error: {
            code: 'UNKNOWN',
            command: '',
            stderr: '',
            exitCode: null,
            message: 'Main window not available'
          }
        }
      }
      try {
        const onOutput = (text: string): void => {
          if (mainWindow.isDestroyed()) return
          mainWindow.webContents.send('skills:install-output', text)
        }
        return {
          ok: true,
          data: await npxService.installStreaming(
            onOutput,
            opts.packageRef,
            opts.agents,
            opts.global
          )
        }
      } catch (e) {
        return { ok: false, error: serializeError(e) }
      }
    }
  )

  ipcMain.handle('skills:install-cancel', () => {
    npxService.cancelInstall()
  })

  ipcMain.handle('skills:update', async (_, opts: { packageRef: string; global?: boolean }) => {
    try {
      return { ok: true, data: await npxService.update(opts.packageRef, opts.global) }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle('skills:update-all', async (_, opts?: { global?: boolean }) => {
    try {
      return { ok: true, data: await npxService.updateAll(opts?.global) }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle(
    'skills:remove',
    async (_, opts: { packageRef: string; agent?: string; global?: boolean }) => {
      try {
        return { ok: true, data: await npxService.remove(opts.packageRef, opts.agent, opts.global) }
      } catch (e) {
        return { ok: false, error: serializeError(e) }
      }
    }
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc/skills.ipc.ts
git commit -m "refactor: rewrite skills.ipc.ts to use NpxService with unified error serialization"
```

---

## Task 6: Update EnvService to use NpxService

**Files:**

- Modify: `src/main/services/EnvService.ts`

- [ ] **Step 1: Remove checkCommand and update checkAll**

In `src/main/services/EnvService.ts`:

Remove the `checkCommand` function (lines 8-25).

Add imports at the top (after the existing imports):

```typescript
import { commandRunner } from './CommandRunner'
import { npxService } from './NpxService'
```

Remove the `execa` import (line 1) — it is no longer used directly.

Replace the `checkAll` function with:

```typescript
export async function checkAll(): Promise<EnvStatus> {
  const node = await commandRunner.run('node', ['--version'], { timeout: 10000 })
  const npx = await npxService.checkNpxVersion()
  const skills = await npxService.checkSkillsVersion()
  return {
    nodeInstalled: node.success,
    nodeVersion: node.success ? node.stdout.trim() : null,
    npxInstalled: npx.ok,
    skillsInstalled: skills.ok
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/services/EnvService.ts
git commit -m "refactor: EnvService uses NpxService for npx/skills version checks"
```

---

## Task 7: Update preload types and bridge

**Files:**

- Modify: `src/preload/index.d.ts`
- Modify: `src/preload/index.ts`

- [ ] **Step 1: Update index.d.ts**

Replace the entire content of `src/preload/index.d.ts` with:

```typescript
import type { ElectronAPI } from '@electron-toolkit/preload'
import type {
  EnvStatus,
  Skill,
  AppSettings,
  CommandResult,
  SkillSearchResponse,
  CommandErrorInfo
} from '../shared/types'

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: CommandErrorInfo }

export interface AppApi {
  skills: {
    search: (keyword: string) => Promise<IpcResult<SkillSearchResponse>>
    list: (opts?: { global?: boolean }) => Promise<IpcResult<Skill[]>>
    install: (opts: {
      packageRef: string
      agents: string[]
      global?: boolean
    }) => Promise<IpcResult<CommandResult>>
    installStreaming: (opts: {
      packageRef: string
      agents: string[]
      global?: boolean
    }) => Promise<IpcResult<CommandResult>>
    onInstallOutput: (callback: (text: string) => void) => () => void
    cancelInstall: () => Promise<void>
    update: (opts: { packageRef: string; global?: boolean }) => Promise<IpcResult<CommandResult>>
    updateAll: (opts?: { global?: boolean }) => Promise<IpcResult<CommandResult>>
    remove: (opts: {
      packageRef: string
      agent?: string
      global?: boolean
    }) => Promise<IpcResult<CommandResult>>
  }
  shell: {
    openPath: (path: string) => Promise<{ success: boolean; error?: string }>
  }
  env: {
    check: () => Promise<EnvStatus>
    installNode: () => Promise<{ success: boolean; error?: string }>
    onDownloadProgress: (callback: (percent: number) => void) => () => void
  }
  store: {
    getSettings: () => Promise<AppSettings>
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

- [ ] **Step 2: Update preload/index.ts**

The preload bridge file (`src/preload/index.ts`) does not need code changes — it uses `Promise<unknown>` return types which are compatible. The type safety is provided by `index.d.ts`.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: Will show errors in renderer stores because they expect old return types. This is expected — fixed in Task 8.

- [ ] **Step 4: Commit**

```bash
git add src/preload/index.d.ts
git commit -m "refactor: update preload types to IpcResult<T> pattern"
```

---

## Task 8: Update renderer skills store

**Files:**

- Modify: `src/renderer/src/stores/skills.ts`

- [ ] **Step 1: Rewrite skills store to handle IpcResult**

Replace the entire content of `src/renderer/src/stores/skills.ts` with:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Skill, CommandResult, SkillSearchResult } from '../../../shared/types'
import { useCachedResource } from '../composables/useCachedResource'

function extractError(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return (e as { message: string }).message
  }
  return String(e)
}

function unwrapResult<T>(
  result: { ok: true; data: T } | { ok: false; error: { message: string } }
): T {
  if (result.ok) return result.data
  throw new Error(result.error.message)
}

export const useSkillsStore = defineStore('skills', () => {
  const installedCache = useCachedResource<Skill[]>(
    async () => unwrapResult(await window.api.skills.list({ global: true })),
    []
  )

  const selectedAgents = ref<string[]>([])
  const _searchResults = ref<SkillSearchResult[]>([])
  const _searchDuration = ref(0)
  const installing = ref(false)
  const updating = ref(false)
  const updatingAll = ref(false)
  const removing = ref(false)
  const searching = ref(false)
  const error = ref<string | null>(null)
  const _openLocationMessage = ref<
    ((msg: string, type: 'success' | 'warning' | 'error') => void) | null
  >(null)

  const fetching = computed(() => installedCache.loading.value)
  const installedSkills = computed(() => installedCache.data.value)

  const loading = computed(() => fetching.value || searching.value)

  const filteredSkills = computed(() => {
    if (selectedAgents.value.length === 0) return installedSkills.value
    const lowered = selectedAgents.value.map((a) => a.toLowerCase())
    return installedSkills.value.filter((skill) =>
      skill.agents.some((a) => lowered.includes(a.toLowerCase()))
    )
  })

  const searchResults = computed(() => _searchResults.value)
  const searchDuration = computed(() => _searchDuration.value)

  function clearError(): void {
    error.value = null
  }

  function setMessageHandler(
    handler: (msg: string, type: 'success' | 'warning' | 'error') => void
  ): void {
    _openLocationMessage.value = handler
  }

  async function search(keyword: string): Promise<void> {
    searching.value = true
    error.value = null
    try {
      const result = await window.api.skills.search(keyword)
      const response = unwrapResult(result)
      _searchResults.value = response.skills
      _searchDuration.value = response.duration_ms
    } catch (e) {
      error.value = extractError(e)
      _searchResults.value = []
      _searchDuration.value = 0
    } finally {
      searching.value = false
    }
  }

  async function fetchInstalled(_global?: boolean): Promise<void> {
    void _global
    await installedCache.ensure()
  }

  async function doInstall(
    packageRef: string,
    agents: string[],
    isGlobal: boolean,
    streaming: boolean
  ): Promise<CommandResult> {
    installing.value = true
    error.value = null
    try {
      const opts = { packageRef, agents: [...agents], global: isGlobal }
      const result = streaming
        ? await window.api.skills.installStreaming(opts)
        : await window.api.skills.install(opts)
      const data = unwrapResult(result)
      installedCache.invalidate()
      return data
    } catch (e) {
      error.value = extractError(e)
      throw e
    } finally {
      installing.value = false
    }
  }

  async function install(
    packageRef: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
    return doInstall(packageRef, agents, isGlobal, false)
  }

  async function installStreaming(
    packageRef: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
    return doInstall(packageRef, agents, isGlobal, true)
  }

  async function update(packageRef: string, global?: boolean): Promise<CommandResult> {
    updating.value = true
    error.value = null
    try {
      const result = await window.api.skills.update({ packageRef, global })
      const data = unwrapResult(result)
      installedCache.invalidate()
      return data
    } catch (e) {
      error.value = extractError(e)
      throw e
    } finally {
      updating.value = false
    }
  }

  async function updateAll(global?: boolean): Promise<CommandResult> {
    updatingAll.value = true
    error.value = null
    try {
      const result = await window.api.skills.updateAll({ global })
      const data = unwrapResult(result)
      installedCache.invalidate()
      return data
    } catch (e) {
      error.value = extractError(e)
      throw e
    } finally {
      updatingAll.value = false
    }
  }

  async function remove(packageRef: string, global?: boolean): Promise<CommandResult> {
    removing.value = true
    error.value = null
    try {
      const result = await window.api.skills.remove({ packageRef, global })
      const data = unwrapResult(result)
      installedCache.invalidate()
      return data
    } catch (e) {
      error.value = extractError(e)
      throw e
    } finally {
      removing.value = false
    }
  }

  async function openLocation(path: string): Promise<void> {
    try {
      const result = await window.api.shell.openPath(path)
      if (!result.success && _openLocationMessage.value) {
        _openLocationMessage.value(result.error || '无法打开路径', 'warning')
      }
    } catch (e) {
      error.value = extractError(e)
    }
  }

  return {
    searchResults,
    searchDuration,
    installedSkills,
    selectedAgents,
    filteredSkills,
    fetching,
    searching,
    installing,
    updating,
    updatingAll,
    removing,
    loading,
    error,
    clearError,
    setMessageHandler,
    search,
    fetchInstalled,
    install,
    installStreaming,
    update,
    updateAll,
    remove,
    openLocation
  }
})
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/skills.ts
git commit -m "refactor: skills store uses unwrapResult for IpcResult pattern"
```

---

## Task 9: Delete SkillsService.ts

**Files:**

- Delete: `src/main/services/SkillsService.ts`

- [ ] **Step 1: Delete the file**

```bash
git rm src/main/services/SkillsService.ts
```

- [ ] **Step 2: Verify no remaining imports reference it**

Run: `rg "SkillsService" src/`
Expected: No matches

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete SkillsService.ts — replaced by NpxService + CommandRunner"
```

---

## Task 10: Final verification

**Files:**

- No changes

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS with zero errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS with zero errors

- [ ] **Step 3: Verify no stale imports**

Run: `rg "SkillsService|SkillsError|searchSkills[^A]" src/`
Expected: No matches

- [ ] **Step 4: Verify new architecture is wired correctly**

Run: `rg "npxService|commandRunner|searchSkillsApi" src/`
Expected: Matches in:

- `src/main/services/CommandRunner.ts` (commandRunner export)
- `src/main/services/NpxService.ts` (npxService export, commandRunner import)
- `src/main/services/EnvService.ts` (commandRunner, npxService imports)
- `src/main/api/skills.ts` (searchSkillsApi export, CommandError import)
- `src/main/ipc/skills.ipc.ts` (npxService, searchSkillsApi imports)
