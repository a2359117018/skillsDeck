# UX Optimization: Loading Animations, Caching & Confirmation Dialogs

## Overview

Three-pronged UX optimization for npx-skills-ui:

1. **Unified loading animation** — Replace scattered NSpin/button-loading with a cohesive transition system
2. **Caching service** — Avoid redundant re-fetches when navigating between views
3. **Custom confirmation dialogs** — Replace `window.confirm()` with styled Naive UI dialogs

Architecture approach: **Incremental improvement on existing Pinia stores** with a shared `useCachedResource` composable for cache logic.

---

## 1. Unified Loading Animation

### Current Problem

- Zero CSS transitions or animations exist
- Single `loading` boolean in `useSkillsStore` shared across 6 async operations — concurrent UI conflicts
- `NSpin` wrappers used inconsistently across 4 views
- Route changes are instant with no visual feedback

### Design

#### Store Loading State Refactor

Replace single `loading` in `useSkillsStore` with granular booleans:

```
State:
  fetching: boolean     — list/search fetch operations
  installing: boolean   — skill install
  updating: boolean     — single skill update
  updatingAll: boolean  — update all skills
  removing: boolean     — skill removal
```

Each view binds to the specific loading flag relevant to its operations.

#### Route Transition Component

`App.vue` wraps `<router-view>` with Vue `<Transition name="fade">`:

```html
<Transition name="fade" mode="out-in">
  <router-view />
</Transition>
```

CSS fade transition: `opacity 0.2s ease` enter/leave.

#### Global Loading Overlay

New component: `components/common/AppLoading.vue`

- Props: `show: boolean`
- Visual: Semi-transparent backdrop + centered spinner (Naive UI `NSpin` wrapper)
- Wrapped in `<Transition name="fade">` for smooth show/hide
- Used in `App.vue` as sibling to the transition-wrapped router-view

#### Navigation Loading State

New composable: `composables/useNavigationState.ts`

- Exports reactive `isNavigating: boolean`
- Set `true` in router `beforeEach`, `false` in `afterEach`
- `AppLoading` consumes this + store `fetching` states

### Files Changed

| File                                | Change                                                |
| ----------------------------------- | ----------------------------------------------------- |
| `components/common/AppLoading.vue`  | **New** — Global loading overlay                      |
| `composables/useNavigationState.ts` | **New** — Route navigation state                      |
| `stores/skills.ts`                  | Replace `loading` with granular flags                 |
| `stores/env.ts`                     | Use `fetching` instead of `checking` for consistency  |
| `stores/settings.ts`                | Add `fetching` flag                                   |
| `App.vue`                           | Add `<Transition>` on router-view, mount `AppLoading` |
| `views/InstalledList.vue`           | Use `fetching`/`updatingAll` instead of `loading`     |
| `views/SkillsSearch.vue`            | Use `fetching` instead of `loading`                   |
| `views/AgentView.vue`               | Use `fetching` instead of `loading`                   |
| `views/EnvDetection.vue`            | Use `fetching` instead of `checking`                  |
| `assets/base.css`                   | Add fade transition CSS classes                       |

---

## 2. Caching Service

### Current Problem

- Every `onMounted` re-fetches from scratch via IPC
- No staleness tracking, no cache invalidation
- Skills list fetched separately in `InstalledList` and `AgentView` — same data, two requests

### Design

#### Composable: `composables/useCachedResource.ts`

Generic cache wrapper that any store can use:

```typescript
interface CacheState<T> {
  data: T
  timestamp: number
  stale: boolean
}

interface UseCachedResourceReturn<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  isStale: Ref<boolean>
  ensure: () => Promise<T> // Return cache if fresh, otherwise fetch
  invalidate: () => void // Mark cache as stale
  refresh: () => Promise<T> // Force re-fetch regardless of cache
}
```

Parameters:

- `fetcher: () => Promise<T>` — The async function to get fresh data
- `initialValue: T` — Default value for `data`

Behavior:

- `ensure()`: If cache exists and `stale === false`, return cached data immediately. Otherwise call `fetcher`, store result, set `stale = false`.
- `invalidate()`: Set `stale = true`. Does NOT clear cached data — UI can still show stale data while re-fetching.
- `refresh()`: Always calls `fetcher`, updates cache, resets `stale`.

#### Store Integration

**useSkillsStore:**

- `installedCache = useCachedResource<Skill[]>(() => window.api.skills.list({ global: true }))`
- `fetchInstalled()` → `installedCache.ensure()`
- After `install()`, `update()`, `updateAll()`, `remove()` → `installedCache.invalidate()`
- Search results are NOT cached — always live query

**useEnvStore:**

- `statusCache = useCachedResource<EnvStatus>(() => window.api.env.check())`
- `check()` → `statusCache.ensure()`

**useSettingsStore:**

- `settingsCache = useCachedResource<AppSettings>(() => window.api.store.getSettings())`
- `load()` → `settingsCache.ensure()`
- After `save()` → `settingsCache.invalidate()`

### Files Changed

| File                               | Change                                                    |
| ---------------------------------- | --------------------------------------------------------- |
| `composables/useCachedResource.ts` | **New** — Generic cache composable                        |
| `stores/skills.ts`                 | Integrate cache for installed skills                      |
| `stores/env.ts`                    | Integrate cache for env status                            |
| `stores/settings.ts`               | Integrate cache for settings                              |
| `views/InstalledList.vue`          | Remove manual `onMounted` fetch (store handles via cache) |
| `views/AgentView.vue`              | Remove manual `onMounted` fetch (store handles via cache) |

---

## 3. Confirmation Dialogs

### Current Problem

- `window.confirm()` for delete operations — native browser dialog, no styling control
- No confirmation for update or install operations
- No confirmation for "update all" — could affect many skills

### Design

#### Composable: `composables/useConfirm.ts`

Wraps Naive UI's `useDialog()` with typed operation helpers:

```typescript
function useConfirm() {
  const dialog = useDialog()

  return {
    confirmInstall(name: string): Promise<boolean>
    confirmUpdate(name: string): Promise<boolean>
    confirmRemove(name: string): Promise<boolean>
    confirmUpdateAll(names: string[]): Promise<boolean>
  }
}
```

Each method returns a `Promise<boolean>` — resolves `true` on confirm, `false` on cancel.

#### Dialog Content by Operation

| Operation  | Title        | Type    | Content                                                                              | Confirm Button |
| ---------- | ------------ | ------- | ------------------------------------------------------------------------------------ | -------------- |
| Install    | 安装确认     | info    | `确定要安装「{name}」技能？`                                                         | 确认安装       |
| Update     | 更新确认     | info    | `确定要更新「{name}」技能？`                                                         | 确认更新       |
| Remove     | 删除确认     | warning | `确定要删除「{name}」技能？此操作不可撤销。`                                         | 确认删除 (red) |
| Update All | 全部更新确认 | info    | `确定要更新以下 {count} 个技能？\n{name1}, {name2}, ...\n...\n等 {remaining} 个技能` | 确认更新       |

For "update all", show up to 10 skill names, then "...等 N 个" for the remainder.

#### Replacement Points

| View                         | Current                          | Replace With                                     |
| ---------------------------- | -------------------------------- | ------------------------------------------------ |
| `InstalledList.vue` line 47  | `window.confirm('确定删除 ...')` | `confirmRemove(name)`                            |
| `InstalledList.vue` line ~75 | No confirm for "全部更新"        | Add `confirmUpdateAll(names)`                    |
| `SkillDetail.vue` line 41    | `window.confirm('确定删除 ...')` | `confirmRemove(packageRef)`                      |
| `SkillDetail.vue` line ~69   | No confirm for "更新"            | Add `confirmUpdate(name)`                        |
| `SkillInstallDialog.vue`     | No pre-install confirm           | Add `confirmInstall(name)` before install action |

#### Prerequisite

`NDialogProvider` must be present in `App.vue` (already has `NMessageProvider`; add `NDialogProvider` wrapper).

### Files Changed

| File                           | Change                                         |
| ------------------------------ | ---------------------------------------------- |
| `composables/useConfirm.ts`    | **New** — Typed confirmation dialog composable |
| `App.vue`                      | Wrap with `NDialogProvider`                    |
| `views/InstalledList.vue`      | Replace `window.confirm` with `useConfirm`     |
| `views/SkillDetail.vue`        | Replace `window.confirm` with `useConfirm`     |
| `views/SkillInstallDialog.vue` | Add install confirmation                       |

---

## Summary of New Files

```
src/renderer/src/
  composables/
    useCachedResource.ts      — Generic cache composable
    useConfirm.ts             — Typed confirmation dialogs
    useNavigationState.ts     — Route navigation loading state
  components/common/
    AppLoading.vue            — Global loading overlay
```

## Summary of Modified Files

```
src/renderer/src/
  App.vue                     — Add Transition, AppLoading, NDialogProvider
  assets/base.css             — Add fade transition CSS
  stores/skills.ts            — Granular loading flags + cache
  stores/env.ts               — Consistent loading flag + cache
  stores/settings.ts          — Consistent loading flag + cache
  views/InstalledList.vue     — New loading flags + confirmation dialogs
  views/SkillsSearch.vue      — New loading flags
  views/AgentView.vue         — New loading flags
  views/EnvDetection.vue      — Consistent loading flag
  views/SkillDetail.vue       — Confirmation dialogs
  components/skills/SkillInstallDialog.vue — Install confirmation
```

## Out of Scope

- Skeleton screens (deferred — could be added later per-view)
- Optimistic UI updates
- AbortController for request cancellation
- Error boundary or error display UI improvements
