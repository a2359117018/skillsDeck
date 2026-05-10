# Replace npx skills list with File System Scanning

**Date**: 2026-05-10
**Status**: Draft

## Problem

`npx skills list --json` returns inaccurate `agents` associations. For example, Trae shows 10 installed skills in the scan, but filtering by Trae only displays 1 — the CLI's `agents` field is wrong. Direct file system scanning is 100% accurate because it reads the actual directory structure.

## Goal

Replace `npxService.list()` (which calls `npx skills list --json`) with `AgentScanner`-based scanning. Return a simplified data structure that accurately reflects which agents have which skills installed.

`install` / `update` / `updateAll` / `remove` continue to use `npx skills` CLI unchanged.

## New Data Structure

```typescript
// src/shared/types.ts

export interface InstalledSkillAgent {
  name: string   // agentFlag, e.g. 'trae', 'claude-code'
  path: string   // absolute path to this skill under the agent's skills dir
}

export interface InstalledSkill {
  name: string
  agents: InstalledSkillAgent[]
}
```

`agents` is derived from actual directory scanning: if `~/.trae/skills/my-skill/` exists, the skill `{name: 'my-skill'}` gets an agent entry `{name: 'trae', path: '/home/user/.trae/skills/my-skill'}`.

## Architecture

```
Renderer (Pinia Store)
  │  window.api.skills.list()
  ▼
IPC Handler (skills.ipc.ts)
  │  calls agentScanner.scanInstalled()
  ▼
AgentScanner
  │  scans each agent's globalPath
  │  lists subdirectories as skill names
  ▼
File System
```

## Changes

### 1. Extend AgentScanner (`src/main/services/AgentScanner.ts`)

Add a new method `scanInstalled()` that:

1. Iterates all agents from `agents.json`
2. For each agent's `globalPath`, reads subdirectories (skips dotfiles and `.system`)
3. For each skill directory, records `{agentFlag, skillPath}`
4. Aggregates by skill name into `InstalledSkill[]`

```typescript
async scanInstalled(): Promise<InstalledSkill[]> {
  const skillMap = new Map<string, InstalledSkill>()

  for (const agent of this.agents) {
    const absPath = this.expandPath(agent.globalPath)
    // ... read subdirectories ...
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

### 2. Update `skills.ipc.ts`

Replace `skills:list` handler:

```typescript
ipcMain.handle('skills:list', async () => {
  try {
    return { ok: true, data: await agentScanner.scanInstalled() }
  } catch (e) {
    return { ok: false, error: serializeError(e) }
  }
})
```

Remove the unused `global?: boolean` parameter — scanning only covers global paths.

### 3. Update Shared Types (`src/shared/types.ts`)

Add `InstalledSkill` and `InstalledSkillAgent` interfaces. Keep existing `Skill` interface for now (still used by `npxService.list()` internally if any code references it, though `list` itself is being replaced).

### 4. Update Preload Types (`src/preload/index.d.ts`)

Change `skills.list` return type:

```typescript
list: () => Promise<IpcResult<InstalledSkill[]>>
```

### 5. Update Renderer Store (`src/renderer/src/stores/skills.ts`)

- Change `installedCache` type from `Skill[]` to `InstalledSkill[]`
- Remove `enrichedSkills` computed — no longer needed since scanning is accurate
- Update `filteredSkills` to use `agent.name` instead of raw agent string:
  ```typescript
  skills = skills.filter((s) =>
    s.agents.some((a) => lowered.includes(a.name.toLowerCase()))
  )
  ```
- `AgentTagBar` continues to use `sortedAgentResults` from `AgentScanResult[]` — unchanged

### 6. Update SkillRow (`src/renderer/src/components/skills/SkillRow.vue`)

- Change `Skill` import to `InstalledSkill`
- `skill.path` → `skill.agents[0]?.path` for open-location button
- `v-for="agent in skill.agents"` → render `agent.name`, emit `agent.name` for filter

```vue
<NButton @click="emit('openLocation', skill.agents[0]?.path)">
<!-- ... -->
<NTag
  v-for="agent in skill.agents"
  :key="agent.name"
  @click="emit('filterAgent', agent.name)"
>
  {{ agent.name }}
</NTag>
```

## Fallback Behavior

- Agent directory does not exist → silently skipped (agent not installed)
- Permission errors reading subdirectory → skip that skill, log to console

## Scope Exclusions

- `install` / `update` / `updateAll` / `remove` remain on `npx skills` CLI
- `projectPath` scanning is out of scope — only `globalPath` is scanned
- The old `Skill` interface and `npxService.list()` method are retained but no longer called by IPC

## Verification Criteria

- [ ] `skills:list` IPC returns `InstalledSkill[]` with accurate `agents` per skill
- [ ] Filtering by Trae shows all skills that exist in `~/.trae/skills/`
- [ ] Typecheck passes with zero errors
- [ ] SkillRow renders correctly with new structure
- [ ] Open location, filter agent, update, remove buttons work as before
