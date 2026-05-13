# Remove npx Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unnecessary npx indirection layer — the app already installs `skills` globally, so all commands should invoke `skills` directly instead of `npx skills`.

**Architecture:** Rename `NpxService` → `SkillsService`, change all command invocations from `npx skills ...` to `skills ...`, remove npx fields from shared types, and strip npx UI from settings and env checks.

**Tech Stack:** Electron, Vue 3, TypeScript, execa

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/shared/types.ts` | Modify | Remove `npxInstalled`/`npxVersion` from `EnvStatus`, remove `'update-npx'` from `BackgroundTask` type |
| `src/main/services/NpxService.ts` | Rename + Modify → `SkillsService.ts` | Rename class, remove `checkNpxVersion()`, change command from `npx` to `skills`, flatten args |
| `src/main/services/EnvService.ts` | Modify | Remove npx check import/call, use `commandRunner.run('skills', ...)` directly, simplify `installSkillsCli()` |
| `src/main/services/BackgroundTaskService.ts` | Modify | Remove `'update-npx'` case, change `install-skills` to not include `npx` |
| `src/main/ipc/skills.ipc.ts` | Modify | Update import from `NpxService` to `SkillsService` |
| `src/renderer/src/stores/env.ts` | Modify | Remove npx defaults from status cache |
| `src/renderer/src/App.vue` | Modify | Remove `npxInstalled` from `envOk` check |
| `src/renderer/src/views/SettingsView.vue` | Modify | Remove npx status block, `handleUpdateNpx` function |

---

### Task 1: Update shared types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Remove npx fields from EnvStatus and update-npx from BackgroundTask type**

Edit `src/shared/types.ts` — remove `npxInstalled` and `npxVersion` from `EnvStatus`, remove `'update-npx'` from `BackgroundTask['type']`:

```typescript
export interface EnvStatus {
  nodeInstalled: boolean
  nodeVersion: string | null
  npmInstalled: boolean
  npmVersion: string | null
  skillsInstalled: boolean
  skillsVersion: string | null
}

export interface BackgroundTask {
  id: string
  type: 'update-skills' | 'install-node' | 'install-skills'
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  progress: number
  stdout: string
  error?: string
  createdAt: number
  updatedAt: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "refactor: remove npx fields from shared types"
```

---

### Task 2: Rename and refactor NpxService → SkillsService

**Files:**
- Rename: `src/main/services/NpxService.ts` → `src/main/services/SkillsService.ts`

- [ ] **Step 1: Create SkillsService.ts with refactored code**

Create `src/main/services/SkillsService.ts` with the following content. Key changes:
- Class renamed to `SkillsService`, export renamed to `skillsService`
- `checkNpxVersion()` deleted entirely
- `checkSkillsVersion()` uses `commandRunner.run('skills', ['--version'])` directly
- All `commandRunner.run('npx', args)` changed to `commandRunner.run('skills', args)`
- `buildArgs()` no longer prepends `'skills'` — it just returns `[subcommand, ...parts]`

```typescript
import type { CommandResult } from '../../shared/types'
import { commandRunner } from './CommandRunner'
import { getSettings } from './StoreService'

class SkillsService {
  async checkSkillsVersion(): Promise<{ ok: boolean; version: string | null }> {
    try {
      const result = await commandRunner.run('skills', ['--version'], {
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

  async install(source: string, agents: string[], global?: boolean): Promise<CommandResult> {
    const args = this.buildInstallArgs(source, agents, global)
    return commandRunner.run('skills', args)
  }

  async installStreaming(
    onOutput: (text: string) => void,
    source: string,
    agents: string[],
    global?: boolean
  ): Promise<CommandResult> {
    const args = this.buildInstallArgs(source, agents, global)
    return commandRunner.run('skills', args, { onOutput })
  }

  cancelInstall(): void {
    commandRunner.cancel()
  }

  async update(name: string, global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('update', name, '-y')
    if (global) args.push('-g')
    return commandRunner.run('skills', args)
  }

  async updateAll(global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('update', '-y')
    if (global) args.push('-g')
    return commandRunner.run('skills', args)
  }

  async remove(name: string, agent?: string, global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('remove', name, '-y')
    if (global) args.push('-g')
    if (agent) args.push('-a', agent)
    return commandRunner.run('skills', args)
  }

  private buildArgs(subcommand: string, ...parts: string[]): string[] {
    return [subcommand, ...parts]
  }

  private buildGitUrl(source: string): string {
    const proxyUrl = getSettings().proxyUrl
    if (proxyUrl) {
      return `${proxyUrl}/https://github.com/${source}.git`
    }
    return `https://github.com/${source}.git`
  }

  private buildInstallArgs(source: string, agents: string[], global?: boolean): string[] {
    const gitUrl = this.buildGitUrl(source)
    const args = this.buildArgs('add', gitUrl)
    args.push('-g', '-y')
    if (global) {
      args.push('--agent', '*')
    } else if (agents.length > 0) {
      args.push('--agent', ...agents)
    }
    return args
  }
}

export const skillsService = new SkillsService()
```

- [ ] **Step 2: Delete old NpxService.ts**

```bash
rm src/main/services/NpxService.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/main/services/SkillsService.ts
git rm src/main/services/NpxService.ts
git commit -m "refactor: rename NpxService to SkillsService, invoke skills CLI directly"
```

---

### Task 3: Update EnvService

**Files:**
- Modify: `src/main/services/EnvService.ts`

- [ ] **Step 1: Remove npx import and calls, simplify installSkillsCli**

Edit `src/main/services/EnvService.ts`:

1. Remove the import of `npxService`:
   - Delete: `import { npxService } from './NpxService'`

2. Replace the `checkAll()` function to remove npx checks and use `commandRunner` directly for skills:
   ```typescript
   export async function checkAll(): Promise<EnvStatus> {
     const node = await safeRun('node', ['--version'], 10000)
     const npm = await safeRun('npm', ['--version'], 10000)
     const skills = await safeRun('skills', ['--version'], 10000)
     return {
       nodeInstalled: node.success,
       nodeVersion: node.success ? node.stdout.trim() : null,
       npmInstalled: npm.success,
       npmVersion: npm.success ? npm.stdout.trim() : null,
       skillsInstalled: skills.success,
       skillsVersion: skills.success ? skills.stdout.trim() : null
     }
   }
   ```

3. In `installSkillsCli()`, change the args from `['install', '-g', 'npx', 'skills']` to `['install', '-g', 'skills']`:
   ```typescript
   export async function installSkillsCli(): Promise<{ success: boolean; stdout: string }> {
     try {
       const args = ['install', '-g', 'skills']
       const registry = getSettings().npmRegistry
       if (registry) {
         args.push('--registry', registry)
       }
       const result = await commandRunner.run('npm', args, {
         timeout: 120000
       })
       return { success: result.success, stdout: result.stdout }
     } catch {
       return { success: false, stdout: '' }
     }
   }
   ```

- [ ] **Step 2: Commit**

```bash
git add src/main/services/EnvService.ts
git commit -m "refactor: remove npx checks from EnvService, simplify skills install"
```

---

### Task 4: Update BackgroundTaskService

**Files:**
- Modify: `src/main/services/BackgroundTaskService.ts`

- [ ] **Step 1: Remove update-npx case and fix install-skills args**

In `resolveCommand()`, remove the `'update-npx'` case and fix `'install-skills'`:

```typescript
private resolveCommand(type: TaskType): { command: string; args: string[] } {
  let command: string
  let args: string[]

  switch (type) {
    case 'update-skills':
      command = 'npm'
      args = ['update', '-g', 'skills']
      break
    case 'install-node':
      throw new Error('install-node not yet supported in BackgroundTaskService')
    case 'install-skills':
      command = 'npm'
      args = ['install', '-g', 'skills']
      break
  }

  const registry = getSettings().npmRegistry
  if (registry) {
    args.push('--registry', registry)
  }

  return { command, args }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/services/BackgroundTaskService.ts
git commit -m "refactor: remove update-npx task type, fix install-skills command"
```

---

### Task 5: Update IPC handlers

**Files:**
- Modify: `src/main/ipc/skills.ipc.ts`

- [ ] **Step 1: Update import and all references from npxService to skillsService**

Change the import line from:
```typescript
import { npxService } from '../services/NpxService'
```
to:
```typescript
import { skillsService } from '../services/SkillsService'
```

Then replace all `npxService.` references in the file with `skillsService.`. There are 7 occurrences:
- Line 45: `npxService.install(...)` → `skillsService.install(...)`
- Line 76: `npxService.installStreaming(...)` → `skillsService.installStreaming(...)`
- Line 85: `npxService.cancelInstall()` → `skillsService.cancelInstall()`
- Line 90: `npxService.update(...)` → `skillsService.update(...)`
- Line 98: `npxService.updateAll(...)` → `skillsService.updateAll(...)`
- Line 110: `npxService.remove(...)` → `skillsService.remove(...)`
- Line 133: `npxService.update(...)` → `skillsService.update(...)`
- Line 160: `npxService.updateAll(...)` → `skillsService.updateAll(...)`

- [ ] **Step 2: Commit**

```bash
git add src/main/ipc/skills.ipc.ts
git commit -m "refactor: update skills IPC to use SkillsService"
```

---

### Task 6: Update renderer store and App.vue

**Files:**
- Modify: `src/renderer/src/stores/env.ts`
- Modify: `src/renderer/src/App.vue`

- [ ] **Step 1: Remove npx defaults from env store**

In `src/renderer/src/stores/env.ts`, remove `npxInstalled` and `npxVersion` from the default status object:

```typescript
const statusCache = useCachedResource<EnvStatus>(() => window.api.env.check(), {
  nodeInstalled: false,
  nodeVersion: null,
  npmInstalled: false,
  npmVersion: null,
  skillsInstalled: false,
  skillsVersion: null
})
```

- [ ] **Step 2: Remove npxInstalled from App.vue envOk check**

In `src/renderer/src/App.vue`, change the `envOk` computed:

```typescript
const envOk = computed(() => {
  const s = envStore.status
  return s?.nodeInstalled && s?.npmInstalled && s?.skillsInstalled
})
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/env.ts src/renderer/src/App.vue
git commit -m "refactor: remove npx from renderer env checks"
```

---

### Task 7: Remove npx UI from SettingsView

**Files:**
- Modify: `src/renderer/src/views/SettingsView.vue`

- [ ] **Step 1: Remove handleUpdateNpx function**

Delete the entire `handleUpdateNpx` function (lines 279-295):

```typescript
// DELETE THIS ENTIRE FUNCTION:
async function handleUpdateNpx(): Promise<void> {
  const confirmed = await confirmUpdateEnv('npx', envStore.status?.npxVersion || '')
  if (!confirmed) return
  taskStore
    .start('update-npx', {
      onSuccess: () => {
        message.success('npx 更新成功')
        envStore.check()
      },
      onError: (err) => {
        message.error(`npx 更新失败: ${err}`)
      }
    })
    .catch((e) => {
      message.info(e instanceof Error ? e.message : '启动更新失败')
    })
}
```

- [ ] **Step 2: Remove npx env-check-item block from template**

Delete the npx status display block (lines 525-551) from the template — the entire `<div class="env-check-item">` that shows npx name, version, and update button. This is the block between the npm check item and the skills check item.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/SettingsView.vue
git commit -m "refactor: remove npx status UI from settings"
```

---

### Task 8: Verify build passes

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: Both node and web typechecks pass with no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 3: Run dev server and smoke test**

```bash
npm run dev
```

Manual verification:
1. App launches without errors
2. Settings page shows 3 env items: Node.js, npm, skills (no npx)
3. Install/update/remove flows still work correctly
4. Environment banner in main window no longer checks npx
