# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain admin-style UI with a vibrant, brand-color-forward design using a token-based design system, custom sidebar, and restyled components.

**Architecture:** CSS custom properties (`tokens.css`) as the single source of truth for all design decisions. Self-built `AppSidebar.vue` replaces NaiveUI layout components. NaiveUI retained for form/interaction controls with theme overrides. Phased implementation: P0 (foundation) → P1 (first page) → P2 (remaining pages) → P3 (polish).

**Tech Stack:** Vue 3, NaiveUI 2.44.1, @fontsource/dm-sans, @vicons/ionicons5, CSS custom properties

---

## File Structure

### New files:

- `src/renderer/src/assets/tokens.css` — All CSS custom properties (colors, spacing, radius, shadow, typography)
- `src/renderer/src/components/layout/AppSidebar.vue` — Self-built sidebar replacing NLayoutSider + NMenu

### Modified files (P0):

- `src/renderer/src/App.vue` — Remove NLayout/NLayoutSider/NMenu, add AppSidebar, add theme overrides
- `src/renderer/src/assets/main.css` — Font imports, tokens import, updated base styles
- `src/renderer/src/assets/base.css` — Updated transition classes
- `src/renderer/src/assets/card.css` — Replace hardcoded values with token references

### Modified files (P1):

- `src/renderer/src/views/InstalledList.vue` — Hero section + card list redesign
- `src/renderer/src/components/skills/SkillRow.vue` — Card-style list item
- `src/renderer/src/components/skills/AgentTagBar.vue` — Pill filter restyle
- `src/renderer/src/components/skills/SkillSearchBar.vue` — Pill input restyle

### Modified files (P2):

- `src/renderer/src/views/SkillsSearch.vue` — Grid search results
- `src/renderer/src/views/SkillDetail.vue` — Styled detail page
- `src/renderer/src/views/AgentView.vue` — Gradient agent cards
- `src/renderer/src/views/SettingsView.vue` — Styled form
- `src/renderer/src/views/EnvDetection.vue` — Styled modal
- `src/renderer/src/components/skills/SearchResultCard.vue` — Restyle
- `src/renderer/src/components/skills/SkillInstallDialog.vue` — Restyle
- `src/renderer/src/components/common/CommandOutput.vue` — Dark theme
- `src/renderer/src/components/common/AppLoading.vue` — Brand spinner

### Removed (P0):

- NaiveUI `NLayout`, `NLayoutSider`, `NMenu` imports in App.vue

---

## Phase P0 — Design Foundation

### Task 1: Install Font Dependency

**Files:**

- Modify: `package.json` (via npm)

- [ ] **Step 1: Install @fontsource/dm-sans**

Run:

```bash
cd /e/ElectronProjects/npx-skills-ui && npm install @fontsource/dm-sans
```

Expected: package.json updated, node_modules/@fontsource/dm-sans created.

- [ ] **Step 2: Verify font files exist**

Run:

```bash
ls node_modules/@fontsource/dm-sans/ | head -20
```

Expected: See `400.css`, `500.css`, `600.css`, `700.css`, and `files/` directory with woff2 files.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @fontsource/dm-sans for offline font support"
```

---

### Task 2: Create Design Token System

**Files:**

- Create: `src/renderer/src/assets/tokens.css`

- [ ] **Step 1: Create tokens.css**

```css
/* ============================================
   Design Token System
   Single source of truth for all visual decisions.
   ============================================ */

:root {
  /* --- Colors --- */
  --color-primary: #0a0a0a;
  --color-ink: #1a1a1a;
  --color-stone: #6b7280;
  --color-muted: #9ca3af;
  --color-canvas: #ffffff;
  --color-surface: #f7f8fa;
  --color-hairline: #e5e7eb;

  /* Brand */
  --color-brand-coral: #ff5530;
  --color-brand-blue: #1456f0;
  --color-brand-magenta: #ea5ec1;
  --color-brand-purple: #a855f7;

  /* Brand extended */
  --color-brand-blue-200: #dbeafe;
  --color-brand-blue-deep: #1e40af;

  /* Semantic */
  --color-success-bg: #dcfce7;
  --color-success-text: #166534;
  --color-error: #d45656;
  --color-error-bg: #fef2f2;

  /* Sidebar */
  --sidebar-bg-start: #0a0a0a;
  --sidebar-bg-end: #1a1a2e;
  --sidebar-width: 60px;
  --sidebar-icon-color: rgba(255, 255, 255, 0.55);
  --sidebar-icon-hover-color: rgba(255, 255, 255, 0.85);
  --sidebar-icon-active-color: #ffffff;
  --sidebar-active-bar-color: var(--color-brand-coral);
  --sidebar-divider-color: rgba(255, 255, 255, 0.12);

  /* --- Spacing --- */
  --space-xxs: 4px;
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 16px;
  --space-lg: 20px;
  --space-xl: 24px;
  --space-xxl: 32px;
  --space-xxxl: 48px;
  --space-section: 64px;
  --space-section-lg: 80px;

  /* --- Radius --- */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-xxl: 20px;
  --radius-hero: 32px;
  --radius-full: 9999px;

  /* --- Shadows --- */
  --shadow-0: none;
  --shadow-1: 0 1px 2px rgba(36, 36, 36, 0.06);
  --shadow-2: rgba(36, 36, 36, 0.06) 0 2px 6px -2px;
  --shadow-3: rgba(36, 36, 36, 0.08) 0 4px 12px -2px;
  --shadow-4: rgba(36, 36, 36, 0.08) 0 12px 16px -4px;

  /* --- Typography (sizes) --- */
  --text-hero: 2rem;
  --text-heading-lg: 1.5rem;
  --text-heading-md: 1.25rem;
  --text-heading-sm: 1.125rem;
  --text-body-lg: 1.0625rem;
  --text-body-md: 1rem;
  --text-body-sm: 0.875rem;
  --text-caption: 0.8125rem;
  --text-micro: 0.75rem;

  /* --- Typography (weights) --- */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* --- Typography (line heights) --- */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* --- Transitions --- */
  --transition-fast: 100ms ease;
  --transition-base: 150ms ease;
  --transition-slow: 200ms ease;
}
```

- [ ] **Step 2: Verify file syntax**

Run:

```bash
head -5 src/renderer/src/assets/tokens.css && echo "---" && grep -c "^\-\-color-" src/renderer/src/assets/tokens.css
```

Expected: File header visible, color token count > 10.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/assets/tokens.css
git commit -m "feat: add design token system (CSS custom properties)"
```

---

### Task 3: Update Base Styles

**Files:**

- Modify: `src/renderer/src/assets/main.css`
- Modify: `src/renderer/src/assets/base.css`

- [ ] **Step 1: Rewrite main.css with font imports and token base**

Replace the entire content of `src/renderer/src/assets/main.css`:

```css
@import '@fontsource/dm-sans/400.css';
@import '@fontsource/dm-sans/500.css';
@import '@fontsource/dm-sans/600.css';
@import '@fontsource/dm-sans/700.css';
@import './tokens.css';
@import './card.css';

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif;
  font-size: var(--text-body-md);
  line-height: var(--leading-normal);
  color: var(--color-ink);
  background-color: var(--color-canvas);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
```

- [ ] **Step 2: Update base.css with route transition**

Replace the entire content of `src/renderer/src/assets/base.css`:

```css
/* Route transition */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity var(--transition-slow),
    transform var(--transition-slow);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
```

- [ ] **Step 3: Delete old main.css import of base.css if present**

The old `main.css` had no `@import './base.css'` — base transitions were in `base.css` loaded separately. Now all imports are consolidated in `main.css`. Check `main.ts` to see how CSS is loaded:

Run:

```bash
grep -n "import.*\.css" src/renderer/src/main.ts
```

If `main.ts` imports `base.css` separately, remove that import since transitions are now part of the unified `main.css`. If it only imports `main.css`, no change needed.

- [ ] **Step 4: Verify app starts**

Run:

```bash
npm run dev
```

Expected: App starts, no console errors, DM Sans font loads, tokens apply.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/assets/main.css src/renderer/src/assets/base.css
git commit -m "feat: update base styles with DM Sans font and design tokens"
```

---

### Task 4: Create AppSidebar Component

**Files:**

- Create: `src/renderer/src/components/layout/AppSidebar.vue`

- [ ] **Step 1: Create directory**

Run:

```bash
mkdir -p src/renderer/src/components/layout
```

- [ ] **Step 2: Create AppSidebar.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import { CubeOutline, SearchOutline, GitMergeOutline, SettingsOutline } from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()

interface NavItem {
  key: string
  icon: typeof CubeOutline
}

const navItems: NavItem[] = [
  { key: 'installed', icon: CubeOutline },
  { key: 'search', icon: SearchOutline },
  { key: 'agent-view', icon: GitMergeOutline },
  { key: 'settings', icon: SettingsOutline }
]

const dividers = new Set(['search', 'agent-view'])

const activeKey = computed(() => route.name as string)

function navigate(key: string): void {
  router.push({ name: key })
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <span class="brand-dot"></span>
    </div>

    <nav class="sidebar-nav">
      <template v-for="item in navItems" :key="item.key">
        <div v-if="dividers.has(item.key)" class="sidebar-divider"></div>
        <button
          class="sidebar-item"
          :class="{ active: activeKey === item.key }"
          @click="navigate(item.key)"
          :title="item.key"
        >
          <div class="active-bar"></div>
          <NIcon :size="20">
            <component :is="item.icon" />
          </NIcon>
        </button>
      </template>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  height: 100vh;
  background: linear-gradient(180deg, var(--sidebar-bg-start) 0%, var(--sidebar-bg-end) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-md) 0;
  position: relative;
  overflow: hidden;
}

.sidebar::after {
  content: '';
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 85, 48, 0.15) 0%,
    rgba(168, 85, 247, 0.1) 50%,
    transparent 70%
  );
  pointer-events: none;
}

.sidebar-brand {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-lg);
}

.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-brand-coral), var(--color-brand-purple));
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  width: 100%;
}

.sidebar-divider {
  width: 24px;
  height: 1px;
  background: var(--sidebar-divider-color);
  margin: var(--space-xs) 0;
}

.sidebar-item {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-lg);
  color: var(--sidebar-icon-color);
  transition:
    color var(--transition-base),
    background var(--transition-base);
}

.sidebar-item:hover {
  color: var(--sidebar-icon-hover-color);
  background: rgba(255, 255, 255, 0.06);
}

.sidebar-item.active {
  color: var(--sidebar-icon-active-color);
  background: rgba(255, 255, 255, 0.08);
}

.active-bar {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 20px;
  border-radius: 0 3px 3px 0;
  background: var(--sidebar-active-bar-color);
  transition: transform var(--transition-base);
}

.sidebar-item.active .active-bar {
  transform: translateY(-50%) scaleY(1);
}
</style>
```

- [ ] **Step 3: Verify component file exists**

Run:

```bash
ls -la src/renderer/src/components/layout/AppSidebar.vue
```

Expected: File exists, ~140 lines.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/layout/AppSidebar.vue
git commit -m "feat: create custom AppSidebar with icon-only nav and brand styling"
```

---

### Task 5: Rewrite App.vue Shell

**Files:**

- Modify: `src/renderer/src/App.vue`

- [ ] **Step 1: Rewrite App.vue**

Replace the entire content of `src/renderer/src/App.vue`:

```vue
<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  type GlobalThemeOverrides
} from 'naive-ui'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppLoading from './components/common/AppLoading.vue'
import { useSkillsStore } from './stores/skills'

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'

const skillsStore = useSkillsStore()
const showGlobalLoading = computed(() => skillsStore.fetching)

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0a0a0a',
    primaryColorHover: '#2a2a2a',
    primaryColorPressed: '#000000',
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif",
    borderRadius: '9999px',
    borderRadiusSmall: '8px'
  },
  Button: {
    borderRadius: '9999px',
    fontWeight: '500'
  },
  Tag: {
    borderRadius: '9999px'
  },
  Input: {
    borderRadius: '8px',
    height: '40px'
  },
  Card: {
    borderRadius: '16px'
  },
  Modal: {
    borderRadius: '20px'
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '8px'
      }
    }
  }
}
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NDialogProvider>
      <NMessageProvider>
        <div v-if="windowType === 'main'" class="app-shell">
          <AppSidebar />
          <main class="content-area">
            <Transition name="fade" mode="out-in">
              <router-view />
            </Transition>
          </main>
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
  display: flex;
  position: relative;
}

.content-area {
  flex: 1;
  height: 100vh;
  overflow: auto;
  background-color: var(--color-canvas);
}
</style>
```

- [ ] **Step 2: Remove old imports that are no longer used**

The rewrite already removes `NLayout`, `NLayoutSider`, `NMenu`, `useRouter`, `useRoute`, `MenuOption`. Verify no other files import these from App.vue (they don't — each component manages its own imports).

- [ ] **Step 3: Verify app runs with new shell**

Run:

```bash
npm run dev
```

Expected:

- Dark sidebar on left (60px wide) with icons
- White content area on right
- Sidebar icons navigate between routes
- Active icon shows coral bar on left edge
- No console errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/App.vue
git commit -m "feat: rewrite App.vue shell with custom sidebar and NaiveUI theme overrides"
```

---

### Task 6: Update Card Styles with Tokens

**Files:**

- Modify: `src/renderer/src/assets/card.css`

- [ ] **Step 1: Rewrite card.css with token references**

Replace the entire content of `src/renderer/src/assets/card.css`:

```css
.card-base {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-hairline);
  background-color: var(--color-canvas);
  display: flex;
  overflow: hidden;
  box-shadow: var(--shadow-1);
  transition:
    box-shadow var(--transition-base),
    border-color var(--transition-base);
}

.card-base:hover {
  border-color: #c8ccd4;
  box-shadow: var(--shadow-3);
}

.card-base-body {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
}

.card-base-text {
  font-weight: var(--weight-semibold);
  font-size: var(--text-body-md);
  color: var(--color-ink);
}
```

- [ ] **Step 2: Verify no hardcoded color values remain**

Run:

```bash
grep -n '#' src/renderer/src/assets/card.css
```

Expected: Only `#c8ccd4` on hover border (borderline token, acceptable).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/assets/card.css
git commit -m "feat: update card.css to use design token references"
```

---

### Task 7: P0 Visual Verification

- [ ] **Step 1: Start the app**

Run:

```bash
npm run dev
```

- [ ] **Step 2: Check sidebar**
- Sidebar is 60px wide, dark gradient background
- Icons: cube, search, git-merge, settings with dividers between groups
- Click each icon — routes change correctly
- Active state shows coral bar on left edge
- Hover shows subtle brightness increase

- [ ] **Step 3: Check content area**
- White background fills remaining space
- Route transitions have fade + slide up effect
- Pages load without errors (may look unstyled — that's OK, P1 will fix)

- [ ] **Step 4: Check font**
- Open browser dev tools → Computed → look for font-family on body
- Should show "DM Sans" as first entry
- Text should render in DM Sans (not system font)

- [ ] **Step 5: Check tokens**
- Open browser dev tools → Elements → select `:root`
- CSS custom properties should be listed (--color-primary, --space-md, etc.)

- [ ] **Step 6: Commit any hotfixes**

If any issues found, fix and commit:

```bash
git add -A
git commit -m "fix: P0 visual verification hotfix"
```

---

## Phase P1 — First Page (InstalledList)

### Task 8: Rewrite InstalledList.vue

**Files:**

- Modify: `src/renderer/src/views/InstalledList.vue`

**Before:** Read the current `InstalledList.vue` to understand the data bindings, store usage, and child components. The rewrite preserves all logic — only template and styles change.

- [ ] **Step 1: Rewrite InstalledList.vue template and styles**

Key changes:

- Add hero banner section with gradient background (`brand-coral` → `brand-purple`)
- Hero contains: title "我的技能", skill count badge, refresh/update-all buttons as white outline pills
- Search bar: pill input `rounded-full`, search icon prefix, filtered count on right
- AgentTagBar: unchanged component, will be restyled in Task 9
- Skill list: replace row style with card-style items via updated SkillRow (Task 10)
- Wrap in container with `max-width: 960px`, centered

Template structure:

```html
<div class="installed-page">
  <!-- Hero Section -->
  <div class="hero">
    <div class="hero-bg"></div>
    <div class="hero-content">
      <div class="hero-title-row">
        <h1 class="hero-title">我的技能</h1>
        <span class="hero-badge">{{ skillsStore.installedSkills.length }}</span>
      </div>
      <div class="hero-actions">
        <button class="btn-hero-outline" @click="...">
          <NIcon :size="16"><RefreshOutline /></NIcon>
          刷新
        </button>
        <button class="btn-hero-outline" @click="..." v-if="hasUpdates">
          <NIcon :size="16"><CloudDownloadOutline /></NIcon>
          全部更新
        </button>
      </div>
    </div>
  </div>

  <!-- Search -->
  <div class="search-row">
    <div class="search-input-wrap">
      <NIcon :size="18" class="search-icon"><SearchOutline /></NIcon>
      <input v-model="searchKeyword" placeholder="搜索技能..." class="search-input" />
    </div>
    <span class="search-count">{{ skillsStore.filteredSkills.length }} 项</span>
  </div>

  <!-- Agent Filter -->
  <AgentTagBar />

  <!-- Skill List -->
  <div class="skill-list">
    <TransitionGroup name="list">
      <SkillRow v-for="skill in skillsStore.filteredSkills" :key="skill.id" :skill="skill" />
    </TransitionGroup>
  </div>
</div>
```

Styles: Use tokens for all values. Hero gradient, pill inputs, card items.

- [ ] **Step 2: Verify page renders with hero section**

Run `npm run dev`, navigate to InstalledList. Check:

- Gradient hero banner at top
- White pill search bar below
- Skill list items as cards

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/InstalledList.vue
git commit -m "feat: redesign InstalledList with hero section and card list"
```

---

### Task 9: Restyle SkillRow.vue

**Files:**

- Modify: `src/renderer/src/components/skills/SkillRow.vue`

- [ ] **Step 1: Update SkillRow template and styles**

Key changes:

- Wrap in card container: `border-radius: var(--radius-lg)`, `border: 1px solid var(--color-hairline)`
- Hover: `box-shadow: var(--shadow-2)`
- Skill name: `font-weight: var(--weight-semibold)`, `font-size: var(--text-body-md)`
- Agent tags: small pill badges `rounded-full`
- Action buttons: fade in on hover, use pill style

- [ ] **Step 2: Verify card-style skill rows**

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/skills/SkillRow.vue
git commit -m "feat: restyle SkillRow as card-style list item"
```

---

### Task 10: Restyle AgentTagBar.vue

**Files:**

- Modify: `src/renderer/src/components/skills/AgentTagBar.vue`

- [ ] **Step 1: Update AgentTagBar styles**

Key changes:

- Pills: `border-radius: var(--radius-full)`
- Inactive: `background: var(--color-surface)`, `border: 1px solid var(--color-hairline)`
- Active: `background: var(--color-primary)`, `color: white`
- Transitions on state change

- [ ] **Step 2: Verify pill filter bar**

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/skills/AgentTagBar.vue
git commit -m "feat: restyle AgentTagBar with pill buttons and tokens"
```

---

### Task 11: Restyle SkillSearchBar.vue

**Files:**

- Modify: `src/renderer/src/components/skills/SkillSearchBar.vue`

- [ ] **Step 1: Update SkillSearchBar styles**

Key changes:

- Input: `border-radius: var(--radius-full)`, 40px height
- Search icon prefix
- Search button: `background: var(--color-primary)`, white text, `border-radius: var(--radius-full)`

- [ ] **Step 2: Verify styled search bar**

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/skills/SkillSearchBar.vue
git commit -m "feat: restyle SkillSearchBar as pill input"
```

---

### Task 12: P1 Visual Verification

- [ ] **Step 1: Full visual review of InstalledList page**

Run `npm run dev`, navigate to `/` (InstalledList). Check:

- Hero gradient banner renders
- Search bar is pill-shaped
- Agent filter pills work (toggle agents, see active state)
- Skill list shows as cards
- Card hover shows shadow elevation
- Action buttons appear on card hover
- Refresh button works
- All existing functionality preserved

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: P1 visual verification fixes for InstalledList"
```

---

## Phase P2 — Remaining Pages

### Task 13: Rewrite SkillsSearch.vue

**Files:**

- Modify: `src/renderer/src/views/SkillsSearch.vue`

- Centered large pill search bar (48px height)
- Search results as grid: `repeat(auto-fill, minmax(280px, 1fr))`
- Each card: `rounded-xl`, hover shows 3px `brand-coral` left border + shadow
- Install button: `brand-coral` accent pill

---

### Task 14: Restyle SearchResultCard.vue

**Files:**

- Modify: `src/renderer/src/components/skills/SearchResultCard.vue`

- White card, `rounded-xl`, `hairline` border
- Install count badge: `brand-blue-200` bg + `brand-blue-deep` text
- Package ref: monospace, `text-caption` size
- Install button: `brand-coral` pill

---

### Task 15: Rewrite SkillDetail.vue

**Files:**

- Modify: `src/renderer/src/views/SkillDetail.vue`

- Breadcrumb back navigation (← icon + text)
- Large title + package name code badge
- Action buttons: primary black pill (install/update), outline red (delete)
- CommandOutput: dark theme card

---

### Task 16: Rewrite AgentView.vue

**Files:**

- Modify: `src/renderer/src/views/AgentView.vue`

- Top: search input + refresh button
- Agent cards grid: gradient backgrounds (coral/blue/purple/magenta cycled)
- `rounded-hero`(32px), white text, `rgba(0,0,0,0.15)` overlay
- Agent name + skill count badge (semi-transparent white bg)
- Hover: shadow level 3
- Right drawer for detail: white bg, list items

---

### Task 17: Rewrite SettingsView.vue

**Files:**

- Modify: `src/renderer/src/views/SettingsView.vue`

- Centered form, `max-width: 480px`
- Labels: `text-body-sm`, `weight-medium`
- Controls via NaiveUI (already themed)
- Save button: primary black pill

---

### Task 18: Rewrite EnvDetection.vue

**Files:**

- Modify: `src/renderer/src/views/EnvDetection.vue`

- Centered card `rounded-xxl`(20px)
- Top brand-color stripe decoration (3px gradient bar)
- Check results: icon + text alignment
- Status icons: green check / red x

---

### Task 19: Restyle SkillInstallDialog.vue

**Files:**

- Modify: `src/renderer/src/components/skills/SkillInstallDialog.vue`

- Modal: `rounded-xxl`(20px) via NaiveUI theme override
- Steps indicator with brand colors
- Agent checkboxes as card-style selection

---

### Task 20: Restyle CommandOutput.vue

**Files:**

- Modify: `src/renderer/src/components/common/CommandOutput.vue`

- Dark theme: `#1e1e1e` bg, `rounded-md`, subtle shadow
- Monospace font
- Skill reference links: `brand-blue` color

---

### Task 21: Restyle AppLoading.vue

**Files:**

- Modify: `src/renderer/src/components/common/AppLoading.vue`

- Brand-color spinner (coral/purple gradient)
- Fade transition
- Semi-transparent overlay

---

### Task 22: P2 Visual Verification

- [ ] Verify each page renders correctly
- [ ] Verify all navigation works
- [ ] Verify all interactions (install, update, remove, search) still function
- [ ] Commit any fixes

---

## Phase P3 — Polish

### Task 23: Animation Tuning

- Verify route transition: fade + translateY(8px → 0), 200ms
- Verify card hover: shadow elevation, 150ms
- Verify sidebar active bar: slide, 150ms
- Remove any unnecessary transitions

### Task 24: Edge Cases & Responsive

- Empty states styling
- Loading states
- Error states
- Long text overflow handling
- Scroll behavior in content area

### Task 25: Final QA

- [ ] All pages render without console errors
- [ ] All functionality preserved (install, update, remove, search, filter)
- [ ] Font loads correctly (check network tab for local woff2 files)
- [ ] Sidebar navigation works for all routes
- [ ] Active state correct on all pages
- [ ] Commit final state

```bash
git add -A
git commit -m "feat: complete UI redesign - brand-color vibrant design with token system"
```
