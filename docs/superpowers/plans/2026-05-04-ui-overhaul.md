# UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 critical UI issues — search results as cards, settings in sidebar, rename menu, default global + agent filter, agent-centric view.

**Architecture:** Three-process Electron app (main/preload/renderer). Search moves from CLI to HTTP API. Settings moves from separate window to in-app route. New agent view groups skills by agent. All changes are renderer + main service layer.

**Tech Stack:** Electron, Vue 3 + TypeScript, Pinia, naive-ui, Node.js fetch

**Spec:** `docs/superpowers/specs/2026-05-03-ui-overhaul-design.md`

---

## File Structure

| Action | File                                                      | Responsibility                                 |
| ------ | --------------------------------------------------------- | ---------------------------------------------- |
| Modify | `src/shared/types.ts`                                     | Add search types + helpers                     |
| Modify | `src/main/services/SkillsService.ts`                      | Add `searchSkillsApi()`                        |
| Modify | `src/main/ipc/skills.ipc.ts`                              | Replace search handler with API                |
| Modify | `src/preload/index.ts`                                    | Update search API signature                    |
| Modify | `src/preload/index.d.ts`                                  | Update search type declaration                 |
| Modify | `src/renderer/src/stores/skills.ts`                       | Replace `searchOutput` with structured results |
| Modify | `src/renderer/src/components/skills/SkillSearchBar.vue`   | Remove debounce, add Enter/button trigger      |
| Modify | `src/renderer/src/views/SkillsSearch.vue`                 | Card list + duration display                   |
| Create | `src/renderer/src/components/skills/SearchResultCard.vue` | Individual search result card                  |
| Modify | `src/renderer/src/views/InstalledList.vue`                | Default global tab + agent filter              |
| Create | `src/renderer/src/views/AgentView.vue`                    | Agent-centric skills view                      |
| Modify | `src/renderer/src/App.vue`                                | Sidebar restructuring                          |
| Modify | `src/renderer/src/router/index.ts`                        | Add agent-view route                           |

---

### Task 1: Add Search Types and Helpers

**Files:**

- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add search-related types and helper functions**

Add to end of `src/shared/types.ts`:

```ts
export interface SkillSearchResult {
  id: string
  skillId: string
  name: string
  installs: number
  source: string
}

export interface SkillSearchResponse {
  query: string
  searchType: string
  skills: SkillSearchResult[]
  count: number
  duration_ms: number
}

export function toPackageRef(id: string): string {
  const lastSlash = id.lastIndexOf('/')
  return id.substring(0, lastSlash) + '@' + id.substring(lastSlash + 1)
}

export function formatInstalls(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add SkillSearchResult types and helper functions"
```

---

### Task 2: Add API-based Search in Main Process

**Files:**

- Modify: `src/main/services/SkillsService.ts`
- Modify: `src/main/ipc/skills.ipc.ts`

- [ ] **Step 1: Add `searchSkillsApi` function to SkillsService**

Add to end of `src/main/services/SkillsService.ts`:

```ts
export async function searchSkillsApi(
  keyword: string
): Promise<import('../../shared/types').SkillSearchResponse> {
  const url = `https://skills.sh/api/search?q=${encodeURIComponent(keyword)}&limit=10`
  const response = await fetch(url)
  if (!response.ok) {
    throw new SkillsError('EXECUTION_FAILED', 'find', `HTTP ${response.status}`, null)
  }
  return response.json() as Promise<import('../../shared/types').SkillSearchResponse>
}
```

- [ ] **Step 2: Update IPC handler to use API search**

In `src/main/ipc/skills.ipc.ts`, replace the `skills:search` handler:

```ts
ipcMain.handle('skills:search', async (_, keyword: string) => {
  return searchSkillsApi(keyword)
})
```

Also update the import at top of `skills.ipc.ts` to include `searchSkillsApi`:

```ts
import {
  searchSkillsApi,
  listSkills,
  installSkill,
  updateSkill,
  updateAllSkills,
  removeSkill
} from '../services/SkillsService'
```

Remove `searchSkills` from the import (no longer used).

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/main/services/SkillsService.ts src/main/ipc/skills.ipc.ts
git commit -m "feat: replace CLI search with skills.sh API"
```

---

### Task 3: Update Preload Layer

**Files:**

- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Update preload `index.ts` search API**

In `src/preload/index.ts`, change the `search` method in the `api` object:

```ts
search: (keyword: string): Promise<unknown> => ipcRenderer.invoke('skills:search', keyword),
```

(Remove the `: Promise<string>` type annotation since the return type changed from `string` to `SkillSearchResponse`.)

- [ ] **Step 2: Update preload type declaration**

In `src/preload/index.d.ts`:

1. Add import for new type at top:

```ts
import type {
  EnvStatus,
  Skill,
  AppSettings,
  CommandResult,
  SkillSearchResponse
} from '../shared/types'
```

2. Change the `search` method signature in the `AppApi` interface:

```ts
search: (keyword: string) => Promise<SkillSearchResponse>
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/preload/index.ts src/preload/index.d.ts
git commit -m "feat: update preload types for API-based search"
```

---

### Task 4: Update Skills Store

**Files:**

- Modify: `src/renderer/src/stores/skills.ts`

- [ ] **Step 1: Replace `searchOutput` with structured state**

Full replacement of `src/renderer/src/stores/skills.ts`:

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Skill, CommandResult, SkillSearchResult } from '../../../shared/types'

export const useSkillsStore = defineStore('skills', () => {
  const searchResults = ref<SkillSearchResult[]>([])
  const searchDuration = ref(0)
  const installedSkills = ref<Skill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function clearError(): void {
    error.value = null
  }

  async function search(keyword: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await window.api.skills.search(keyword)
      searchResults.value = response.skills
      searchDuration.value = response.duration_ms
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed'
      searchResults.value = []
      searchDuration.value = 0
    } finally {
      loading.value = false
    }
  }

  async function fetchInstalled(global?: boolean, agent?: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      installedSkills.value = await window.api.skills.list({ global, agent })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load skills'
    } finally {
      loading.value = false
    }
  }

  async function install(
    packageRef: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.install({ packageRef, agents, global: isGlobal })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Install failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(packageRef: string, global?: boolean): Promise<CommandResult> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.update({ packageRef, global })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateAll(global?: boolean): Promise<CommandResult> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.updateAll({ global })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update all failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(packageRef: string): Promise<CommandResult> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.remove({ packageRef })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Remove failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    searchResults,
    searchDuration,
    installedSkills,
    loading,
    error,
    clearError,
    search,
    fetchInstalled,
    install,
    update,
    updateAll,
    remove
  }
})
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/skills.ts
git commit -m "feat: update skills store with structured search results"
```

---

### Task 5: Update SkillSearchBar — Enter/Button Trigger

**Files:**

- Modify: `src/renderer/src/components/skills/SkillSearchBar.vue`

- [ ] **Step 1: Replace debounce with Enter/button trigger**

Full replacement of `src/renderer/src/components/skills/SkillSearchBar.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { NInput, NButton, NSpace } from 'naive-ui'

const keyword = ref('')
const emit = defineEmits<{ (e: 'search', keyword: string): void }>()

function handleSearch(): void {
  if (keyword.value.trim()) emit('search', keyword.value.trim())
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') handleSearch()
}
</script>

<template>
  <NSpace align="center">
    <NInput
      :value="keyword"
      placeholder="搜索技能..."
      clearable
      style="flex: 1"
      @input="(v: string) => (keyword = v)"
      @keydown="handleKeydown"
      @clear="keyword = ''"
    />
    <NButton type="primary" @click="handleSearch">搜索</NButton>
  </NSpace>
</template>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/skills/SkillSearchBar.vue
git commit -m "feat: search bar - Enter/button trigger instead of debounce"
```

---

### Task 6: Create SearchResultCard Component

**Files:**

- Create: `src/renderer/src/components/skills/SearchResultCard.vue`

- [ ] **Step 1: Create the search result card component**

Create `src/renderer/src/components/skills/SearchResultCard.vue`:

```vue
<script setup lang="ts">
import { NCard, NButton, NText, NSpace, NTag } from 'naive-ui'
import type { SkillSearchResult } from '../../../../shared/types'
import { toPackageRef, formatInstalls } from '../../../../shared/types'

const props = defineProps<{ result: SkillSearchResult }>()
const emit = defineEmits<{ (e: 'install', packageRef: string): void }>()

const packageRef = toPackageRef(props.result.id)
const detailUrl = `https://skills.sh/${props.result.id}`
</script>

<template>
  <NCard size="small" hoverable style="margin-bottom: 12px">
    <NSpace justify="space-between" align="center">
      <NSpace vertical :size="4">
        <NSpace align="center" :size="8">
          <NText strong style="font-size: 15px">{{ result.name }}</NText>
          <NTag :bordered="false" type="info" size="small">
            {{ formatInstalls(result.installs) }} 次下载
          </NTag>
        </NSpace>
        <NText depth="3" code style="font-size: 12px">{{ packageRef }}</NText>
        <a :href="detailUrl" target="_blank" style="font-size: 12px; color: #4fc3f7">
          {{ detailUrl }}
        </a>
      </NSpace>
      <NButton type="primary" size="small" @click="emit('install', packageRef)"> 安装 </NButton>
    </NSpace>
  </NCard>
</template>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/skills/SearchResultCard.vue
git commit -m "feat: add SearchResultCard component"
```

---

### Task 7: Update SkillsSearch View

**Files:**

- Modify: `src/renderer/src/views/SkillsSearch.vue`

- [ ] **Step 1: Replace terminal output with card list + duration**

Full replacement of `src/renderer/src/views/SkillsSearch.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { NSpin, NEmpty, NText } from 'naive-ui'
import { useSkillsStore } from '@renderer/stores/skills'
import SkillSearchBar from '@renderer/components/skills/SkillSearchBar.vue'
import SearchResultCard from '@renderer/components/skills/SearchResultCard.vue'
import SkillInstallDialog from '@renderer/components/skills/SkillInstallDialog.vue'

const skillsStore = useSkillsStore()
const showInstallDialog = ref(false)
const selectedPackage = ref('')
const hasSearched = ref(false)

function handleSearch(keyword: string): void {
  hasSearched.value = true
  skillsStore.search(keyword)
}

function handleInstall(packageRef: string): void {
  selectedPackage.value = packageRef
  showInstallDialog.value = true
}

function handleInstallComplete(): void {
  showInstallDialog.value = false
  selectedPackage.value = ''
}
</script>

<template>
  <div class="search-page">
    <SkillSearchBar @search="handleSearch" />
    <NSpin :show="skillsStore.loading" style="margin-top: 16px">
      <div v-if="hasSearched && !skillsStore.loading">
        <NText depth="3" style="font-size: 12px">
          搜索耗时 {{ (skillsStore.searchDuration / 1000).toFixed(1) }} 秒，共
          {{ skillsStore.searchResults.length }} 个结果
        </NText>
        <div style="margin-top: 12px">
          <SearchResultCard
            v-for="result in skillsStore.searchResults"
            :key="result.id"
            :result="result"
            @install="handleInstall"
          />
        </div>
        <NEmpty
          v-if="skillsStore.searchResults.length === 0"
          description="无搜索结果"
          style="margin-top: 48px"
        />
      </div>
      <NEmpty v-else-if="!hasSearched" description="输入关键词搜索技能" style="margin-top: 48px" />
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

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/SkillsSearch.vue
git commit -m "feat: search view with card layout and duration display"
```

---

### Task 8: Sidebar Restructuring + Route

**Files:**

- Modify: `src/renderer/src/App.vue`
- Modify: `src/renderer/src/router/index.ts`

- [ ] **Step 1: Update App.vue sidebar**

Full replacement of `src/renderer/src/App.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NLayout, NLayoutSider, NMenu, NMessageProvider, NConfigProvider } from 'naive-ui'
import { useRouter, useRoute } from 'vue-router'
import type { MenuOption } from 'naive-ui'

const router = useRouter()
const route = useRoute()

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'

const menuOptions: MenuOption[] = [
  { label: '技能', key: 'installed' },
  { label: '搜索', key: 'search' },
  { label: 'Agent 视图', key: 'agent-view' },
  { type: 'divider', key: 'd1' },
  { label: '设置', key: 'settings' }
]

function handleMenuUpdate(key: string): void {
  router.push({ name: key })
}

const activeKey = computed(() => route.name as string)
</script>

<template>
  <NConfigProvider>
    <NMessageProvider>
      <div v-if="windowType === 'main'" class="app-shell">
        <NLayout has-sider>
          <NLayoutSider bordered :width="180" :collapsed-width="0" collapse-mode="width">
            <div class="sidebar-header" style="padding: 16px; font-weight: 600; font-size: 14px">
              NPX Skills
            </div>
            <NMenu :options="menuOptions" :value="activeKey" @update:value="handleMenuUpdate" />
          </NLayoutSider>
          <NLayout>
            <div style="padding: 24px; overflow-y: auto; height: 100vh">
              <router-view />
            </div>
          </NLayout>
        </NLayout>
      </div>
      <div v-else-if="windowType === 'env'">
        <router-view />
      </div>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.app-shell {
  height: 100vh;
}
.sidebar-header {
  border-bottom: 1px solid var(--n-border-color);
}
</style>
```

Changes from original:

- Removed `NButton` import
- Removed `openSettings` function
- Menu: "已安装" → "技能", added "Agent 视图", added divider, added "设置"
- Removed bottom settings button div
- Removed `v-else-if="windowType === 'settings'"` block

- [ ] **Step 2: Add agent-view route**

In `src/renderer/src/router/index.ts`, add route for agent-view:

```ts
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'installed', component: () => import('../views/InstalledList.vue') },
  { path: '/search', name: 'search', component: () => import('../views/SkillsSearch.vue') },
  {
    path: '/skill/:packageRef',
    name: 'skill-detail',
    component: () => import('../views/SkillDetail.vue'),
    props: true
  },
  { path: '/agent-view', name: 'agent-view', component: () => import('../views/AgentView.vue') },
  { path: '/env', name: 'env', component: () => import('../views/EnvDetection.vue') },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/App.vue src/renderer/src/router/index.ts
git commit -m "feat: restructure sidebar - add agent view, move settings to menu"
```

---

### Task 9: Update InstalledList — Default Global + Agent Filter

**Files:**

- Modify: `src/renderer/src/views/InstalledList.vue`

- [ ] **Step 1: Update InstalledList with global default and agent filter**

Full replacement of `src/renderer/src/views/InstalledList.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref, h, watch } from 'vue'
import {
  NDataTable,
  NButton,
  NSpace,
  NTabPane,
  NTabs,
  NEmpty,
  NSpin,
  NSelect,
  useMessage
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useSkillsStore } from '../stores/skills'
import { AGENTS } from '../constants/agents'
import type { Skill } from '../../../shared/types'

const skillsStore = useSkillsStore()
const message = useMessage()
const currentTab = ref('global')
const selectedAgent = ref<string | null>(null)

const agentOptions = [
  { label: '全部', value: null },
  ...AGENTS.map((a) => ({ label: a.name, value: a.agentFlag }))
]

async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled(currentTab.value === 'global', selectedAgent.value ?? undefined)
}

onMounted(() => loadSkills())

watch(selectedAgent, () => loadSkills())

async function handleUpdateAll(): Promise<void> {
  const result = await skillsStore.updateAll(currentTab.value === 'global')
  if (result.success) {
    message.success('更新成功')
    loadSkills()
  } else {
    message.error('更新失败: ' + (result.stderr || '未知错误'))
  }
}

async function handleUpdate(name: string): Promise<void> {
  const result = await skillsStore.update(name, currentTab.value === 'global')
  if (result.success) {
    message.success(`${name} 更新成功`)
    loadSkills()
  } else {
    message.error(`${name} 更新失败`)
  }
}

async function handleRemove(name: string): Promise<void> {
  if (!window.confirm(`确定删除 ${name}? 此操作不可撤销`)) return
  const result = await skillsStore.remove(name)
  if (result.success) {
    message.success(`${name} 已删除`)
    loadSkills()
  } else {
    message.error(`${name} 删除失败`)
  }
}

const columns: DataTableColumns<Skill> = [
  { title: '名称', key: 'name' },
  { title: '版本', key: 'version', width: 100 },
  { title: '来源', key: 'source', ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row: Skill) {
      return h(NSpace, { size: 'small' }, () => [
        h(NButton, { size: 'small', onClick: () => handleUpdate(row.name) }, () => '更新'),
        h(
          NButton,
          { size: 'small', type: 'error', onClick: () => handleRemove(row.name) },
          () => '删除'
        )
      ])
    }
  }
]
</script>

<template>
  <div class="list-page">
    <div class="list-header">
      <NTabs v-model:value="currentTab" @update:value="loadSkills">
        <NTabPane name="global" tab="全局技能" />
        <NTabPane name="project" tab="项目技能" />
      </NTabs>
      <NSpace align="center" :size="12">
        <NSelect
          v-model:value="selectedAgent"
          :options="agentOptions"
          placeholder="筛选 Agent"
          clearable
          style="width: 200px"
        />
        <NButton
          type="primary"
          size="small"
          :loading="skillsStore.loading"
          @click="handleUpdateAll"
        >
          全部更新
        </NButton>
      </NSpace>
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
.list-page {
  max-width: 900px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
```

Changes from original:

- Default tab: `'project'` → `'global'`
- Tab order: "项目技能" first → "全局技能" first
- Added `NSelect` agent filter with all agents from `AGENTS` constant
- Added `watch(selectedAgent)` to reload on filter change
- `fetchInstalled` now passes `agent` param
- Removed `NTabPane` for "项目技能" being first (order swapped)

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/InstalledList.vue
git commit -m "feat: default global skills tab + agent filter dropdown"
```

---

### Task 10: Create Agent View

**Files:**

- Create: `src/renderer/src/views/AgentView.vue`

- [ ] **Step 1: Create AgentView component**

Create `src/renderer/src/views/AgentView.vue`:

```vue
<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { NCollapse, NCollapseItem, NEmpty, NSpin, NTag, NText, NSpace } from 'naive-ui'
import { useSkillsStore } from '@renderer/stores/skills'
import { AGENTS } from '@renderer/constants/agents'
import type { Skill } from '../../../shared/types'

const skillsStore = useSkillsStore()

const agentNameMap = new Map(AGENTS.map((a) => [a.agentFlag, a.name]))

const groupedByAgent = computed(() => {
  const map = new Map<string, Skill[]>()
  for (const skill of skillsStore.installedSkills) {
    for (const agent of skill.agents) {
      if (!map.has(agent)) map.set(agent, [])
      map.get(agent)!.push(skill)
    }
  }
  return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length))
})

function getAgentName(agentFlag: string): string {
  return agentNameMap.get(agentFlag) || agentFlag
}

onMounted(() => {
  skillsStore.fetchInstalled(true)
})
</script>

<template>
  <div class="agent-view">
    <NSpin :show="skillsStore.loading">
      <NCollapse v-if="groupedByAgent.size > 0">
        <NCollapseItem
          v-for="[agent, skills] in groupedByAgent"
          :key="agent"
          :title="getAgentName(agent)"
          :name="agent"
        >
          <template #header-extra>
            <NTag size="small" :bordered="false">{{ skills.length }}</NTag>
          </template>
          <div v-for="skill in skills" :key="skill.name" class="skill-row">
            <NSpace justify="space-between" align="center">
              <NSpace vertical :size="2">
                <NText strong>{{ skill.name }}</NText>
                <NText depth="3" style="font-size: 12px">{{ skill.source }}</NText>
              </NSpace>
              <NText depth="3" style="font-size: 12px">v{{ skill.version }}</NText>
            </NSpace>
          </div>
        </NCollapseItem>
      </NCollapse>
      <NEmpty v-else description="暂无已安装的技能" style="margin-top: 48px" />
    </NSpin>
  </div>
</template>

<style scoped>
.agent-view {
  max-width: 900px;
}
.skill-row {
  padding: 8px 0;
  border-bottom: 1px solid var(--n-border-color);
}
.skill-row:last-child {
  border-bottom: none;
}
</style>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "feat: add AgentView - agent-centric skills display"
```

---

### Task 11: Final Verification

**Files:**

- None (verification only)

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS (both node and web compilations)

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (no errors)

- [ ] **Step 3: Run dev build to verify**

Run: `npm run dev`
Expected: App starts, sidebar shows 技能/搜索/Agent 视图/设置, all routes work
