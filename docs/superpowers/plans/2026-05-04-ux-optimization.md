# UX Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify loading animations, add caching for skills/agents views, and replace native confirm dialogs with styled Naive UI dialogs.

**Architecture:** Incremental improvement on existing Pinia stores. New `useCachedResource` composable provides generic cache logic. New `useConfirm` composable wraps Naive UI `useDialog`. Store loading states split from single boolean to granular flags. Route transitions use Vue `<Transition>`.

**Tech Stack:** Vue 3, Pinia, Naive UI, TypeScript

---

## File Structure

### New Files

| File                                                | Responsibility                                             |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `src/renderer/src/composables/useCachedResource.ts` | Generic cache composable (stale/invalidate/ensure pattern) |
| `src/renderer/src/composables/useConfirm.ts`        | Typed confirmation dialog helpers                          |
| `src/renderer/src/components/common/AppLoading.vue` | Global loading overlay (spinner + backdrop)                |

### Modified Files

| File                                                        | Change                                                                |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/renderer/src/assets/base.css`                          | Add fade transition CSS                                               |
| `src/renderer/src/stores/skills.ts`                         | Granular loading flags + cache integration                            |
| `src/renderer/src/stores/env.ts`                            | Rename `checking` → `fetching`, add cache                             |
| `src/renderer/src/stores/settings.ts`                       | Rename `loading` → `fetching`, add cache                              |
| `src/renderer/src/App.vue`                                  | Add `<Transition>`, `AppLoading`, `NDialogProvider`, navigation state |
| `src/renderer/src/router/index.ts`                          | Add navigation guards                                                 |
| `src/renderer/src/views/InstalledList.vue`                  | Use new loading flags + confirmation dialogs                          |
| `src/renderer/src/views/SkillsSearch.vue`                   | Use `fetching` instead of `loading`                                   |
| `src/renderer/src/views/AgentView.vue`                      | Remove onMounted fetch (cache handles it)                             |
| `src/renderer/src/views/EnvDetection.vue`                   | Use `fetching` instead of `checking`                                  |
| `src/renderer/src/views/SkillDetail.vue`                    | Confirmation dialogs + new loading flags                              |
| `src/renderer/src/components/skills/SkillInstallDialog.vue` | Install confirmation                                                  |

---

## Task 1: Add Fade Transition CSS

**Files:**

- Modify: `src/renderer/src/assets/base.css`

- [ ] **Step 1: Add fade transition classes to base.css**

Append to end of file:

```css
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

- [ ] **Step 2: Verify CSS file has no syntax errors**

Run: `npm run typecheck`
Expected: PASS (CSS changes don't affect typecheck, but confirms no build breakage)

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/assets/base.css
git commit -m "feat(ui): add fade transition CSS classes for route animations"
```

---

## Task 2: Create useCachedResource Composable

**Files:**

- Create: `src/renderer/src/composables/useCachedResource.ts`

- [ ] **Step 1: Create the composable file**

```typescript
import { ref, type Ref } from 'vue'

interface CacheState<T> {
  data: T
  timestamp: number
  stale: boolean
}

export function useCachedResource<T>(fetcher: () => Promise<T>, initialValue: T) {
  const cache = ref<CacheState<T> | null>(null) as Ref<CacheState<T> | null>
  const data = ref<T>(initialValue) as Ref<T>
  const loading = ref(false)
  const isStale = ref(true)

  async function ensure(): Promise<T> {
    if (cache.value && !cache.value.stale) {
      return cache.value.data
    }
    return refresh()
  }

  async function refresh(): Promise<T> {
    loading.value = true
    try {
      const result = await fetcher()
      data.value = result
      cache.value = { data: result, timestamp: Date.now(), stale: false }
      isStale.value = false
      return result
    } finally {
      loading.value = false
    }
  }

  function invalidate(): void {
    if (cache.value) {
      cache.value.stale = true
    }
    isStale.value = true
  }

  return { data, loading, isStale, ensure, invalidate, refresh }
}
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/composables/useCachedResource.ts
git commit -m "feat(cache): add useCachedResource composable for stale/invalidate pattern"
```

---

## Task 3: Create useConfirm Composable

**Files:**

- Create: `src/renderer/src/composables/useConfirm.ts`

- [ ] **Step 1: Create the composable file**

```typescript
import { useDialog } from 'naive-ui'

export function useConfirm() {
  const dialog = useDialog()

  function confirmInstall(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.info({
        title: '安装确认',
        content: `确定要安装「${name}」技能？`,
        positiveText: '确认安装',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }

  function confirmUpdate(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.info({
        title: '更新确认',
        content: `确定要更新「${name}」技能？`,
        positiveText: '确认更新',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }

  function confirmRemove(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.warning({
        title: '删除确认',
        content: `确定要删除「${name}」技能？此操作不可撤销。`,
        positiveText: '确认删除',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }

  function confirmUpdateAll(names: string[]): Promise<boolean> {
    const maxShow = 10
    const displayed = names.slice(0, maxShow).join('、')
    const suffix =
      names.length > maxShow ? `\n...等 ${names.length} 个技能` : `\n共 ${names.length} 个技能`
    const content = `确定要更新以下技能？\n${displayed}${suffix}`

    return new Promise((resolve) => {
      dialog.info({
        title: '全部更新确认',
        content,
        positiveText: '确认更新',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }

  return { confirmInstall, confirmUpdate, confirmRemove, confirmUpdateAll }
}
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/composables/useConfirm.ts
git commit -m "feat(ui): add useConfirm composable for typed confirmation dialogs"
```

---

## Task 4: Create AppLoading Component

**Files:**

- Create: `src/renderer/src/components/common/AppLoading.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { NSpin } from 'naive-ui'

defineProps<{ show: boolean }>()
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="app-loading-overlay">
      <NSpin size="large" />
    </div>
  </Transition>
</template>

<style scoped>
.app-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
</style>
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/common/AppLoading.vue
git commit -m "feat(ui): add AppLoading global overlay component"
```

---

## Task 5: Refactor Skills Store — Granular Loading + Cache

**Files:**

- Modify: `src/renderer/src/stores/skills.ts`

- [ ] **Step 1: Rewrite the entire store with granular loading flags and cache integration**

Replace the entire content of `src/renderer/src/stores/skills.ts` with:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Skill, CommandResult, SkillSearchResult } from '../../../shared/types'
import { useCachedResource } from '../composables/useCachedResource'

export const useSkillsStore = defineStore('skills', () => {
  const installedCache = useCachedResource<Skill[]>(
    () => window.api.skills.list({ global: true }),
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

  async function search(keyword: string): Promise<void> {
    searching.value = true
    error.value = null
    try {
      const response = await window.api.skills.search(keyword)
      _searchResults.value = response.skills
      _searchDuration.value = response.duration_ms
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed'
      _searchResults.value = []
      _searchDuration.value = 0
    } finally {
      searching.value = false
    }
  }

  async function fetchInstalled(global?: boolean): Promise<void> {
    if (global !== false) {
      await installedCache.ensure()
    } else {
      const result = await window.api.skills.list({ global })
      installedCache.data.value = result
    }
  }

  async function install(
    packageRef: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
    installing.value = true
    error.value = null
    try {
      const result = await window.api.skills.install({ packageRef, agents, global: isGlobal })
      installedCache.invalidate()
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Install failed'
      throw e
    } finally {
      installing.value = false
    }
  }

  async function update(packageRef: string, global?: boolean): Promise<CommandResult> {
    updating.value = true
    error.value = null
    try {
      const result = await window.api.skills.update({ packageRef, global })
      installedCache.invalidate()
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update failed'
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
      installedCache.invalidate()
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update all failed'
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
      installedCache.invalidate()
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Remove failed'
      throw e
    } finally {
      removing.value = false
    }
  }

  async function openLocation(path: string): Promise<void> {
    try {
      await window.api.shell.openPath(path)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to open location'
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
    search,
    fetchInstalled,
    install,
    update,
    updateAll,
    remove,
    openLocation
  }
})
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/skills.ts
git commit -m "refactor(store): split skills store loading into granular flags + add cache"
```

---

## Task 6: Refactor Env Store — Cache Integration

**Files:**

- Modify: `src/renderer/src/stores/env.ts`

- [ ] **Step 1: Rewrite the env store with cache**

Replace the entire content of `src/renderer/src/stores/env.ts` with:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EnvStatus } from '../../../shared/types'
import { useCachedResource } from '../composables/useCachedResource'

export const useEnvStore = defineStore('env', () => {
  const statusCache = useCachedResource<EnvStatus>(() => window.api.env.check(), {
    nodeInstalled: false,
    nodeVersion: null,
    npxInstalled: false,
    skillsInstalled: false
  })

  const downloading = ref(false)
  const downloadProgress = ref(0)
  const error = ref<string | null>(null)

  const status = computed(() => statusCache.data.value)
  const fetching = computed(() => statusCache.loading.value)
  const checking = fetching

  async function check(): Promise<void> {
    try {
      await statusCache.ensure()
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Environment check failed'
    }
  }

  async function installNode(): Promise<void> {
    downloading.value = true
    downloadProgress.value = 0
    error.value = null
    try {
      const result = await window.api.env.installNode()
      if (!result.success) throw new Error(result.error)
      statusCache.invalidate()
      await check()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Node.js install failed'
    } finally {
      downloading.value = false
    }
  }

  return {
    status,
    fetching,
    checking,
    downloading,
    downloadProgress,
    error,
    check,
    installNode
  }
})
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/env.ts
git commit -m "refactor(store): add cache to env store, alias checking as fetching"
```

---

## Task 7: Refactor Settings Store — Cache Integration

**Files:**

- Modify: `src/renderer/src/stores/settings.ts`

- [ ] **Step 1: Rewrite the settings store with cache**

> **Note:** `defaultAgent` and `autoCheckEnv` must remain writable `ref` (not computed) because `SettingsView.vue` uses `v-model` binding on them directly. The cache is used internally to avoid redundant IPC calls.

Replace the entire content of `src/renderer/src/stores/settings.ts` with:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCachedResource } from '../composables/useCachedResource'

export const useSettingsStore = defineStore('settings', () => {
  const settingsCache = useCachedResource(() => window.api.store.getSettings(), {
    defaultAgent: 'claude-code',
    autoCheckEnv: true
  })

  const defaultAgent = ref('claude-code')
  const autoCheckEnv = ref(true)
  const error = ref<string | null>(null)
  const fetching = computed(() => settingsCache.loading.value)
  const loading = fetching

  async function load(): Promise<void> {
    try {
      const data = await settingsCache.ensure()
      defaultAgent.value = data.defaultAgent
      autoCheckEnv.value = data.autoCheckEnv
      error.value = null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load settings'
    }
  }

  async function save(partial: { defaultAgent?: string; autoCheckEnv?: boolean }): Promise<void> {
    try {
      await window.api.store.setSettings(partial)
      settingsCache.invalidate()
      await load()
      error.value = null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to save settings'
      throw e
    }
  }

  return { defaultAgent, autoCheckEnv, loading, fetching, error, load, save }
})
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: May fail if `settingsCache.data.value` type doesn't match. Fix type assertions if needed.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/settings.ts
git commit -m "refactor(store): add cache to settings store"
```

---

## Task 8: Add Navigation State to Router

**Files:**

- Modify: `src/renderer/src/router/index.ts`

- [ ] **Step 1: Add navigation guards**

Replace the entire content of `src/renderer/src/router/index.ts` with:

```typescript
import { createRouter, createWebHashHistory } from 'vue-router'
import { ref } from 'vue'

export const isNavigating = ref(false)

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

router.beforeEach(() => {
  isNavigating.value = true
})

router.afterEach(() => {
  isNavigating.value = false
})
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/router/index.ts
git commit -m "feat(router): add navigation state for global loading indicator"
```

---

## Task 9: Update App.vue — Transitions, Loading Overlay, Dialog Provider

**Files:**

- Modify: `src/renderer/src/App.vue`

- [ ] **Step 1: Rewrite App.vue with all new providers and transitions**

Replace the entire content of `src/renderer/src/App.vue` with:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import {
  NLayout,
  NLayoutSider,
  NMenu,
  NMessageProvider,
  NConfigProvider,
  NDialogProvider
} from 'naive-ui'
import { useRouter, useRoute } from 'vue-router'
import type { MenuOption } from 'naive-ui'
import AppLoading from './components/common/AppLoading.vue'
import { isNavigating } from './router'
import { useSkillsStore } from './stores/skills'

const router = useRouter()
const route = useRoute()
const skillsStore = useSkillsStore()

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

const showGlobalLoading = computed(() => isNavigating.value || skillsStore.fetching.value)
</script>

<template>
  <NConfigProvider>
    <NDialogProvider>
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
                <Transition name="fade" mode="out-in">
                  <router-view />
                </Transition>
              </div>
            </NLayout>
          </NLayout>
          <AppLoading :show="showGlobalLoading" />
        </div>
        <div v-else-if="windowType === 'env'">
          <router-view />
        </div>
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>

<style scoped>
.app-shell {
  height: 100vh;
  position: relative;
}
.sidebar-header {
  border-bottom: 1px solid var(--n-border-color);
}
</style>
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/App.vue
git commit -m "feat(ui): add route transition, global loading overlay, and dialog provider"
```

---

## Task 10: Update InstalledList.vue — New Loading Flags + Confirmation Dialogs

**Files:**

- Modify: `src/renderer/src/views/InstalledList.vue`

- [ ] **Step 1: Rewrite with granular loading and confirmation dialogs**

Replace the entire content of `src/renderer/src/views/InstalledList.vue` with:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { NButton, NEmpty, NSpin, NSpace, NText } from 'naive-ui'
import { useSkillsStore } from '../stores/skills'
import { useConfirm } from '../composables/useConfirm'
import { useMessage } from 'naive-ui'
import AgentFilter from '../components/skills/AgentFilter.vue'
import SkillCard from '../components/skills/SkillCard.vue'

const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdateAll, confirmUpdate, confirmRemove } = useConfirm()

async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled(true)
}

onMounted(() => loadSkills())

async function handleUpdateAll(): Promise<void> {
  const names = skillsStore.installedSkills.map((s) => s.name)
  if (names.length === 0) {
    message.info('没有可更新的技能')
    return
  }
  const confirmed = await confirmUpdateAll(names)
  if (!confirmed) return
  try {
    const result = await skillsStore.updateAll(true)
    if (result.success) {
      message.success('更新成功')
      await loadSkills()
    } else {
      message.error('更新失败: ' + (result.stderr || '未知错误'))
    }
  } catch {
    message.error('更新失败')
  }
}

async function handleUpdate(name: string): Promise<void> {
  const confirmed = await confirmUpdate(name)
  if (!confirmed) return
  try {
    const result = await skillsStore.update(name, true)
    if (result.success) {
      message.success(`${name} 更新成功`)
      await loadSkills()
    } else {
      message.error(`${name} 更新失败`)
    }
  } catch {
    message.error(`${name} 更新失败`)
  }
}

async function handleRemove(name: string): Promise<void> {
  const confirmed = await confirmRemove(name)
  if (!confirmed) return
  try {
    const result = await skillsStore.remove(name, true)
    if (result.success) {
      message.success(`${name} 已删除`)
      await loadSkills()
    } else {
      message.error(`${name} 删除失败`)
    }
  } catch {
    message.error(`${name} 删除失败`)
  }
}

function handleOpenLocation(path: string): void {
  skillsStore.openLocation(path)
}
</script>

<template>
  <div class="list-page">
    <div class="list-header">
      <NText class="count-text">{{ skillsStore.filteredSkills.length }} 个技能</NText>
      <NSpace align="center" :size="12">
        <AgentFilter v-model="skillsStore.selectedAgents" />
        <NButton
          type="primary"
          size="small"
          :loading="skillsStore.updatingAll"
          @click="handleUpdateAll"
        >
          全部更新
        </NButton>
      </NSpace>
    </div>
    <NSpin :show="skillsStore.fetching">
      <div v-if="skillsStore.filteredSkills.length > 0" class="card-grid">
        <SkillCard
          v-for="skill in skillsStore.filteredSkills"
          :key="skill.name"
          :skill="skill"
          @update="handleUpdate"
          @remove="handleRemove"
          @open-location="handleOpenLocation"
        />
      </div>
      <NEmpty
        v-else-if="!skillsStore.fetching"
        description="暂无已安装的技能"
        style="margin-top: 48px"
      />
    </NSpin>
  </div>
</template>

<style scoped>
.list-page {
  max-width: 960px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.count-text {
  font-size: 14px;
  font-weight: 500;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
</style>
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/InstalledList.vue
git commit -m "feat(ui): update InstalledList with confirmation dialogs and granular loading"
```

---

## Task 11: Update SkillsSearch.vue — Use Searching Flag

**Files:**

- Modify: `src/renderer/src/views/SkillsSearch.vue`

- [ ] **Step 1: Update loading reference from `loading` to `searching`**

Replace the entire content of `src/renderer/src/views/SkillsSearch.vue` with:

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
    <NSpin :show="skillsStore.searching" style="margin-top: 16px">
      <div v-if="hasSearched && !skillsStore.searching">
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

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/SkillsSearch.vue
git commit -m "refactor(search): use searching flag instead of shared loading"
```

---

## Task 12: Update AgentView.vue — Remove Redundant onMounted Fetch

**Files:**

- Modify: `src/renderer/src/views/AgentView.vue`

- [ ] **Step 1: Remove onMounted fetch (cache handles data) and use `fetching` flag**

Replace the entire content of `src/renderer/src/views/AgentView.vue` with:

```vue
<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <div class="agent-view">
    <NSpin :show="skillsStore.fetching">
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

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "refactor(agent-view): remove onMounted fetch, rely on cache"
```

---

## Task 13: Update EnvDetection.vue — Use Fetching Flag

**Files:**

- Modify: `src/renderer/src/views/EnvDetection.vue`

- [ ] **Step 1: Update to use `fetching` flag (keeping `checking` backward compat via store alias)**

Replace the entire content of `src/renderer/src/views/EnvDetection.vue` with:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NButton, NSpace, NText, NSpin, NProgress } from 'naive-ui'
import { useEnvStore } from '../stores/env'

const envStore = useEnvStore()
const downloading = ref(false)
const downloadProgress = ref(0)

onMounted(() => envStore.check())

function closeWindow(): void {
  window.close()
}

async function handleInstallNode(): Promise<void> {
  downloading.value = true
  const cleanup = window.api.env.onDownloadProgress((percent) => {
    downloadProgress.value = percent
  })
  try {
    await window.api.env.installNode()
    await envStore.check()
  } finally {
    downloading.value = false
    cleanup()
  }
}
</script>

<template>
  <div class="env-page">
    <NCard title="环境检测">
      <NSpin :show="envStore.checking">
        <NSpace vertical size="large">
          <NText :type="envStore.status?.nodeInstalled ? 'success' : 'error'">
            {{ envStore.status?.nodeInstalled ? '✓' : '✗' }} Node.js
            {{ envStore.status?.nodeVersion || '' }}
          </NText>
          <NText :type="envStore.status?.npxInstalled ? 'success' : 'error'">
            {{ envStore.status?.npxInstalled ? '✓' : '✗' }} npx
          </NText>
          <NText :type="envStore.status?.skillsInstalled ? 'success' : 'error'">
            {{ envStore.status?.skillsInstalled ? '✓' : '✗' }} npx skills
          </NText>
        </NSpace>
      </NSpin>

      <div v-if="!envStore.status?.nodeInstalled" style="margin-top: 16px">
        <NProgress v-if="downloading" :percentage="downloadProgress" indicator-placement="inside" />
        <NButton v-else type="primary" :loading="downloading" @click="handleInstallNode">
          下载并安装 Node.js
        </NButton>
      </div>

      <NSpace justify="end" style="margin-top: 16px">
        <NButton @click="closeWindow">跳过</NButton>
        <NButton :loading="envStore.checking" @click="envStore.check()">重新检测</NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.env-page {
  padding: 24px;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

Note: `envStore.checking` still works because the env store exports `checking` as an alias for `fetching`. No view changes needed for this file beyond what's already compatible.

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

Only commit if actual changes were made (this file may not change since `checking` is still available).

---

## Task 14: Update SkillDetail.vue — Confirmation Dialogs + Loading Flags

**Files:**

- Modify: `src/renderer/src/views/SkillDetail.vue`

- [ ] **Step 1: Add confirmation dialogs and use granular loading flags**

Replace the entire content of `src/renderer/src/views/SkillDetail.vue` with:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NPageHeader,
  NButton,
  NSpace,
  NDescriptions,
  NDescriptionsItem,
  NText,
  useMessage
} from 'naive-ui'
import { useSkillsStore } from '../stores/skills'
import { useConfirm } from '../composables/useConfirm'
import SkillInstallDialog from '../components/skills/SkillInstallDialog.vue'
import CommandOutput from '../components/common/CommandOutput.vue'

const route = useRoute()
const router = useRouter()
const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdate, confirmRemove, confirmInstall } = useConfirm()

const packageRef = decodeURIComponent(route.params.packageRef as string)
const showInstallDialog = ref(false)
const operationOutput = ref('')
const operationLoading = ref(false)

async function handleUpdate(): Promise<void> {
  const confirmed = await confirmUpdate(packageRef)
  if (!confirmed) return
  operationLoading.value = true
  operationOutput.value = ''
  try {
    const result = await skillsStore.update(packageRef)
    operationOutput.value = result.stdout || result.stderr || ''
    if (result.success) message.success('更新成功')
    else message.error('更新失败')
  } finally {
    operationLoading.value = false
  }
}

async function handleRemove(): Promise<void> {
  const confirmed = await confirmRemove(packageRef)
  if (!confirmed) return
  operationLoading.value = true
  operationOutput.value = ''
  try {
    const result = await skillsStore.remove(packageRef)
    operationOutput.value = result.stdout || result.stderr || ''
    if (result.success) {
      message.success('删除成功')
      setTimeout(() => router.back(), 500)
    } else {
      message.error('删除失败')
    }
  } finally {
    operationLoading.value = false
  }
}

async function handleInstallClick(): Promise<void> {
  const confirmed = await confirmInstall(packageRef)
  if (!confirmed) return
  showInstallDialog.value = true
}
</script>

<template>
  <div class="detail-page">
    <NPageHeader @back="router.back()" :title="packageRef" subtitle="技能管理" />
    <NDescriptions bordered :column="1" label-placement="left" style="margin-top: 16px">
      <NDescriptionsItem label="包名">
        <NText code>{{ packageRef }}</NText>
      </NDescriptionsItem>
    </NDescriptions>
    <NSpace style="margin-top: 16px">
      <NButton type="primary" @click="handleInstallClick">安装到...</NButton>
      <NButton :loading="skillsStore.updating || operationLoading" @click="handleUpdate">
        更新
      </NButton>
      <NButton
        type="error"
        :loading="skillsStore.removing || operationLoading"
        @click="handleRemove"
      >
        删除
      </NButton>
    </NSpace>
    <div v-if="operationOutput" style="margin-top: 16px">
      <CommandOutput :content="operationOutput" />
    </div>
    <SkillInstallDialog
      v-model:show="showInstallDialog"
      :package-ref="packageRef"
      @complete="operationOutput = ''"
    />
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 900px;
}
</style>
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/SkillDetail.vue
git commit -m "feat(ui): add confirmation dialogs and granular loading to SkillDetail"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS with zero errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (fix any lint errors)

- [ ] **Step 3: Run dev build to verify no runtime errors**

Run: `npm run dev`
Expected: App starts, navigation works with fade transitions, loading overlay appears during data fetch, confirmation dialogs show on install/update/remove/update-all operations.
