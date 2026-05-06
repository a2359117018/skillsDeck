# Unified NpxService Layered Architecture

**Date**: 2026-05-06
**Status**: Approved

## Problem

The current `SkillsService.ts` has scattered npx command management:

1. **Duplicated error handling** — `execute()` and `handleExecError()` contain identical ENOENT/timeout/unknown mapping logic
2. **`installSkill()` bypasses shared `execute()`** — has its own direct `execa` call and independent try/catch
3. **`installSkillStreaming()` also bypasses `execute()`** — justified for streaming but duplicates error handling
4. **Inconsistent success checking** — `searchSkills`/`listSkills` check `result.success`, others don't
5. **Inconsistent `stripAnsi` usage** — applied in some functions, skipped in others
6. **`EnvService.checkCommand` duplicates execa config** — separate timeout (10s vs 60s), missing cwd/encoding
7. **Dead code** — `searchSkills()` (CLI version) is never called; IPC uses HTTP API
8. **Error serialization loss** — `SkillsError` class fields (`code`, `exitCode`, `command`) are lost across IPC boundary

## Architecture

```
Renderer (Pinia Store)
  │  window.api.skills.* / window.api.env.*
  ▼
Preload (IPC Bridge)
  │  ipcRenderer.invoke(...)
  ▼
IPC Handlers (skills.ipc.ts / env.ipc.ts)
  │
  ▼
NpxService              ← All npx CLI calls go through here
  │  search / list / install / update / remove / checkVersion
  ▼
CommandRunner           ← Generic execa wrapper, unified config/error/streaming
  │  run(command, args, opts?)
  ▼
execa
```

Also: `src/main/api/skills.ts` for HTTP search API calls, separate from CLI.

### Layer Responsibilities

- **CommandRunner**: Executes commands, handles timeout, error mapping, streaming. Knows nothing about npx or skills.
- **NpxService**: Builds npx command arguments, parses results (JSON parse, stripAnsi via runner). Knows nothing about IPC or renderer.
- **IPC Layer**: Calls NpxService methods, serializes errors to `CommandErrorInfo`. Knows nothing about execa.
- **api/skills.ts**: HTTP fetch to skills.sh. Independent of CLI layer.

## File Changes

| File                                 | Action     | Description                                                          |
| ------------------------------------ | ---------- | -------------------------------------------------------------------- | -------------------- |
| `src/main/services/CommandRunner.ts` | **Create** | Generic execa wrapper, singleton `commandRunner`                     |
| `src/main/services/NpxService.ts`    | **Create** | All npx CLI methods, singleton `npxService`                          |
| `src/main/api/skills.ts`             | **Create** | HTTP search API (`searchSkillsApi`)                                  |
| `src/main/services/SkillsService.ts` | **Delete** | Replaced by NpxService + CommandRunner                               |
| `src/shared/types.ts`                | **Modify** | Add `CommandErrorInfo` interface                                     |
| `src/main/services/EnvService.ts`    | **Modify** | `checkAll()` uses npxService, remove `checkCommand()`                |
| `src/main/ipc/skills.ipc.ts`         | **Modify** | Calls npxService + api/skills, unified try/catch error serialization |
| `src/main/ipc/env.ipc.ts`            | **Modify** | Adapt to new EnvService interface                                    |
| `src/preload/index.ts`               | **Modify** | Adapt return types to `{ok, data}                                    | {ok, error}` pattern |
| `src/preload/index.d.ts`             | **Modify** | Update type declarations                                             |
| `src/renderer/src/stores/skills.ts`  | **Modify** | Adapt to new return structure                                        |

**Unchanged**: Vue components, WindowManager, StoreService, Node.js download/install/extract logic in EnvService.

## CommandRunner

```typescript
// src/main/services/CommandRunner.ts

interface RunOptions {
  timeout?: number // default 60000ms
  cwd?: string // default os.homedir()
  onOutput?: (text: string) => void // present = streaming, absent = normal
}

interface CommandResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

class CommandRunner {
  private activeProcess: ReturnType<typeof execa> | null = null

  async run(command: string, args: string[], opts?: RunOptions): Promise<CommandResult>
  // Unified execa config: shell=win32, reject=false, encoding=utf8, cwd=homedir
  // With onOutput → bind stdout/stderr data events, stripAnsi each chunk, callback
  // Without onOutput → normal execa call
  // Error mapping: ENOENT→COMMAND_NOT_FOUND, timedOut→TIMEOUT, else→UNKNOWN
  // All stdout/stderr stripAnsi'd before returning

  cancel(): void
  // Kill activeProcess, set null
}

export const commandRunner = new CommandRunner()
```

Key decisions:

- Singleton export — shared across main process, `cancel()` can terminate running process
- `stripAnsi` applied at runner level — callers never need to worry about it
- Errors thrown as `CommandError` class (same structure as current `SkillsError`)
- `onOutput` optional callback — only used by NpxService.installStreaming

## NpxService

```typescript
// src/main/services/NpxService.ts

class NpxService {
  private runner = commandRunner

  async checkNpxVersion(): Promise<{ ok: boolean; version: string | null }>
  // exec: npx --version

  async checkSkillsVersion(): Promise<{ ok: boolean; version: string | null }>
  // exec: npx skills --version

  async list(global?: boolean): Promise<Skill[]>
  // exec: npx skills list --json [-g]
  // Internal JSON.parse, empty output returns []

  async install(packageRef: string, agents: string[], global?: boolean): Promise<CommandResult>
  // exec: npx skills add <ref> [--agent ...] -g -y

  async installStreaming(
    onOutput: (text: string) => void,
    packageRef: string,
    agents: string[],
    global?: boolean
  ): Promise<CommandResult>
  // Same args, passes onOutput to runner.run()

  cancelInstall(): void
  // Delegates to runner.cancel()

  async update(name: string, global?: boolean): Promise<CommandResult>
  // exec: npx skills update <name> -y [-g]

  async updateAll(global?: boolean): Promise<CommandResult>
  // exec: npx skills update -y [-g]

  async remove(name: string, agent?: string, global?: boolean): Promise<CommandResult>
  // exec: npx skills remove <name> -y [-g] [-a <agent>]

  private buildArgs(subcommand: string, ...parts: string[]): string[]
  // Unified: ['skills', subcommand, ...parts]
}

export const npxService = new NpxService()
```

Key decisions:

- Singleton — IPC layer imports and calls directly
- `checkNpxVersion()` and `checkSkillsVersion()` absorb env detection from EnvService
- `installStreaming` accepts `onOutput` callback — IPC layer wraps `mainWindow.webContents.send`, NpxService doesn't know about BrowserWindow
- All argument building goes through `buildArgs()`
- Dead code `searchSkills()` (CLI find) is removed

## HTTP API

```typescript
// src/main/api/skills.ts

export async function searchSkillsApi(keyword: string): Promise<SkillSearchResponse>
// HTTP GET to https://skills.sh/api/search?q=...&limit=10
// Migrated from SkillsService, unchanged logic
```

## Error Serialization

New shared type:

```typescript
// src/shared/types.ts addition

export interface CommandErrorInfo {
  code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'EXECUTION_FAILED' | 'UNKNOWN'
  command: string
  stderr: string
  exitCode: number | null
  message: string
}
```

IPC handlers use unified try/catch pattern:

```typescript
// Example: skills.ipc.ts
ipcMain.handle('skills:list', async (_, opts) => {
  try {
    return { ok: true, data: await npxService.list(opts?.global) }
  } catch (e) {
    if (e instanceof CommandError) {
      return { ok: false, error: e.toJSON() }
    }
    return {
      ok: false,
      error: { code: 'UNKNOWN', message: String(e), command: '', stderr: '', exitCode: null }
    }
  }
})
```

Renderer Pinia stores check `ok` field, use `error.code` for conditional UI (e.g., TIMEOUT shows retry, COMMAND_NOT_FOUND shows install guide).

Preload types updated from bare `Promise<CommandResult>` to `Promise<{ ok: true; data: T } | { ok: false; error: CommandErrorInfo }>`.

## EnvService Changes

```typescript
// src/main/services/EnvService.ts

// REMOVE: checkCommand() function entirely

// MODIFY checkAll():
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

// UNCHANGED: getNodeDownloadUrl, getNodeInstallDir, downloadNode,
//            registerNodeInPath, extractAndRegisterNode
```

## New Imports Summary

- `EnvService.ts`: imports `commandRunner` (for node check) and `npxService` (for npx/skills checks)
- `skills.ipc.ts`: imports `npxService` and `searchSkillsApi` from `api/skills.ts`
- `env.ipc.ts`: imports from `EnvService` (unchanged pattern)
- `NpxService.ts`: imports `commandRunner`
