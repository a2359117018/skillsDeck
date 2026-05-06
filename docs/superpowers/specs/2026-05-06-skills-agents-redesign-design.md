# Skills & Agents Module Redesign

## Problem

`npx skills list -g` returns an inaccurate `agents` field. The agent-to-skill mapping is unreliable, causing wrong agent labels on skill cards and incorrect filtering in AgentView. The current `resolveAgentByPath()` workaround in AgentView is scattered and not reusable.

## Solution

Replace CLI-based agent attribution with filesystem-based scanning. Introduce a new `AgentScanner` service in the main process that directly reads each agent's `globalPath` directory. Combine this with `npx skills list -g` (excluding its `agents` field) to build accurate skill-to-agent mappings.

## Data Flow

```
NpxService.list()  ──→  { name, version, source, path }  ──┐
                                                             │  skills store
AgentScanner.scanAll()  ──→  AgentScanResult[]          ──┘  (enrich + filter)
                                    │
                                    └──→ AgentView (direct consumption)
```

- **Skills page**: `npx list` provides metadata, `AgentScanner` provides accurate agent attribution via path reverse-lookup
- **Agents page**: `AgentScanner` is the sole data source; no dependency on `npx list`

---

## Section 1: AgentScanner Service (Main Process)

### New file: `src/main/services/AgentScanner.ts`

**Responsibility**: Read `agents.json`, scan each agent's `globalPath` directory, return structured results.

```typescript
interface AgentScanResult {
  agentFlag: string
  agentName: string
  globalPath: string // absolute path after ~ expansion
  skills: string[]   // subdirectory names = skill names
  count: number
}

interface AgentDef {
  name: string
  agentFlag: string
  projectPath: string
  globalPath: string
}
```

**Methods**:

```typescript
class AgentScanner {
  private agents: AgentDef[]               // loaded from agents.json
  private reverseMap: Map<string, AgentDef[]> // normalized globalPath → AgentDef[]

  async scanAll(): Promise<AgentScanResult[]>
  async scanAgent(agentFlag: string): Promise<AgentScanResult | null>
  getReversePathMap(): Map<string, AgentDef[]>
}
```

**Implementation details**:

- `~` expansion via `os.homedir()`
- `fs.readdir` with `withFileTypes: true`, filter `isDirectory()`, single level
- Directory not found → return empty `skills[]`, no error thrown
- `agents.json` loaded once at construction, cached
- `reverseMap` built at construction: normalize `globalPath` (replace `~`, normalize separators) as key, `AgentDef[]` as value (multiple agents can share the same `globalPath`)

### New file: `src/main/ipc/agents.ipc.ts`

| Channel | Input | Return |
|---------|-------|--------|
| `agent:scan-all` | none | `AgentScanResult[]` |
| `agent:scan-one` | `agentFlag: string` | `AgentScanResult \| null` |

### Preload update: `src/preload/index.ts`

Add `api.agents` namespace:

```typescript
agents: {
  scanAll: (): Promise<unknown> => ipcRenderer.invoke('agent:scan-all'),
  scanOne: (agentFlag: string): Promise<unknown> => ipcRenderer.invoke('agent:scan-one', agentFlag)
}
```

### IPC registration: `src/main/ipc/index.ts`

Import and call `registerAgentsIpc()`.

### Shared types: `src/shared/types.ts`

Add `AgentScanResult` interface.

---

## Section 2: Store Layer Changes

### `src/renderer/src/stores/skills.ts`

**New data sources**:

```typescript
// Existing: npx list raw results
const installedCache = useCachedResource<Skill[]>(...)

// New: agent scan results
const agentScanCache = useCachedResource<AgentScanResult[]>(
  async () => unwrapResult(await window.api.agents.scanAll()),
  []
)
```

**New computed: enriched skills** (replaces current `filteredSkills` base):

```typescript
const enrichedSkills = computed(() => {
  const scanData = agentScanCache.data.value
  if (!scanData || scanData.length === 0) return installedCache.data.value

  // Build reverse lookup: normalized globalPath → agentFlag[]
  // Multiple agents can share the same globalPath, so we accumulate
  const pathToAgents = new Map<string, string[]>()
  for (const result of scanData) {
    const normalized = result.globalPath.replace(/\\/g, '/').toLowerCase()
    const existing = pathToAgents.get(normalized) || []
    existing.push(result.agentFlag)
    pathToAgents.set(normalized, existing)
  }

  return installedCache.data.value.map(skill => ({
    ...skill,
    agents: resolveAgentsByPath(skill.path, pathToAgents)
  }))
})

function resolveAgentsByPath(
  skillPath: string,
  pathToAgents: Map<string, string[]>
): string[] {
  const normalized = skillPath.replace(/\\/g, '/').toLowerCase()
  const matched: string[] = []
  for (const [dir, flags] of pathToAgents) {
    if (normalized.includes(dir)) {
      matched.push(...flags)
    }
  }
  return matched
}
```

**New state: search keyword**:

```typescript
const searchKeyword = ref('')
function setSearchKeyword(keyword: string): void { searchKeyword.value = keyword }
```

**Updated filteredSkills**:

```typescript
const filteredSkills = computed(() => {
  let skills = enrichedSkills.value

  // Agent filter
  if (selectedAgents.value.length > 0) {
    const lowered = selectedAgents.value.map(a => a.toLowerCase())
    skills = skills.filter(s => s.agents.some(a => lowered.includes(a.toLowerCase())))
  }

  // Name search filter
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    skills = skills.filter(s => s.name.toLowerCase().includes(kw))
  }

  return skills
})
```

**Updated fetchInstalled**:

```typescript
async function fetchInstalled(global?: boolean): Promise<void> {
  await Promise.all([
    installedCache.ensure(),
    agentScanCache.ensure()
  ])
}
```

**Expose new members**:

```typescript
return {
  // ... existing
  agentScanResults: computed(() => agentScanCache.data.value),
  sortedAgentResults: computed(() =>
    [...(agentScanCache.data.value || [])].sort((a, b) => b.count - a.count)
  ),
  searchKeyword,
  setSearchKeyword,
  enrichedSkills,
  filteredSkills, // updated
}
```

---

## Section 3: Skills Page UI Redesign (InstalledList)

### Layout: grid cards → single-column list rows

### New component: `src/renderer/src/components/skills/SkillRow.vue`

```
┌─────────────────────────────────────────────────────────────┐
│  skill-name                                  [📁][🔄][🗑]    │
│  [Agent1] [Agent2] [Agent3] ...                              │
└─────────────────────────────────────────────────────────────┘
```

- **Structure**: two-line row, `display: flex; flex-direction: column`, gap `6px`
- **Line 1**: skill name (left, font `body-sm-medium` 14px/500, color `charcoal`) + action buttons (right: 📁 open folder / 🔄 update / 🗑 remove, `opacity: 0` → hover `opacity: 1`, transition `0.15s ease`), `justify-content: space-between`, vertically centered
- **Line 2**: agent tags, `flex-wrap: wrap`, `rounded-full` pills, bg `brand-blue-200` + text `brand-blue-deep`, font `micro` (12px/400), gap `4px`
- **Row**: no shadow (elevation 0), bottom border `1px solid hairline-soft`, padding vertical `md` (16px)
- **Hover**: background `surface`, left accent bar 3px `brand-blue`, elevation 1 shadow
- **Emits**: `update`, `remove`, `openLocation` (same interface as SkillCard)

### SkillCard.vue

Becomes unused after InstalledList switches to SkillRow. The search results page uses `SearchResultCard` (separate component). SkillCard can be removed or kept for future use — decide during implementation.

### InstalledList header

```
┌──────────────────────────────────────────────────────────────┐
│  [🔍 搜索技能...]    [Agent筛选]     12 个技能    [全部更新]   │
└──────────────────────────────────────────────────────────────┘
```

- **Search input**: pill-shaped (`border-radius: full`), bg `canvas`, border `1px solid hairline`, focus → border `2px solid brand-blue-deep`, clearable, binds to `store.searchKeyword`
- **AgentFilter**: NSelect, only shows agents with `count > 0` (from scan results), not all 55 agents
- **Count**: `filteredSkills.length` displayed as `body-sm` (14px/400), color `slate`
- **Update all button**: ghost style, `rounded-full`

### InstalledList body

```html
<TransitionGroup name="list" tag="div">
  <SkillRow
    v-for="skill in skillsStore.filteredSkills"
    :key="skill.name"
    :skill="skill"
    @update="handleUpdate"
    @remove="handleRemove"
    @open-location="handleOpenLocation"
  />
</TransitionGroup>
```

FLIP animation via `<TransitionGroup>` for filter transitions.

### AgentFilter.vue update

Options sourced from `store.sortedAgentResults` (only agents with `count > 0`), not from static `AGENTS` constant.

---

## Section 4: AgentView Redesign

### Data source: AgentScanner only

No dependency on `npx skills list -g`. All data from `store.sortedAgentResults`.

### Header

```
┌──────────────────────────────────────────────────────┐
│  [🔍 搜索 Agent...]                      [刷新按钮]   │
└──────────────────────────────────────────────────────┘
```

- Search input: pill-shaped, filters by `agentName` (client-side)
- Refresh button: re-triggers `agentScanCache.ensure()`

### Card grid

Retains current grid layout. Data from `sortedAgentResults`:

- Card title: `agentName` from scan result
- Count badge: `count` value
- Bottom: "{count} 个技能" + folder open button (hover reveal)
- Cards with `count === 0` are hidden

### Drawer

Click card → right drawer opens with skill list.

- Data: `AgentScanResult.skills` (string array)
- Each row: skill name + action buttons (update, remove, open location)
- Open location: `agentScanResult.globalPath + '/' + skillName`
- Update/remove: use skill name directly with existing store methods

### Removed code

- `resolveAgentByPath()` function — no longer needed
- `groupedByAgent` computed — replaced by `sortedAgentResults`
- `agentNameMap` / `agentPathMap` — data comes directly from `AgentScanResult`

---

## Section 5: Visual Design Alignment

All UI follows the design system defined in AGENTS.md:

| Element | Design Token |
|---------|-------------|
| Search input | bg `canvas`, border `hairline`, focus `brand-blue-deep`, radius `full` |
| Agent tags | bg `brand-blue-200`, text `brand-blue-deep`, radius `full`, font `micro` |
| Action buttons | `rounded-full`, ghost/tertiary style |
| List row borders | `1px solid hairline-soft` (`#eaecf0`) |
| Row hover bg | `surface` (`#f7f8fa`) |
| Hover elevation | Level 1: `rgba(0,0,0,0.04) 0 1px 2px` |
| Card style | bg `canvas`, radius `xl` (16px), border `1px solid hairline` |
| Skill name font | `body-sm-medium` (14px/500) |
| Count/badge font | `micro` (12px/400) |
| Header bg | `surface`, bottom border `hairline` |
| No heavy shadows | Flat-with-borders default |
| No gradients | Per design system do's/don'ts |

---

## Files Changed Summary

| Action | File |
|--------|------|
| **New** | `src/main/services/AgentScanner.ts` |
| **New** | `src/main/ipc/agents.ipc.ts` |
| **New** | `src/renderer/src/components/skills/SkillRow.vue` |
| **Modify** | `src/shared/types.ts` — add `AgentScanResult` |
| **Modify** | `src/preload/index.ts` — add `api.agents` namespace |
| **Modify** | `src/preload/index.d.ts` — add agents type declarations |
| **Modify** | `src/main/ipc/index.ts` — register agents IPC |
| **Modify** | `src/renderer/src/stores/skills.ts` — dual data source, enriched skills, search keyword |
| **Modify** | `src/renderer/src/views/InstalledList.vue` — list layout, search input, updated header |
| **Modify** | `src/renderer/src/views/AgentView.vue` — scan-based data, search header, simplified logic |
| **Modify** | `src/renderer/src/components/skills/AgentFilter.vue` — scan-based options |
| **Modify** | `src/renderer/src/components/skills/SkillCard.vue` — becomes unused, consider removal |
