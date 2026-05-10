# Search Page UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three visual issues on the skills search page: scrollbar visibility, install button position/style inconsistency, and jarring hover left border.

**Architecture:** Remove NaiveUI's `NScrollbar` component in favor of a native scroll container with globally-hidden scrollbars via CSS. Restructure the search result card to place the install button in the header row with default NaiveUI button styling instead of custom coral fill. Replace the left-border hover accent with a uniform border-color and shadow transition consistent with other cards in the app.

**Tech Stack:** Vue 3, NaiveUI, Vite, CSS

---

### Task 1: Remove NScrollbar and Use Native Scrolling

**Files:**

- Modify: `src/renderer/src/views/SkillsSearch.vue`

**Context:**
The search page currently wraps its results in `<NScrollbar class="search-scroll">`. The global CSS in `tokens.css` already hides all native scrollbars (`scrollbar-width: none` and `::-webkit-scrollbar { display: none }`), but the custom scrollbar component may still render its own UI. We replace it with a plain `<div>` that uses native scrolling, achieving the same hidden-scrollbar behavior without the extra component.

- [ ] **Step 1: Remove NScrollbar from imports**

In the `<script setup>` block, remove `NScrollbar` from the NaiveUI import:

```typescript
import { ref } from 'vue'
import { NSpin, NEmpty, NText } from 'naive-ui'
```

- [ ] **Step 2: Replace NScrollbar wrapper with a plain div**

In the `<template>`, replace the opening `<NScrollbar class="search-scroll">` with `<div class="search-scroll">` and the closing `</NScrollbar>` with `</div>`.

Before:

```vue
<NScrollbar class="search-scroll">
      <!-- all scrollable content -->
    </NScrollbar>
```

After:

```vue
<div class="search-scroll">
      <!-- all scrollable content -->
    </div>
```

- [ ] **Step 3: Update CSS for native scrolling**

In the `<style scoped>` block:

1. Add `overflow: hidden` to `.search-page` to prevent the entire page from scrolling.
2. Add `overflow-y: auto` to `.search-scroll` so only the content area scrolls.
3. Remove the deep-selector rule that targeted `NScrollbar`'s rail.

Before:

```css
.search-page {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-scroll {
  flex: 1;
  min-height: 0;
}

.search-scroll :deep(.n-scrollbar-rail) {
  display: none !important;
}
```

After:

```css
.search-page {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.search-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

- [ ] **Step 4: Verify scrolling behavior**

Run the dev server:

```bash
npm run dev
```

In the app, navigate to the search page and perform a search that yields many results. Confirm:

1. The results area scrolls when content overflows.
2. No scrollbar UI (track, thumb, or rail) is visible at any point.
3. The search bar at the top remains fixed while scrolling.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/views/SkillsSearch.vue
git commit -m "refactor(search): replace NScrollbar with native scrolling"
```

---

### Task 2: Relocate Install Button to Card Header with Default Styling

**Files:**

- Modify: `src/renderer/src/components/skills/SearchResultCard.vue`

**Context:**
The install button currently sits below the card header with `align-self: flex-start`, causing vertical misalignment across cards with varying description lengths. It also uses a custom coral (`#ff5530`) fill that clashes with the app's grayscale theme. We move the button into the card's header area so it stays at a fixed top-right position, and remove the custom CSS so it uses NaiveUI's default `type="default"` style (white background, dark text/border).

- [ ] **Step 1: Restructure card DOM to place button in header row**

Wrap the existing `.result-card-header` and the `<NButton>` in a new flex container `.result-card-main`.

Before:

```vue
  <div class="result-card">
    <div class="result-card-header">
      <div class="result-card-title-row">
        <NText strong class="result-name">{{ result.name }}</NText>
        <div class="install-badge">
          {{ formatInstalls(result.installs) }} 次下载
        </div>
      </div>
      <NText depth="3" code class="package-ref">{{ packageRef }}</NText>
      <a :href="detailUrl" target="_blank" class="result-link">{{ detailUrl }}</a>
    </div>
    <NButton size="small" round class="install-btn" @click="emit('install', packageRef)">
      <template #icon>
        <NIcon :size="16"><DownloadOutline /></NIcon>
      </template>
      安装
    </NButton>
  </div>
```

After:

```vue
  <div class="result-card">
    <div class="result-card-main">
      <div class="result-card-header">
        <div class="result-card-title-row">
          <NText strong class="result-name">{{ result.name }}</NText>
          <div class="install-badge">
            {{ formatInstalls(result.installs) }} 次下载
          </div>
        </div>
        <NText depth="3" code class="package-ref">{{ packageRef }}</NText>
        <a :href="detailUrl" target="_blank" class="result-link">{{ detailUrl }}</a>
      </div>
      <NButton size="small" round @click="emit('install', packageRef)">
        <template #icon>
          <NIcon :size="16"><DownloadOutline /></NIcon>
        </template>
        安装
      </NButton>
    </div>
  </div>
```

- [ ] **Step 2: Update card layout CSS**

1. Remove flex display from `.result-card` since it now has a single child (`.result-card-main`).
2. Add `.result-card-main` as a flex row that pushes the button to the right.
3. Keep `.result-card-header` as a column so title, package ref, and link stack vertically.

Before:

```css
.result-card {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-xl);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  transition: all var(--transition-base);
  border-left: 3px solid transparent;
}
```

After:

```css
.result-card {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-xl);
  padding: var(--space-md);
  transition: all var(--transition-base);
}

.result-card-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-sm);
}
```

- [ ] **Step 3: Remove custom button styles**

Delete the entire `.install-btn` and `.install-btn:hover` CSS blocks so the button renders with NaiveUI's default `type="default"` appearance.

Before:

```css
.install-btn {
  align-self: flex-start;
  background: var(--color-brand-coral);
  border-color: var(--color-brand-coral);
  color: var(--color-canvas);
  font-weight: var(--weight-medium);
  transition: all var(--transition-base);
}

.install-btn:hover {
  background: var(--color-brand-coral-dark);
  border-color: var(--color-brand-coral-dark);
}
```

After: _(remove both rules entirely)_

- [ ] **Step 4: Verify button position and style**

With the dev server running (`npm run dev`), confirm:

1. Every search result card shows the install button at the top-right, aligned with the card title.
2. The button no longer uses the bright coral fill; it appears with the default NaiveUI button style (white background, dark text/border).
3. Clicking the button still opens the install dialog for the correct package.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/skills/SearchResultCard.vue
git commit -m "refactor(search-card): move install button to header with default style"
```

---

### Task 3: Replace Hover Left Border with Subtle Border+Shadow

**Files:**

- Modify: `src/renderer/src/components/skills/SearchResultCard.vue`

**Context:**
The card currently shows a 3px coral left border on hover. This is visually aggressive and inconsistent with `SkillRow.vue` and `card-base`, which use uniform border-color darkening and a subtle shadow. We remove the left-border accent and apply the same subtle hover language.

- [ ] **Step 1: Remove left border hover accent**

`.result-card` no longer has `border-left: 3px solid transparent` (removed in Task 2). Now remove the left-border color change from the hover state.

Before:

```css
.result-card:hover {
  border-left-color: var(--color-brand-coral);
  box-shadow: var(--shadow-3);
}
```

After:

```css
.result-card:hover {
  border-color: var(--color-muted);
  box-shadow: var(--shadow-3);
}
```

- [ ] **Step 2: Verify hover effect**

With the dev server running, confirm:

1. Hovering over a search result card darkens its border uniformly (no left-side accent).
2. A subtle shadow appears on hover.
3. The effect matches the hover behavior of cards in the "Installed Skills" list (`SkillRow.vue`).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/skills/SearchResultCard.vue
git commit -m "style(search-card): replace left border hover with subtle shadow"
```

---

## Self-Review

### 1. Spec Coverage

| Spec Requirement                                  | Task   |
| ------------------------------------------------- | ------ |
| Remove scrollbar UI from search results           | Task 1 |
| Install button at consistent position             | Task 2 |
| Install button uses subtle monochrome style       | Task 2 |
| Hover shows uniform border+shadow, no left border | Task 3 |

All requirements are covered. No gaps.

### 2. Placeholder Scan

- No "TBD", "TODO", or "implement later" found.
- No vague instructions like "add appropriate styling" — exact CSS rules are provided.
- No "similar to Task X" references.
- All code blocks contain the actual code an engineer needs.

### 3. Type & Naming Consistency

- CSS class names (`result-card`, `result-card-main`, `search-scroll`) are consistent across all tasks.
- NaiveUI component names (`NButton`, `NScrollbar`) match the codebase's existing usage.
- Color token names (`var(--color-muted)`, `var(--shadow-3)`) are drawn from the existing `tokens.css`.
