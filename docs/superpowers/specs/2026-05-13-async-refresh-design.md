# Async Refresh Design

## Problem

All refresh operations (skills list, agent scan, env check, settings reload) use synchronous loading patterns — clicking refresh shows a loading spinner on the button and blocks UI interaction until the fetch completes. This creates a sluggish interaction feel.

## Solution

Refactor `useCachedResource` to separate "initial load" from "background refresh". Refresh buttons no longer show loading spinners. Instead, refreshes run silently in the background and notify the user via toast on completion or failure.

## Design

### useCachedResource Changes

The composable currently has a single `loading` ref that drives both initial-load spinners and refresh indicators. This is split into two:

- `loading: Ref<boolean>` — true only during the **first fetch** when no cached data exists. Used for full-page spinners.
- `refreshing: Ref<boolean>` — true during **background refresh** operations. Used for dedup (ignore repeat clicks), not for UI spinners.

**`ensure()`** logic:

1. If cache is fresh (not stale) — return cached data immediately, no loading state.
2. If cache exists but is stale — call `refresh()` silently (data preserved, `refreshing=true`).
3. If no cache at all — call `refresh()` with `loading=true` (first-time load).

**`refresh()`** logic:

1. If `refreshing` is already true — return current data immediately (dedup).
2. Set `refreshing=true` (and `loading=true` only if no existing data).
3. Fetch new data.
4. On success: update `data`, set `refreshing=false`, `loading=false`.
5. On error: set `refreshing=false`, `loading=false`, throw error (caller handles toast).
6. Old data remains visible until new data arrives.

### Store Changes

Each store exposes a `refreshing` computed:

- `stores/skills.ts` — `refreshing` from `installedCache.refreshing`
- `stores/settings.ts` — `refreshing` from `settingsCache.refreshing`
- `stores/env.ts` — `refreshing` from `statusCache.refreshing`

`fetchInstalled()`, `check()`, `load()` methods remain async but no longer cause button-level loading states.

### View Changes

**Refresh buttons** — remove `:loading` binding, add `:disabled="store.refreshing"`:

```vue
<NButton secondary size="small" :disabled="skillsStore.refreshing" @click="handleRefresh">
  <template #icon>
    <NIcon :size="16"><RefreshOutline /></NIcon>
  </template>
  刷新
</NButton>
```

**Refresh handlers** — fire-and-forget with toast:

```typescript
async function handleRefresh() {
  try {
    await skillsStore.fetchInstalled()
    message.success('刷新完成')
  } catch {
    message.error('刷新失败，请重试')
  }
}
```

**Full-page spinners** — only shown on first load when no data exists:

```vue
<div v-if="skillsStore.loading && !skillsStore.installed.length" class="page-loading">
  <NSpin size="large" />
</div>
```

### Affected Files

| File                                                | Change                                                    |
| --------------------------------------------------- | --------------------------------------------------------- |
| `src/renderer/src/composables/useCachedResource.ts` | Add `refreshing` ref, refactor `refresh()` and `ensure()` |
| `src/renderer/src/stores/skills.ts`                 | Export `refreshing` computed                              |
| `src/renderer/src/stores/settings.ts`               | Export `refreshing` computed                              |
| `src/renderer/src/stores/env.ts`                    | Export `refreshing` computed                              |
| `src/renderer/src/views/AgentView.vue`              | Remove `:loading`, add toast, update spinner condition    |
| `src/renderer/src/views/InstalledList.vue`          | Remove `:loading`, add toast, update spinner condition    |
| `src/renderer/src/views/SettingsView.vue`           | Remove `:loading` on env check, add toast                 |

### Error Handling

Errors from `refresh()` propagate to the caller via rejected promise. Each view handler catches and shows an error toast. No dialogs, no modals — consistent non-blocking feedback.

### Dedup Strategy

`useCachedResource.refresh()` returns early (current cached data) if `refreshing` is already true. No cancellations, no queueing. The button is disabled during refresh as a visual hint.
