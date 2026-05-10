# UI Redesign Design Spec

## Overview

Full redesign of the npx-skills-ui Electron app, replacing the plain admin-style UI with a vibrant, brand-color-forward design based on DESIGN.md tokens.

**Style**: Brand-color vibrant — bold gradients, hero cards, pill buttons, DM Sans typography, brand colors (coral/magenta/purple) prominently featured.

**Scope**: All views, all components, app shell, design system foundation.

---

## 1. Design Token System

### 1.1 CSS Variables (`tokens.css`)

All DESIGN.md tokens materialized as CSS custom properties on `:root`.

**Units**: px for tokens, rem for typography sizes, flex/grid for layout.

| Category   | Examples                                                                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Colors     | `--color-primary: #0a0a0a`, `--color-brand-coral: #ff5530`, `--color-brand-blue: #1456f0`, `--color-brand-magenta: #ea5ec1`, `--color-brand-purple: #a855f7`, `--color-canvas: #ffffff`, `--color-surface: #f7f8fa`, `--color-hairline: #e5e7eb` |
| Spacing    | `--space-xxs: 4px` through `--space-section-lg: 80px` (12 steps)                                                                                                                                                                                 |
| Radius     | `--radius-xs: 4px` through `--radius-hero: 32px`, `--radius-full: 9999px` (10 steps)                                                                                                                                                             |
| Shadow     | `--shadow-0: none` through `--shadow-4: rgba(36,36,36,0.08) 0 12px 16px -4px` (5 levels)                                                                                                                                                         |
| Typography | `--font-heading-md: 2rem/600` through `--font-micro: 0.75rem/400` (12 levels)                                                                                                                                                                    |

### 1.2 Font

Use `@fontsource/dm-sans` npm package — weights 400, 500, 600, 700. Single typeface, no mixing. Offline-capable, no CDN dependency.

```bash
npm install @fontsource/dm-sans
```

```ts
// In App.vue or main.ts
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
```

Set as default on `body`. Fallback: Inter, Helvetica Neue, Arial.

### 1.3 NaiveUI Theme Override

Via `NConfigProvider.themeOverrides`:

- `primaryColor: '#0a0a0a'`
- `borderRadius: '9999px'` for buttons/tags
- `fontFamily: "'DM Sans', sans-serif"`
- Match input, card, modal radii to token system

---

## 2. App Shell & Sidebar

### 2.1 Sidebar (self-built component, replaces NLayoutSider + NMenu)

- **Width**: 60px, `flex-shrink: 0`, fixed left
- **Background**: dark gradient `#0a0a0a` → `#1a1a2e`, subtle brand-color glow at bottom (coral/purple accent)
- **Nav items**: icon-only (Ionicons5), vertically stacked with 8px gap
  - Skills (CubeOutline) → `installed`
  - Search (SearchOutline) → `search`
  - Divider (thin line, semi-transparent white)
  - Agents (GitMergeOutline) → `agent-view`
  - Divider
  - Settings (SettingsOutline) → `settings`
- **Active state**: 3px wide `brand-coral` bar on left edge + icon turns white
- **Hover**: icon brightness increases, subtle lighter background
- **Top**: brand icon/logo
- **Transitions**: active bar slides with 150ms ease

### 2.2 Content Area

- `flex: 1`, `canvas` white background
- No hard border between sidebar and content (color contrast suffices)
- Route transition: fade + translateY(8px → 0), 200ms ease

---

## 3. Page Designs

### 3.1 Installed Skills (InstalledList.vue)

**Hero Section** (top):

- Auto height, padding `xl`-`xxl`
- Background: `brand-coral` → `brand-purple` subtle gradient, `rounded-xl`(16px)
- White text: title "我的技能" + count badge + action buttons (refresh, update all) as white outline pill buttons
- Decorative: blurred geometric shapes or light spots in background for depth

**Search Bar**:

- Below hero, white pill input `rounded-full`, search icon prefix
- Right side: filtered skill count in `stone` color

**AgentTagBar**:

- Collapsible pill filters, `rounded-full` pills
- Inactive: `surface` bg + `hairline` border
- Active: `primary` bg + white text

**Skill List**:

- Card-style list items replacing row style
- Each item: `rounded-lg`(12px), `hairline` border, hover → shadow level 1 + translateY(-2px)
- Left: skill name (body-md, weight 600) + agent tags (small pill badges)
- Right: action button group, fade in on hover

### 3.2 Skills Search (SkillsSearch.vue)

**Search Bar**:

- Centered, large pill input, `rounded-full`, 48px height
- Search button: `primary` black pill with search icon

**Results**:

- Grid layout: `repeat(auto-fill, minmax(280px, 1fr))`
- Each card: white bg, `rounded-xl`(16px), `hairline` border
- Hover: 3px `brand-coral` left border + shadow elevation
- Content: skill name + install count badge (`brand-blue-200` bg) + package ref (monospace small) + install button (`brand-coral` accent pill)

### 3.3 Skill Detail (SkillDetail.vue)

- Breadcrumb navigation (← back)
- Large title + package name code badge
- Action buttons: primary black pill (install/update), outline red (delete)
- CommandOutput: dark theme, `rounded-md`, subtle shadow

### 3.4 Agents View (AgentView.vue)

- Top: small search input + refresh button
- **Agent cards grid**: brand-color gradient backgrounds (coral/blue/purple/magenta cycled)
  - `rounded-hero`(32px), white text
  - Semi-transparent dark overlay `rgba(0,0,0,0.15)` to ensure text contrast
  - Agent name + skill count badge (semi-transparent white bg)
  - Hover: shadow level 3 (brand-color glow)
- Right drawer for detail: white bg, list items with dividers

### 3.5 Settings (SettingsView.vue)

- Centered form, `max-width` constrained
- Labels: `body-sm-medium`, controls via NaiveUI theme override
- Save button: `primary` black pill

### 3.6 Env Detection (EnvDetection.vue)

- Modal window, centered card `rounded-xxl`(20px)
- Top brand-color stripe decoration
- Check results: icon + text alignment

---

## 4. Component Library

| Component     | Style                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buttons       | All `rounded-full`(9999px). Primary: black bg, white text. Accent: `brand-coral` bg. Secondary: transparent + `ink` border. Tertiary: `canvas` bg + `hairline` border. |
| Inputs        | `rounded-md`(8px), 40px height. Focus: 2px `brand-blue-deep` border. Error: 1px `#d45656` border.                                                                      |
| Badges/Tags   | `rounded-full`. Success: `success-bg`/`success-text`. NEW: `brand-coral` bg + white. Info: `brand-blue-200` bg + `brand-blue-deep` text.                               |
| Cards (base)  | `canvas` bg, `rounded-xl`(16px), `hairline` border, padding `xl`.                                                                                                      |
| Cards (brand) | Gradient bg, `rounded-hero`(32px), white text, padding `xxl`.                                                                                                          |
| Modal/Dialog  | `rounded-xxl`(20px), optional top brand-color stripe.                                                                                                                  |
| Loading       | Brand-color spinner + fade transition.                                                                                                                                 |

---

## 5. Animations

Keep minimal — only functional feedback, no decorative motion.

| Context            | Animation                              |
| ------------------ | -------------------------------------- |
| Route transition   | Fade + translateY(8px → 0), 200ms ease |
| Card hover         | Shadow elevation, 150ms ease           |
| Sidebar active bar | Slide transition, 150ms ease           |

---

## 6. Layout Principles

- **Sidebar**: 60px fixed, `flex-shrink: 0`
- **Content area**: `flex: 1`, auto-fills remaining space
- **Max-width**: content sections use `max-width` (not fixed `width`), centered
- **Grid cards**: `repeat(auto-fill, minmax(Npx, 1fr))` for responsive columns
- **Spacing**: via CSS variable tokens, overridable in media queries if needed

---

## 7. File Changes Overview

### New files:

- `src/renderer/src/assets/tokens.css` — CSS custom properties
- `src/renderer/src/components/layout/AppSidebar.vue` — self-built sidebar

### Major rewrites:

- `src/renderer/src/App.vue` — new shell layout, NaiveUI theme config
- `src/renderer/src/assets/main.css` — DM Sans import, global base
- `src/renderer/src/assets/card.css` — token-based card utilities
- `src/renderer/src/views/InstalledList.vue` — hero section + card list
- `src/renderer/src/views/SkillsSearch.vue` — grid search results
- `src/renderer/src/views/SkillDetail.vue` — styled detail page
- `src/renderer/src/views/AgentView.vue` — gradient agent cards
- `src/renderer/src/views/SettingsView.vue` — styled form
- `src/renderer/src/views/EnvDetection.vue` — styled modal
- `src/renderer/src/components/skills/*.vue` — all skill components restyled
- `src/renderer/src/components/common/*.vue` — common components restyled

### Removed:

- NaiveUI `NLayout`, `NLayoutSider`, `NMenu` usage (replaced by custom sidebar)

### Dependencies:

- `@fontsource/dm-sans` — local font files, replaces Google Fonts CDN
- Ionicons5 already installed

---

## 8. Implementation Phases

### P0 — Design Foundation

- Install `@fontsource/dm-sans`
- Create `tokens.css` with all CSS custom properties
- Create `AppSidebar.vue` custom sidebar
- Update `App.vue` shell layout + NaiveUI themeOverrides
- Update `main.css` global base styles
- **Verify**: sidebar navigation works, tokens apply, font loads

### P1 — First Page (InstalledList)

- Rewrite `InstalledList.vue` with hero section + card list
- Restyle related skill components
- **Verify**: full visual review of one complete page

### P2 — Remaining Pages

- Rewrite `SkillsSearch.vue`, `SkillDetail.vue`, `AgentView.vue`, `SettingsView.vue`, `EnvDetection.vue`
- Restyle common components
- **Verify**: each page independently

### P3 — Polish

- Animation tuning
- Edge cases and responsive checks
- Final visual QA
