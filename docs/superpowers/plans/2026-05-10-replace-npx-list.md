# Replace npx skills list with File System Scanning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `npxService.list()` with `AgentScanner.scanInstalled()` to get accurate agent-skill associations, returning a simplified `InstalledSkill` structure.

**Architecture:** Extend `AgentScanner` with a new `scanInstalled()` method that iterates all agent `globalPath`s, lists skill subdirectories, and aggregates by skill name. IPC, preload types, Pinia store, and `SkillRow` are updated to consume the new structure.

**Tech Stack:** Electron, Vue 3, TypeScript, NaiveUI, Pinia, Node.js fs

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/shared/types.ts` | Modify | Add `InstalledSkill` and `InstalledSkillAgent` interfaces |
| `src/main/services/AgentScanner.ts` | Modify | Add `scanInstalled()` method |
| `src/main/ipc/skills.ipc.ts` | Modify | Replace `skills:list` handler to call `agentScanner.scanInstalled()` |
| `src/preload/index.d.ts` | Modify | Update `skills.list` return type to `InstalledSkill[]` |
| `src/renderer/src/stores/skills.ts` | Modify | Remove `enrichedSkills`, adapt `filteredSkills` to new `agents` shape |
| `src/renderer/src/components/skills/SkillRow.vue` | Modify | Use `agents[0]?.path`, render `agent.name` |

---

### Task 1: Add InstalledSkill types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add `InstalledSkillAgent` and `InstalledSkill` interfaces**

Add after the existing `AgentScanResult` interface:

```typescript
export interface InstalledSkillAgent {
  name: string
  path: string
}

export interface InstalledSkill {
  name: string
  agents: InstalledSkillAgent[]
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no consumers yet)

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add InstalledSkill and InstalledSkillAgent types"
```

---

### Task 2: Add scanInstalled() to AgentScanner

**Files:**
- Modify: `src/main/services/AgentScanner.ts`

- [ ] **Step 1: Import new types and add scanInstalled method**

Replace the import line:
```typescript
import type { AgentScanResult } from '../../shared/types'
```
with:
```typescript
import type { AgentScanResult, InstalledSkill } from '../../shared/types'
```

Add the new method before the closing brace of the `AgentScanner` class (before `export const agentScanner`):

```typescript
  async scanInstalled(): Promise<InstalledSkill[]> {
    const skillMap = new Map<string, InstalledSkill>()

    for (const agent of this.agents) {
      const absPath = this.expandPath(agent.globalPath)
      const skillNames: string[] = []

      try {
        const entries = await fs.promises.readdir(absPath, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '.system') {
            skillNames.push(entry.name)
          }
        }
      } catch {
        continue
      }

      for (const skillName of skillNames) {
        const skillPath = path.join(absPath, skillName)
        if (!skillMap.has(skillName)) {
          skillMap.set(skillName, { name: skillName, agents: [] })
        }
        skillMap.get(skillName)!.agents.push({
          name: agent.agentFlag,
          path: skillPath
        })
      }
    }

    return Array.from(skillMap.values())
  }
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/services/AgentScanner.ts
git commit -m "feat(AgentScanner): add scanInstalled method"
```

---

### Task 3: Update skills:list IPC handler

**Files:**
- Modify: `src/main/ipc/skills.ipc.ts`

- [ ] **Step 1: Replace npxService.list with agentScanner.scanInstalled**

Replace the import:
```typescript
import { npxService } from '../services/NpxService'
```
with:
```typescript
import { agentScanner } from '../services/AgentScanner'
```

Replace the `skills:list` handler:
```typescript
  ipcMain.handle('skills:list', async () => {
    try {
      return { ok: true, data: await agentScanner.scanInstalled() }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc/skills.ipc.ts
git commit -m "refactor(skills.ipc): use AgentScanner.scanInstalled for skills:list"
```

---

### Task 4: Update preload types

**Files:**
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Add import and update list signature**

Replace:
```typescript
import type {
  EnvStatus,
  Skill,
  AppSettings,
  CommandResult,
  SkillSearchResponse,
  CommandErrorInfo
} from '../shared/types'
```
with:
```typescript
import type {
  EnvStatus,
  Skill,
  AppSettings,
  CommandResult,
  SkillSearchResponse,
  CommandErrorInfo,
  InstalledSkill
} from '../shared/types'
```

Replace:
```typescript
    list: (opts?: { global?: boolean }) => Promise<IpcResult<Skill[]>>
```
with:
```typescript
    list: () => Promise<IpcResult<InstalledSkill[]>>
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/preload/index.d.ts
git commit -m "refactor(preload): update skills.list return type to InstalledSkill[]"
```

---

### Task 5: Update renderer skills store

**Files:**
- Modify: `src/renderer/src/stores/skills.ts`

- [ ] **Step 1: Update imports and type references**

Replace:
```typescript
import type {
  Skill,
  CommandResult,
  SkillSearchResult,
  AgentScanResult
} from '../../../shared/types'
```
with:
```typescript
import type {
  InstalledSkill,
  CommandResult,
  SkillSearchResult,
  AgentScanResult
} from '../../../shared/types'
```

- [ ] **Step 2: Update installedCache type and remove enrichedSkills**

Replace:
```typescript
  const installedCache = useCachedResource<Skill[]>(
    async () => unwrapResult(await window.api.skills.list({ global: true })),
    []
  )
```
with:
```typescript
  const installedCache = useCachedResource<InstalledSkill[]>(
    async () => unwrapResult(await window.api.skills.list()),
    []
  )
```

Replace the `resolveAgentsByPath` function and `enrichedSkills` computed with a direct alias:
```typescript
  const enrichedSkills = installedSkills
```

Or simply replace all code from `resolveAgentsByPath` through the end of `enrichedSkills` (lines 50-82 approximately) with:
```typescript
  const enrichedSkills = installedSkills
```

- [ ] **Step 3: Update filteredSkills to use agent.name**

Replace:
```typescript
      skills = skills.filter((s) => s.agents.some((a) => lowered.includes(a.toLowerCase())))
```
with:
```typescript
      skills = skills.filter((s) => s.agents.some((a) => lowered.includes(a.name.toLowerCase())))
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/stores/skills.ts
git commit -m "refactor(skills-store): adapt to InstalledSkill structure"
```

---

### Task 6: Update SkillRow component

**Files:**
- Modify: `src/renderer/src/components/skills/SkillRow.vue`

- [ ] **Step 1: Update import and type reference**

Replace:
```typescript
import type { Skill } from '../../../../shared/types'
```
with:
```typescript
import type { InstalledSkill } from '../../../../shared/types'
```

Replace:
```typescript
const props = defineProps<{ skill: Skill }>()
```
with:
```typescript
const props = defineProps<{ skill: InstalledSkill }>()
```

- [ ] **Step 2: Update template for agents object array**

Replace the open-location button:
```vue
        <NButton
          quaternary
          circle
          size="tiny"
          class="action-btn"
          title="打开位置"
          @click="emit('openLocation', props.skill.path)"
        >
```
with:
```vue
        <NButton
          quaternary
          circle
          size="tiny"
          class="action-btn"
          title="打开位置"
          @click="emit('openLocation', props.skill.agents[0]?.path)"
        >
```

Replace the agents tag loop:
```vue
    <div v-if="props.skill.agents.length > 0" class="skill-agents">
      <NTag
        v-for="agent in props.skill.agents"
        :key="agent"
        size="small"
        :bordered="false"
        round
        class="agent-tag agent-tag--clickable"
        @click="emit('filterAgent', agent)"
      >
        {{ agent }}
      </NTag>
    </div>
```
with:
```vue
    <div v-if="props.skill.agents.length > 0" class="skill-agents">
      <NTag
        v-for="agent in props.skill.agents"
        :key="agent.name"
        size="small"
        :bordered="false"
        round
        class="agent-tag agent-tag--clickable"
        @click="emit('filterAgent', agent.name)"
      >
        {{ agent.name }}
      </NTag>
    </div>
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/skills/SkillRow.vue
git commit -m "refactor(SkillRow): adapt to InstalledSkill with agents as object array"
```

---

### Task 7: Final verification

**Files:**
- No changes

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS with zero errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS with zero errors

- [ ] **Step 3: Check for stale references**

Run: `rg "useCachedResource<Skill\[\]>" src/` and `rg "npxService\.list" src/`
Expected: No matches (or only in NpxService.ts itself)

- [ ] **Step 4: Commit if any fixes needed**

If lint/typecheck found issues, fix and commit. Otherwise nothing to commit.

---

## Self-Review

**Spec coverage:**
- ✅ New `InstalledSkill` / `InstalledSkillAgent` types → Task 1
- ✅ `AgentScanner.scanInstalled()` → Task 2
- ✅ IPC handler replacement → Task 3
- ✅ Preload types → Task 4
- ✅ Store: remove `enrichedSkills`, adapt filtering → Task 5
- ✅ `SkillRow` component → Task 6

**Placeholder scan:** No TBD/TODO/placeholders found.

**Type consistency:** `InstalledSkill` used consistently across tasks 1-6. `agents` is `InstalledSkillAgent[]` everywhere.
