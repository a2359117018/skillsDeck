# Loading Styles Refactor Design

## Problem

The app has a global loading overlay (`AppLoading.vue`) that triggers on every `skillsStore.fetching` state change. This creates several UX issues:

1. **Double feedback** — refresh buttons already show `:loading` spinner via NButton, the overlay is redundant
2. **Blocks interaction** — full-screen blur overlay prevents users from browsing existing data during refresh
3. **Cross-page interference** — mounted at App.vue root, it blocks the search page when skills refresh in the background
4. **Poor first-load experience** — users see a blocking overlay instead of progressive content loading

Additionally, `SkillDetail.vue` uses redundant double conditions (`skillsStore.updating || operationLoading`) for button loading states where `operationLoading` alone suffices.

## Solution: Remove Global Overlay, Add Inline NSpin Per Page

### Part 1: Remove AppLoading.vue

- Delete `src/renderer/src/components/common/AppLoading.vue`
- Remove from `src/renderer/src/App.vue`:
  - `import AppLoading` statement
  - `showGlobalLoading` computed property
  - `<AppLoading :show="showGlobalLoading" />` in template

### Part 2: InstalledList.vue Inline Loading

Add inline NSpin for first load (no cached data yet):

```
v-if: skillsStore.fetching && skillsStore.filteredSkills.length === 0
  → Centered NSpin (size="large") with min-height
v-else-if: skillsStore.filteredSkills.length > 0
  → Render skill list (unchanged)
v-else
  → NEmpty (unchanged)
```

Refresh button `:loading="skillsStore.fetching"` stays — provides feedback during refresh while cached data remains visible.

### Part 3: AgentView.vue Inline Loading

Same pattern as InstalledList:

```
v-if: skillsStore.fetching && visibleAgentResults.length === 0
  → Centered NSpin
v-else-if: visibleAgentResults.length > 0
  → Agent card grid (unchanged)
v-else
  → NEmpty (unchanged)
```

`SkillsSearch.vue` `.search-loading` is unchanged — it's driven by `skillsStore.searching`, independent of `fetching`.

### Part 4: Simplify SkillDetail.vue Loading Conditions

Simplify button loading from double condition to single:

- Update button: `:loading="skillsStore.updating || operationLoading"` → `:loading="operationLoading"`
- Remove button: `:loading="skillsStore.removing || operationLoading"` → `:loading="operationLoading"`

`operationLoading` wraps the entire operation lifecycle (set true before store call, set false in finally), making the store-level `updating`/`removing` refs redundant for this component's purposes. The store refs remain for potential future use elsewhere.

## Files Changed

| File                                                | Action                                  |
| --------------------------------------------------- | --------------------------------------- |
| `src/renderer/src/components/common/AppLoading.vue` | Delete                                  |
| `src/renderer/src/App.vue`                          | Remove import, computed, template usage |
| `src/renderer/src/views/InstalledList.vue`          | Add inline NSpin for first-load state   |
| `src/renderer/src/views/AgentView.vue`              | Add inline NSpin for first-load state   |
| `src/renderer/src/views/SkillDetail.vue`            | Simplify button loading conditions      |

## Not Changed

- `SkillsSearch.vue` — `.search-loading` is page-scoped and independent, no issue
- `SettingsView.vue` — only uses `:loading="skillsStore.updatingAll"` on a button, no overlay
- `EnvDetection.vue` — uses `:loading` on buttons and `NProgress` for download, no overlay
- Store-level `updating`/`removing`/`fetching` refs — kept, still used by other components
