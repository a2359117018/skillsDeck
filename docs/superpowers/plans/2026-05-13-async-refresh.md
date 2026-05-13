# Async Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor all refresh operations to use async callback pattern — no loading spinners on buttons, background fetch with toast notifications.

**Architecture:** Add `refreshing` state to `useCachedResource` composable alongside existing `loading`. `loading` only activates on first fetch (no cached data). `refreshing` tracks background refreshes. Stores expose `refreshing` for dedup. Views remove `:loading` bindings and add toast feedback.

**Tech Stack:** Vue 3 Composition API, Pinia, NaiveUI (useMessage), TypeScript

---

### Task 1: Refactor useCachedResource composable

**Files:**
- Modify: `src/renderer/src/composables/useCachedResource.ts`

- [ ] **Step 1: Add `refreshing` ref and refactor `refresh()` / `ensure()` logic**

Replace the entire file content with:

```typescript
import { ref, type Ref } from 'vue'

interface CacheState<T> {
  data: T
  timestamp: number
  stale: boolean
}

export function useCachedResource<T>(
  fetcher: () => Promise<T>,
  initialValue: T
): {
  data: Ref<T>
  loading: Ref<boolean>
  refreshing: Ref<boolean>
  isStale: Ref<boolean>
  ensure: () => Promise<T>
  invalidate: () => void
  refresh: () => Promise<T>
} {
  const cache = ref<CacheState<T> | null>(null) as Ref<CacheState<T> | null>
  const data = ref<T>(initialValue) as Ref<T>
  const loading = ref(false)
  const refreshing = ref(false)
  const isStale = ref(true)

  async function ensure(): Promise<T> {
    if (cache.value && !cache.value.stale) {
      return cache.value.data
    }
    return refresh()
  }

  async function refresh(): Promise<T> {
    if (refreshing.value) {
      return data.value
    }
    const hasData = cache.value !== null
    refreshing.value = true
    if (!hasData) {
      loading.value = true
    }
    try {
      const result = await fetcher()
      data.value = result
      cache.value = { data: result, timestamp: Date.now(), stale: false }
      isStale.value = false
      return result
    } catch (error) {
      console.error('Failed to refresh cached resource:', error)
      throw error
    } finally {
      refreshing.value = false
      loading.value = false
    }
  }

  function invalidate(): void {
    if (cache.value) {
      cache.value.stale = true
    }
    isStale.value = true
  }

  return { data, loading, refreshing, isStale, ensure, invalidate, refresh }
}
```

Key changes:
- New `refreshing` ref tracks background refresh state
- `refresh()` deduplicates: returns current data if already refreshing
- `loading` only set to true when no cached data exists (`hasData = false`)
- Both `refreshing` and `loading` cleared in `finally`

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/composables/useCachedResource.ts
git commit -m "refactor: add refreshing state to useCachedResource for async refresh pattern"
```

---

### Task 2: Update skills store to expose `refreshing`

**Files:**
- Modify: `src/renderer/src/stores/skills.ts`

- [ ] **Step 1: Add `refreshing` computed and export it**

Change line 43 (current `fetching` computed) to also add `refreshing`:

```typescript
const fetching = computed(() => installedCache.loading.value)
const refreshing = computed(
  () => installedCache.refreshing.value || agentScanCache.refreshing.value
)
```

Change line 46 (current `loading` computed):

```typescript
const loading = computed(() => fetching.value || searching.value)
```

Add `refreshing` to the return object (line 197-222). Insert `refreshing,` after `loading,`:

```typescript
return {
  searchResults,
  searchDuration,
  installedSkills,
  selectedAgents,
  filteredSkills,
  sortedAgentResults,
  fetching,
  searching,
  installing,
  removing,
  loading,
  refreshing,
  error,
  searchKeyword,
  clearError,
  setSearchKeyword,
  toggleAgent,
  clearAgentFilter,
  setMessageHandler,
  search,
  fetchInstalled,
  install,
  installStreaming,
  remove,
  openLocation
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/skills.ts
git commit -m "feat: expose refreshing state from skills store"
```

---

### Task 3: Update settings store to expose `refreshing`

**Files:**
- Modify: `src/renderer/src/stores/settings.ts`

- [ ] **Step 1: Add `refreshing` computed and export it**

After line 19 (`const loading = fetching`), add:

```typescript
const refreshing = computed(() => settingsCache.refreshing.value)
```

Add `refreshing` to the return object (line 51):

```typescript
return { defaultAgent, autoCheckEnv, proxyUrl, npmRegistry, loading, fetching, refreshing, error, load, save }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/settings.ts
git commit -m "feat: expose refreshing state from settings store"
```

---

### Task 4: Update env store to expose `refreshing`

**Files:**
- Modify: `src/renderer/src/stores/env.ts`

- [ ] **Step 1: Add `refreshing` computed and export it**

After line 22 (`const checking = fetching`), add:

```typescript
const refreshing = computed(() => statusCache.refreshing.value)
```

Add `refreshing` to the return object (line 49):

```typescript
return {
  status,
  fetching,
  checking,
  refreshing,
  downloading,
  downloadProgress,
  error,
  check,
  installNode
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/env.ts
git commit -m "feat: expose refreshing state from env store"
```

---

### Task 5: Update AgentView to async refresh pattern

**Files:**
- Modify: `src/renderer/src/views/AgentView.vue`

- [ ] **Step 1: Update `handleRefresh` to async callback with toast**

Replace lines 105-107:

```typescript
async function handleRefresh(): Promise<void> {
  await skillsStore.fetchInstalled()
}
```

With:

```typescript
async function handleRefresh(): Promise<void> {
  try {
    await skillsStore.fetchInstalled()
    message.success('刷新完成')
  } catch {
    message.error('刷新失败，请重试')
  }
}
```

- [ ] **Step 2: Update refresh button — remove `:loading`, add `:disabled`**

Replace line 137:

```vue
<NButton secondary size="small" :loading="skillsStore.fetching" @click="handleRefresh">
```

With:

```vue
<NButton secondary size="small" :disabled="skillsStore.refreshing" @click="handleRefresh">
```

- [ ] **Step 3: Verify full-page spinner condition is correct**

The existing condition on line 147:
```vue
<div v-if="skillsStore.fetching && visibleAgentResults.length === 0" class="page-loading">
```
No change needed. After Task 1 refactor, `skillsStore.fetching` (= `installedCache.loading`) is only `true` during the first fetch when no cached data exists — exactly when we want the spinner.

- [ ] **Step 4: Verify the app builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "feat: AgentView refresh button uses async pattern with toast"
```

---

### Task 6: Update InstalledList to async refresh pattern

**Files:**
- Modify: `src/renderer/src/views/InstalledList.vue`

- [ ] **Step 1: Update `loadSkills` and `handleRefresh`**

Replace lines 28-36:

```typescript
async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled()
}

async function handleRefresh(): Promise<void> {
  await loadSkills()
}
```

With:

```typescript
async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled()
}

async function handleRefresh(): Promise<void> {
  try {
    await loadSkills()
    message.success('刷新完成')
  } catch {
    message.error('刷新失败，请重试')
  }
}
```

- [ ] **Step 2: Update refresh button — remove `:loading`, add `:disabled`**

Replace line 168:

```vue
<NButton secondary size="small" :loading="skillsStore.fetching" @click="handleRefresh">
```

With:

```vue
<NButton secondary size="small" :disabled="skillsStore.refreshing" @click="handleRefresh">
```

- [ ] **Step 3: Verify full-page spinner condition is correct**

The existing condition on line 190:
```vue
v-if="skillsStore.fetching && skillsStore.filteredSkills.length === 0"
```
No change needed. Same reasoning as Task 5 Step 3 — `fetching` now means "initial load only".

- [ ] **Step 4: Verify the app builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/views/InstalledList.vue
git commit -m "feat: InstalledList refresh button uses async pattern with toast"
```

---

### Task 7: Update SettingsView env check to async refresh pattern

**Files:**
- Modify: `src/renderer/src/views/SettingsView.vue`

- [ ] **Step 1: Add `handleEnvRecheck` function with toast**

After the `handleInstallSkills` function (around line 281), add:

```typescript
async function handleEnvRecheck(): Promise<void> {
  try {
    await envStore.check()
    message.success('环境检测完成')
  } catch {
    message.error('环境检测失败，请重试')
  }
}
```

- [ ] **Step 2: Update the env recheck button — remove `:loading`, add `:disabled`, use new handler**

Replace lines 578-585:

```vue
<div class="env-actions">
  <NButton size="small" round :loading="envStore.checking" @click="envStore.check()">
    <template #icon>
      <NIcon :size="14"><RefreshOutline /></NIcon>
    </template>
    重新检测
  </NButton>
</div>
```

With:

```vue
<div class="env-actions">
  <NButton size="small" round :disabled="envStore.refreshing" @click="handleEnvRecheck">
    <template #icon>
      <NIcon :size="14"><RefreshOutline /></NIcon>
    </template>
    重新检测
  </NButton>
</div>
```

- [ ] **Step 3: Verify the app builds**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/views/SettingsView.vue
git commit -m "feat: SettingsView env recheck uses async pattern with toast"
```

---

### Task 8: Final verification and cleanup

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: All pass

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No new errors

- [ ] **Step 3: Manual smoke test**

Start dev server with `npm run dev` and verify:
1. AgentView: click refresh → no spinner, toast "刷新完成"
2. InstalledList: click refresh → no spinner, toast "刷新完成"
3. SettingsView: click "重新检测" → no spinner, toast "环境检测完成"
4. All three: rapid double-click → second click ignored (dedup)
5. First load with no data → full-page spinner still shows

- [ ] **Step 4: Final commit if any fixes needed**
