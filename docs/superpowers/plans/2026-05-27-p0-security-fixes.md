# P0 Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 security vulnerabilities (path traversal) + 1 runtime bug (stderr misrouting) + 1 architecture migration (task executors) in the Electron main process.

**Architecture:** Extract shared `isPathInside` utility for path traversal prevention; extend `BackgroundTask` type with `stderr` field; introduce `TaskExecutor` registry in `BackgroundTaskService` to decouple task logic from IPC handlers.

**Tech Stack:** Electron 39 + TypeScript 5.9 + Node.js fs/path APIs + execa

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/main/utils/pathSecurity.ts` | **Create** | Shared `isPathInside` path traversal prevention utility |
| `src/shared/types.ts` | **Modify** | Add `stderr` field to `BackgroundTask` interface |
| `src/main/services/BackgroundTaskService.ts` | **Modify** | Fix stderr routing; add `TaskExecutor` registry; support generic task execution |
| `src/main/services/SkillTaskExecutors.ts` | **Create** | Register `skill-update`, `skill-update-all`, `skill-remove-batch` executors |
| `src/main/ipc/skills.ipc.ts` | **Modify** | Use `isPathInside`; add `validateInstallSource`; simplify task handlers |
| `src/main/ipc/tasks.ipc.ts` | **Modify** | Move `tasks:retry-skill-update` from `skills.ipc.ts` |
| `src/main/services/ArchiveSkillInstaller.ts` | **Modify** | Use `isPathInside` for archive path validation |
| `src/main/index.ts` | **Modify** | Call `registerSkillTaskExecutors()` on app startup |

---

## Dependency Order

```
Task 1 (pathSecurity) ──→ Task 2 (stderr) ──→ Task 4 (executors)
     │                       │                    │
     └───────────────────────┴────────────────────┘
                          ↓
                    Task 3 (source validation) ──→ Task 5 (verification)
```

Task 1, 2, 3 can be partially parallelized but commit order matters for clean history.

---

## Task 1: Extract Shared Path Security Utility

**Files:**
- Create: `src/main/utils/pathSecurity.ts`
- Modify: `src/main/ipc/skills.ipc.ts:245-253`
- Modify: `src/main/services/ArchiveSkillInstaller.ts:29-45`

- [ ] **Step 1.1: Create `isPathInside` utility**

Create `src/main/utils/pathSecurity.ts`:

```typescript
import fs from 'fs'
import path from 'path'

/**
 * Validate that `child` path is strictly inside `parent` directory.
 * Uses fs.realpath to resolve symlinks and path.relative to avoid
 * prefix-matching bypasses on Windows (e.g. C:\...\Tempfake starts with C:\...\Temp).
 *
 * @param parent - The parent directory path
 * @param child - The child path to validate
 * @returns true if child is inside parent, false otherwise
 */
export function isPathInside(parent: string, child: string): boolean {
  try {
    const realParent = fs.realpathSync(parent)
    const realChild = fs.realpathSync(child)
    const rel = path.relative(realParent, realChild)
    return !rel.startsWith('..') && !path.isAbsolute(rel)
  } catch {
    return false
  }
}
```

- [ ] **Step 1.2: Apply to `skills:cleanup-temp` handler**

Modify `src/main/ipc/skills.ipc.ts`:

```typescript
// Add at top of file with other imports
import { isPathInside } from '../utils/pathSecurity'

// Replace the skills:cleanup-temp handler (around line 245)
ipcMain.handle('skills:cleanup-temp', async (_, tempDirs: string[]) => {
  const tmpDir = os.tmpdir()
  for (const dir of tempDirs) {
    const resolved = path.resolve(dir)
    if (
      isPathInside(tmpDir, resolved) &&
      path.basename(resolved).startsWith('skills-')
    ) {
      await localSkillInstaller.cleanupTempDir(resolved)
    }
  }
})
```

- [ ] **Step 1.3: Apply to `ArchiveSkillInstaller.extractAndScan`**

Modify `src/main/services/ArchiveSkillInstaller.ts`:

```typescript
// Add import at top
import { isPathInside } from '../utils/pathSecurity'

// In extractAndScan method, replace the validation loop:
for (const f of files) {
  const extractedPath = path.resolve(tempDir, f.path)
  if (!isPathInside(tempDir, extractedPath)) {
    throw new Error('Archive contains entries outside the target directory')
  }
}
```

- [ ] **Step 1.4: Build check**

Run: `npm run typecheck`
Expected: No type errors in new utility or modified files.

- [ ] **Step 1.5: Commit**

```bash
git add src/main/utils/pathSecurity.ts src/main/ipc/skills.ipc.ts src/main/services/ArchiveSkillInstaller.ts
git commit -m "fix: prevent path traversal in cleanup-temp and archive extraction

- Extract shared isPathInside() utility using fs.realpath + path.relative
- Replace startsWith-based validation vulnerable to prefix bypass on Windows
- Apply to skills:cleanup-temp handler and ArchiveSkillInstaller

Refs: P0-1, P0-2"
```

---

## Task 2: Fix BackgroundTaskService stderr Routing

**Files:**
- Modify: `src/shared/types.ts:10-25`
- Modify: `src/main/services/BackgroundTaskService.ts`

- [ ] **Step 2.1: Add `stderr` field to `BackgroundTask` type**

Modify `src/shared/types.ts`:

```typescript
export interface BackgroundTask {
  id: string
  type:
    | 'update-skills'
    | 'install-node'
    | 'install-skills'
    | 'skill-update'
    | 'skill-update-all'
    | 'skill-remove-batch'
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  progress: number
  stdout: string
  stderr: string  // NEW: separate stderr capture
  error?: string
  createdAt: number
  updatedAt: number
}
```

- [ ] **Step 2.2: Initialize `stderr` in `register()`**

In `src/main/services/BackgroundTaskService.ts`, modify `register()` method:

```typescript
register(type: string): string {
  const id = randomUUID()
  const task: BackgroundTask = {
    id,
    type: type as TaskType,
    status: 'pending',
    progress: -1,
    stdout: '',
    stderr: '',  // NEW
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  this.tasks.set(id, task)
  return id
}
```

- [ ] **Step 2.3: Route stderr data to `task.stderr`**

In `startBuiltin()` method, fix both stdout and stderr handlers:

```typescript
child.stdout?.on('data', (data: Buffer) => {
  task.stdout += data.toString()
  task.updatedAt = Date.now()
  this.emitUpdate(task)
})

child.stderr?.on('data', (data: Buffer) => {
  task.stderr += data.toString()  // FIXED: was task.stdout
  task.updatedAt = Date.now()
  this.emitUpdate(task)
})
```

- [ ] **Step 2.4: Use stderr in error reporting**

In `startBuiltin()` method, modify exit handler:

```typescript
child.on('exit', (code) => {
  if (code === 0) {
    this.markSuccess(id)
  } else {
    const detail = task.stderr.trim() || task.stdout.trim()
    this.markError(id, `Exit code: ${code}${detail ? `\n${detail}` : ''}`)
  }
  this.cleanup(id)
})
```

- [ ] **Step 2.5: Apply same fixes to `retryBuiltIn()`**

In `retryBuiltIn()` method:

1. Clear `stderr` on retry reset:
```typescript
task.stderr = ''  // Add alongside task.stdout = ''
```

2. Fix stderr handler:
```typescript
child.stderr?.on('data', (data: Buffer) => {
  task.stderr += data.toString()  // FIXED: was task.stdout
  task.updatedAt = Date.now()
  this.emitUpdate(task)
})
```

3. Fix exit handler:
```typescript
child.on('exit', (code) => {
  if (code === 0) {
    this.markSuccess(taskId)
  } else {
    const detail = task.stderr.trim() || task.stdout.trim()
    this.markError(taskId, `Exit code: ${code}${detail ? `\n${detail}` : ''}`)
  }
  this.cleanup(taskId)
})
```

- [ ] **Step 2.6: Build check**

Run: `npm run typecheck`
Expected: No errors. `BackgroundTask` type change propagates correctly.

- [ ] **Step 2.7: Commit**

```bash
git add src/shared/types.ts src/main/services/BackgroundTaskService.ts
git commit -m "fix: separate stderr capture in BackgroundTaskService

- Add stderr field to BackgroundTask type
- Route child.stderr data to task.stderr instead of task.stdout
- Use stderr content in error detail on non-zero exit
- Clear stderr on task retry

Refs: P0-3"
```

---

## Task 3: Add Install Source Input Validation

**Files:**
- Modify: `src/main/ipc/skills.ipc.ts:44-56` and `58-92`

- [ ] **Step 3.1: Add `validateInstallSource` helper**

Add before `registerSkillsIpc()` in `src/main/ipc/skills.ipc.ts`:

```typescript
/**
 * Validate skills install source parameter.
 * Expected format: owner/repo or owner/repo/subpath (GitHub shorthand).
 */
function validateInstallSource(source: unknown): string {
  if (typeof source !== 'string' || source.trim() === '') {
    throw new Error('安装来源不能为空')
  }
  const trimmed = source.trim()
  if (trimmed.length > 200) {
    throw new Error('安装来源过长')
  }
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)*$/.test(trimmed)) {
    throw new Error('安装来源格式无效，应为 owner/repo 格式')
  }
  return trimmed
}
```

- [ ] **Step 3.2: Apply validation to `skills:install`**

Modify handler:

```typescript
ipcMain.handle(
  'skills:install',
  async (_, opts: { source: string; agents: string[]; global?: boolean }) => {
    try {
      const source = validateInstallSource(opts.source)
      return {
        ok: true,
        data: await skillsService.install(source, opts.agents, opts.global)
      }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  }
)
```

- [ ] **Step 3.3: Apply validation to `skills:install-streaming`**

Modify handler:

```typescript
ipcMain.handle(
  'skills:install-streaming',
  async (_, opts: { source: string; agents: string[]; global?: boolean }) => {
    // ... existing window check code ...
    try {
      const source = validateInstallSource(opts.source)
      const onOutput = (text: string): void => {
        if (mainWindow.isDestroyed()) return
        mainWindow.webContents.send('skills:install-output', text)
      }
      return {
        ok: true,
        data: await skillsService.installStreaming(
          onOutput,
          source,
          opts.agents,
          opts.global
        )
      }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  }
)
```

- [ ] **Step 3.4: Build check**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3.5: Commit**

```bash
git add src/main/ipc/skills.ipc.ts
git commit -m "fix: add source parameter validation to skills:install

- Add validateInstallSource() helper checking non-empty, max length,
  and owner/repo[/subpath] format
- Apply validation to both skills:install and skills:install-streaming

Refs: P0-4"
```

---

## Task 4: Migrate Task Execution Logic to BackgroundTaskService

**Files:**
- Modify: `src/main/services/BackgroundTaskService.ts`
- Create: `src/main/services/SkillTaskExecutors.ts`
- Modify: `src/main/ipc/skills.ipc.ts:261-388`
- Modify: `src/main/ipc/tasks.ipc.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 4.1: Add TaskExecutor interface and registry to BackgroundTaskService**

Modify `src/main/services/BackgroundTaskService.ts`:

Add before the class definition:

```typescript
/** Task executor contract — registered by domain modules */
export interface TaskExecutor {
  /** Execute the task. Must call markSuccess/markError on completion. */
  execute(taskId: string, payload: unknown): Promise<void>
}
```

Add to `BackgroundTaskService` class:

```typescript
private executors = new Map<string, TaskExecutor>()

registerExecutor(type: TaskType, executor: TaskExecutor): void {
  this.executors.set(type, executor)
}

async startTask(type: TaskType, payload: unknown): Promise<string> {
  const existing = Array.from(this.tasks.values()).find(
    (t) => t.type === type && (t.status === 'pending' || t.status === 'running')
  )
  if (existing) {
    throw new Error(`A ${type} task is already ${existing.status}`)
  }

  const id = this.register(type)
  const executor = this.executors.get(type)
  if (!executor) {
    this.tasks.delete(id)
    throw new Error(`No executor registered for task type: ${type}`)
  }

  this.markRunning(id)

  executor.execute(id, payload).catch((error) => {
    const task = this.tasks.get(id)
    if (task) {
      this.markError(id, error instanceof Error ? error.message : String(error))
    }
    this.cleanup(id)
  })

  return id
}
```

- [ ] **Step 4.2: Refactor `retryBuiltIn` to use executors**

Replace the existing `retryBuiltIn()` method:

```typescript
retryBuiltIn(taskId: string): void {
  const task = this.tasks.get(taskId)
  if (!task || task.status !== 'error') {
    throw new Error('Task not found or not in error state')
  }

  const conflicting = Array.from(this.tasks.values()).find(
    (t) => t.id !== taskId && t.type === task.type && (t.status === 'pending' || t.status === 'running')
  )
  if (conflicting) {
    throw new Error(`A ${task.type} task is already ${conflicting.status}`)
  }

  const executor = this.executors.get(task.type)
  if (!executor) {
    throw new Error(`No executor registered for task type: ${task.type}`)
  }

  task.status = 'pending'
  task.error = undefined
  task.stdout = ''
  task.stderr = ''
  task.progress = -1
  task.updatedAt = Date.now()
  this.emitUpdate(task)

  this.markRunning(taskId)

  executor.execute(taskId, undefined).catch((error) => {
    this.markError(taskId, error instanceof Error ? error.message : String(error))
    this.cleanup(taskId)
  })
}
```

- [ ] **Step 4.3: Create SkillTaskExecutors**

Create `src/main/services/SkillTaskExecutors.ts`:

```typescript
import { backgroundTaskService } from './BackgroundTaskService'
import { skillsService } from './SkillsService'

export function registerSkillTaskExecutors(): void {
  backgroundTaskService.registerExecutor('skill-update', {
    async execute(taskId, payload) {
      const { packageRef, global } = payload as { packageRef: string; global?: boolean }
      const result = await skillsService.update(packageRef, global)
      if (result.success) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        backgroundTaskService.markError(taskId, result.stderr || '更新失败')
      }
    }
  })

  backgroundTaskService.registerExecutor('skill-update-all', {
    async execute(taskId, payload) {
      const { global } = payload as { global?: boolean }
      const result = await skillsService.updateAll(global)
      if (result.success) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        backgroundTaskService.markError(taskId, result.stderr || '更新失败')
      }
    }
  })

  backgroundTaskService.registerExecutor('skill-remove-batch', {
    async execute(taskId, payload) {
      const { packageRefs, agentFlag } = payload as { packageRefs: string[]; agentFlag?: string }
      const failedNames: string[] = []

      for (const packageRef of packageRefs) {
        try {
          const result = await skillsService.remove(packageRef, agentFlag, true)
          if (!result.success) {
            failedNames.push(packageRef)
          }
        } catch (error) {
          console.error(`Failed to remove skill ${packageRef}:`, error)
          failedNames.push(packageRef)
        }
      }

      if (failedNames.length === 0) {
        backgroundTaskService.markSuccess(taskId)
      } else {
        const displayed = failedNames.slice(0, 5).join('、')
        const suffix = failedNames.length > 5 ? ` 等 ${failedNames.length} 个技能` : ''
        backgroundTaskService.markError(taskId, `删除失败：${displayed}${suffix}`)
      }
    }
  })
}
```

- [ ] **Step 4.4: Register executors on startup**

Modify `src/main/index.ts` (or wherever app initialization happens). Find where other services are initialized and add:

```typescript
import { registerSkillTaskExecutors } from './services/SkillTaskExecutors'

// After app.whenReady() or in existing init sequence
registerSkillTaskExecutors()
```

- [ ] **Step 4.5: Simplify task handlers in skills.ipc.ts**

Replace the three background task handlers:

```typescript
// skills:update-background
ipcMain.handle(
  'skills:update-background',
  async (_, opts: { packageRef: string; global?: boolean }) => {
    try {
      const taskId = await backgroundTaskService.startTask('skill-update', opts)
      return { taskId }
    } catch (e) {
      return { taskId: '', error: e instanceof Error ? e.message : String(e) }
    }
  }
)

// skills:update-all-background
ipcMain.handle('skills:update-all-background', async (_, opts?: { global?: boolean }) => {
  try {
    const taskId = await backgroundTaskService.startTask('skill-update-all', opts)
    return { taskId }
  } catch (e) {
    return { taskId: '', error: e instanceof Error ? e.message : String(e) }
  }
})

// skills:remove-batch-background
ipcMain.handle(
  'skills:remove-batch-background',
  async (_, opts: { packageRefs: string[]; agentFlag?: string }) => {
    try {
      if (!Array.isArray(opts.packageRefs) || opts.packageRefs.length === 0) {
        return { taskId: '', error: '未选择要删除的技能' }
      }
      const taskId = await backgroundTaskService.startTask('skill-remove-batch', opts)
      return { taskId }
    } catch (e) {
      return { taskId: '', error: e instanceof Error ? e.message : String(e) }
    }
  }
)
```

- [ ] **Step 4.6: Move `tasks:retry-skill-update` to tasks.ipc.ts**

Remove from `skills.ipc.ts` (the `tasks:retry-skill-update` handler at lines 355-388).

Add to `src/main/ipc/tasks.ipc.ts`:

```typescript
import { skillsService } from '../services/SkillsService'

// Add alongside other task IPC handlers
ipcMain.handle('tasks:retry-skill-update', async (_, { taskId }: { taskId: string }) => {
  const task = backgroundTaskService.getStatus(taskId)
  if (!task || task.status !== 'error') {
    return { ok: false, error: 'Task not found or not in error state' }
  }

  if (task.type !== 'skill-update-all') {
    return { ok: false, error: '该任务类型不支持重试' }
  }

  try {
    backgroundTaskService.retryBuiltIn(taskId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
})
```

- [ ] **Step 4.7: Remove obsolete `hasPendingTask` helper**

If `hasPendingTask()` in `skills.ipc.ts` is no longer used by any remaining code, remove it.

- [ ] **Step 4.8: Build check**

Run: `npm run typecheck`
Expected: No errors. All task types resolve correctly.

- [ ] **Step 4.9: Commit**

```bash
git add src/main/services/BackgroundTaskService.ts src/main/services/SkillTaskExecutors.ts src/main/ipc/skills.ipc.ts src/main/ipc/tasks.ipc.ts src/main/index.ts
git commit -m "refactor: migrate skill task execution to BackgroundTaskService

- Add TaskExecutor interface and executor registry to BackgroundTaskService
- Create SkillTaskExecutors registering skill-update, skill-update-all,
  and skill-remove-batch executors
- Simplify IPC handlers to parameter validation + startTask() delegation
- Move tasks:retry-skill-update from skills.ipc.ts to tasks.ipc.ts
- Enable retryBuiltIn() to work with any registered executor type

Refs: P0-5"
```

---

## Task 5: Verification

- [ ] **Step 5.1: Full build**

Run: `npm run build`
Expected: Zero errors, zero warnings.

- [ ] **Step 5.2: Lint check**

Run: `npm run lint`
Expected: Pass with no issues.

- [ ] **Step 5.3: Manual test — cleanup-temp path traversal**

Verify: Sending a crafted path like `C:\...\Tempfake\skills-test` (on Windows) or `/tmpfake/skills-test` (on Unix) is rejected by `skills:cleanup-temp`.

- [ ] **Step 5.4: Manual test — archive extraction safety**

Verify: An archive containing `../../etc/passwd` or similar path entries is rejected during extraction.

- [ ] **Step 5.5: Manual test — stderr capture**

Trigger a failing background task (e.g. `update-skills` with no network). Verify `task.stderr` contains error output (inspect via DevTools console or task UI).

- [ ] **Step 5.6: Manual test — source validation**

Try installing with invalid sources: empty string, `../../../etc/passwd`, `a`. Verify each returns an error without calling `skillsService.install()`.

- [ ] **Step 5.7: Manual test — background tasks still work**

Verify: skill-update, skill-update-all, and skill-remove-batch background tasks still complete successfully through the UI.

- [ ] **Step 5.8: Create git tag for P0 checkpoint**

```bash
git tag p0-security-fixes
git log --oneline -6
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Requirement | Plan Task | Status |
|-----------------|-----------|--------|
| P0-1: cleanup-temp path traversal fix | Task 1.1-1.2 | ✓ |
| P0-2: ArchiveSkillInstaller path bypass fix | Task 1.1, 1.3 | ✓ |
| P0-3: stderr misrouting bug | Task 2.1-2.5 | ✓ |
| P0-4: source input validation | Task 3.1-3.3 | ✓ |
| P0-5: task execution migration | Task 4.1-4.6 | ✓ |

### Placeholder Scan

- [x] No "TBD" or "TODO" in plan
- [x] No vague "add error handling" steps
- [x] All code blocks contain complete implementation
- [x] No "similar to Task N" references

### Type Consistency

- [x] `BackgroundTask.stderr` field added in Task 2.1, referenced in Task 2.2-2.5
- [x] `TaskExecutor` interface defined in Task 4.1, used in Task 4.2-4.3
- [x] `isPathInside` created in Task 1.1, used in Task 1.2-1.3
- [x] `validateInstallSource` defined in Task 3.1, used in Task 3.2-3.3
