# UI Overhaul Design - 5 Critical Fixes

## Background

The current app has 5 major issues that make it nearly unusable. This design addresses all of them.

## Issue 1: Search - App Store Card Layout

### Current Problem

- `SkillsSearch.vue` calls `skillsStore.search(keyword)` → `npx skills find <keyword>`
- Returns raw terminal text rendered via `CommandOutput.vue`
- No structured UI, no interactivity

### Official API (skills.sh)

**Endpoint**: `GET https://skills.sh/api/search?q=<keyword>&limit=<number>`

- `limit` max: 100

**Response**:

```json
{
  "query": "frontend-design",
  "searchType": "fuzzy",
  "skills": [
    {
      "id": "anthropics/skills/frontend-design",
      "skillId": "frontend-design",
      "name": "frontend-design",
      "installs": 363387,
      "source": "anthropics/skills"
    }
  ],
  "count": 10,
  "duration_ms": 5005
}
```

**Package ref conversion**: `id` → replace last `/` with `@`

- `anthropics/skills/frontend-design` → `anthropics/skills@frontend-design`

**Detail URL**: `https://skills.sh/{id}`

- `https://skills.sh/anthropics/skills/frontend-design`

### Design

**Shared Types** (`src/shared/types.ts`):

```ts
export interface SkillSearchResult {
  id: string // "anthropics/skills/frontend-design"
  skillId: string // "frontend-design"
  name: string // "frontend-design"
  installs: number // 363387
  source: string // "anthropics/skills"
}

export interface SkillSearchResponse {
  query: string
  searchType: string
  skills: SkillSearchResult[]
  count: number
  duration_ms: number
}

// Derived helper: convert id to package ref
// "anthropics/skills/frontend-design" → "anthropics/skills@frontend-design"
export function toPackageRef(id: string): string {
  const lastSlash = id.lastIndexOf('/')
  return id.substring(0, lastSlash) + '@' + id.substring(lastSlash + 1)
}

// Derived helper: format install count
export function formatInstalls(n: number): string
// 363387 → "363.4K", 1500 → "1.5K", <1000 → "1500"
```

**Service Layer** (`src/main/services/SkillsService.ts`):

- New function `searchSkillsApi(keyword: string): Promise<SkillSearchResponse>`
- Default `limit=10` (API sorts by installs descending, 10 is sufficient)
- Uses Node.js `fetch` (Electron main process) to call `https://skills.sh/api/search`
- No CLI dependency for search
- Keep existing `searchSkills()` (CLI-based) for fallback, or remove if unused

**IPC** (`src/main/ipc/skills.ipc.ts`):

- Replace `skills:search` handler to call `searchSkillsApi` instead of `searchSkills`
- Returns `SkillSearchResponse` (or just `SkillSearchResult[]`)

**Preload**: Update `search` API signature to return `SkillSearchResponse`

**Store** (`src/renderer/src/stores/skills.ts`):

- New state: `searchResults: ref<SkillSearchResult[]>([])`
- New state: `searchDuration: ref<number>(0)` (ms)
- Replace `searchOutput: ref<string>('')` with structured results
- New action: `search(keyword)` → calls API → populates `searchResults` and `searchDuration`

**Components**:

- New `src/renderer/src/components/skills/SearchResultCard.vue`:
  - Card-based layout using naive-ui `NCard` or custom styled div
  - Shows:
    - Skill name (bold, e.g. `frontend-design`)
    - Source / package ref (e.g. `anthropics/skills@frontend-design`)
    - Install count (formatted, e.g. `363.4K`)
    - Detail URL (clickable link to `https://skills.sh/{id}`)
    - Install button → opens `SkillInstallDialog`
  - Sorted by installs descending (API already returns sorted)

**Search Trigger Behavior** (`SkillSearchBar.vue`):

- Remove `useDebounceFn` auto-search on input
- Search only triggers on:
  1. Pressing Enter key
  2. Clicking a search button (add `NButton` with search icon)
- Input still updates `keyword` ref reactively, but does NOT trigger API call

**View** (`src/renderer/src/views/SkillsSearch.vue`):

- Replace `CommandOutput` with `SearchResultCard` grid/list
- Remove `CommandOutput` import (no longer needed for search)
- Show search duration: `搜索耗时 ${(searchDuration / 1000).toFixed(1)} 秒` below the search bar
- Show "输入关键词搜索技能" empty state when no search yet
- Show "无搜索结果" when `searchResults` is empty after search

---

## Issue 2: Settings - Move to Sidebar

### Current Problem

- Settings is a button at sidebar bottom that calls `window.api.window.openSettings()`
- This opens a new Electron window with `?window=settings` query param
- But the Vue router uses hash history (`#/`), so the new window defaults to `#/` → `InstalledList.vue`
- Result: settings window shows installed list content instead of settings

### Root Cause

`WindowManager.createSettingsWindow()` loads `?window=settings` but never navigates to `#/settings`. The hash router always starts at `#/`.

### Design

- Remove settings button from sidebar bottom
- Add "设置" as a regular menu item in `menuOptions`
- Navigate to `/settings` route in the same main window (no separate window)
- `App.vue` no longer needs special handling for `windowType === 'settings'`
- `SettingsView.vue` renders inside the main layout (with sidebar visible)
- Keep `WindowManager.createSettingsWindow()` code but unused (no deletion needed)

**App.vue sidebar**:

```ts
const menuOptions: MenuOption[] = [
  { label: '技能', key: 'installed' },
  { label: '搜索', key: 'search' },
  { label: 'Agent 视图', key: 'agent-view' },
  { type: 'divider' },
  { label: '设置', key: 'settings' }
]
```

**Router**: `/settings` already maps to `SettingsView.vue`, no route change needed.

---

## Issue 3: Rename "已安装" → "技能"

### Change

`App.vue` menuOptions: `{ label: '已安装', key: 'installed' }` → `{ label: '技能', key: 'installed' }`

One-line fix.

---

## Issue 4: Default Global Skills + Agent Filter

### Current Problem

- `InstalledList.vue` defaults to `currentTab = ref('project')` (project skills)
- No agent filtering capability

### Design

**Default tab change**:

- `currentTab` default: `'project'` → `'global'`

**Agent filter**:

- Add `NSelect` above the data table
- Options: `[{ label: '全部', value: '' }, ...AGENTS.map(a => ({ label: a.name, value: a.agentFlag }))]`
- When selected, pass `agent` param to `fetchInstalled({ global, agent })`
- State: `selectedAgent = ref('')` (default = all)

**Layout**:

```
[全局技能 | 项目技能]  [Agent: 全部 ▼]  [全部更新]
─────────────────────────────────────────────────
| 名称 | 版本 | 来源 | 操作 |
```

---

## Issue 5: Agent-Centric View

### Design

**New route**: `{ path: '/agent-view', name: 'agent-view', component: () => import('../views/AgentView.vue') }`

**New view** (`src/renderer/src/views/AgentView.vue`):

- On mount, fetch global skills via `fetchInstalled({ global: true })`
- Group skills by `skill.agents` array
- For each agent, render a collapsible section:
  - Header: agent display name + skill count badge
  - Body: simple list/table of skills under that agent
- Use `NCollapse` / `NCollapseItem` from naive-ui
- Agent display names resolved from `AGENTS` constant

**Store changes**:

- Reuse `fetchInstalled()` from skills store
- Add computed or method to group results by agent

**Grouping logic**:

```ts
const groupedByAgent = computed(() => {
  const map = new Map<string, Skill[]>()
  for (const skill of skillsStore.installedSkills) {
    for (const agent of skill.agents) {
      if (!map.has(agent)) map.set(agent, [])
      map.get(agent)!.push(skill)
    }
  }
  return map
})
```

---

## File Change Summary

| File                                                      | Change                                                    |
| --------------------------------------------------------- | --------------------------------------------------------- |
| `src/shared/types.ts`                                     | Add `SkillSearchResult`, `SkillSearchResponse`, helpers   |
| `src/main/services/SkillsService.ts`                      | Add `searchSkillsApi()` using HTTP fetch to skills.sh API |
| `src/main/ipc/skills.ipc.ts`                              | Replace `skills:search` to use API instead of CLI         |
| `src/preload/index.ts`                                    | Update `search` API return type                           |
| `src/preload/index.d.ts`                                  | Update `search` type signature                            |
| `src/renderer/src/stores/skills.ts`                       | Replace `searchOutput` with `searchResults` state         |
| `src/renderer/src/views/SkillsSearch.vue`                 | Replace CommandOutput with card list                      |
| `src/renderer/src/components/skills/SearchResultCard.vue` | **NEW** - search result card component                    |
| `src/renderer/src/views/InstalledList.vue`                | Default global tab + agent filter dropdown                |
| `src/renderer/src/views/AgentView.vue`                    | **NEW** - agent-centric skills view                       |
| `src/renderer/src/App.vue`                                | Sidebar: rename + add items + remove settings button      |
| `src/renderer/src/router/index.ts`                        | Add `/agent-view` route                                   |

## Sidebar Final Structure

```
技能
搜索
Agent 视图
─────────
设置
```

## Open Items

- None. All issues have confirmed solutions.
