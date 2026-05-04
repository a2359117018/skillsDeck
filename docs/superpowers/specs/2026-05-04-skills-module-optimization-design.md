# Skills Module Optimization Design

## Background

The skills listing page has three issues:

1. **Project skills tab always empty**: `npx skills list` (without `-g`) scans the Electron process's CWD, not a meaningful user project directory. The project tab is useless.
2. **Agent filtering incomplete**: Single-select only, no search, and the CLI `--agent` parameter returns incorrect results. Needs multi-select + search + client-side filtering.
3. **Table UI poor UX**: No total count, only 2 of 4 columns have data. Needs card-based layout.

## Decisions

- Remove project skills tab entirely (only global)
- Agent filter: multi-select dropdown with search, client-side filtering based on `agents` array
- Card layout: CSS Grid, each card shows skill name + agent tags + action buttons
- New action: "Open skill location" using `shell.showItemInFolder`
- Component-based approach: extract `AgentFilter.vue` and `SkillCard.vue`

## Design

### Section 1: Data Layer

**SkillsService.listSkills()**:

- Remove `agent` parameter. Always execute `npx skills list --json -g` without `--agent`.
- Returns all global skills in one call. Client filters by selected agents.

**New IPC handler: `shell:open-path`**:

- Parameter: `path: string`
- Main process calls `shell.showItemInFolder(path)` to open file explorer.

**Pinia store (skills.ts)**:

- `fetchInstalled()` no longer accepts `agent` parameter. Only calls `list()` for full data.
- New state: `selectedAgents: string[]` — currently selected agent filters.
- New getter: `filteredSkills` — filters `installedSkills` by checking if any selected agent appears in each skill's `agents` array. Returns full list when `selectedAgents` is empty.
- New action: `openLocation(path)` — calls `shell:open-path` IPC.

**Shared types**: No changes. `Skill` interface already has `agents: string[]` and `source: string`.

### Section 2: UI Components

**InstalledList.vue (slimmed composition layer)**:

- Remove tab switching. Only show global skills.
- Top toolbar: left side shows "N 个技能" count badge, right side has AgentFilter + update all button.
- Body: CSS Grid card layout iterating `filteredSkills`.
- Empty state: message when filter yields no results.

**AgentFilter.vue (new)**:

- Uses NSelect with `multiple` + `filterable` mode.
- Options from `AGENTS` constant, value is `agentFlag`, label is agent display name.
- Selected items shown as Tags inside the select.
- Emits `update:agents` event for parent to sync to store filter state.

**SkillCard.vue (new)**:

- Shows: skill name (main title), supported agents (Tag list using agent display names from `agentNameMap`).
- Action button row: open location (folder icon), update (refresh icon), remove (trash icon).
- Clicking skill name navigates to detail page.

Card structure:

```
┌─────────────────────────────┐
│ skill-name                  │
│ [claude-code] [cursor] ...  │
│                             │
│ 📂打开  🔄更新  🗑删除      │
└─────────────────────────────┘
```

### Section 3: File Changes

**Modified files**:

1. `src/main/services/SkillsService.ts` — Remove `agent` param from `listSkills`
2. `src/main/ipc/skills.ipc.ts` — `skills:list` handler no longer passes agent
3. `src/preload/index.ts` — Add `openPath` method
4. `src/preload/index.d.ts` — Add `openPath` type declaration
5. `src/renderer/src/stores/skills.ts` — Remove agent param, add `selectedAgents`, `filteredSkills`, `openLocation`
6. `src/renderer/src/views/InstalledList.vue` — Rewrite with card grid layout
7. `src/main/ipc/index.ts` — Register `shell:open-path` handler
8. `src/renderer/src/views/AgentView.vue` — Adapt to `fetchInstalled()` signature change

**New files**: 9. `src/renderer/src/components/skills/AgentFilter.vue` 10. `src/renderer/src/components/skills/SkillCard.vue`

**Unchanged files**: `src/shared/types.ts`, `SkillsSearch.vue`, `SkillInstallDialog.vue`, `SkillDetail.vue`, `SearchResultCard.vue`, `SkillSearchBar.vue`

### Data Flow After Changes

```
User selects agents in AgentFilter
    |
    v
InstalledList syncs to store.selectedAgents
    |
    v
store.filteredSkills (computed) filters installedSkills by selectedAgents
    |
    v
Grid renders SkillCard for each filtered skill
    |
    v
SkillCard actions:
  - Update -> store.update(name, true)
  - Remove -> store.remove(name)
  - Open Location -> store.openLocation(skill.source)
       |
       v
     IPC: shell:open-path -> shell.showItemInFolder(path)
```
