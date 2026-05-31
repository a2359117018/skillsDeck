---
name: skillsDeck
description: Desktop GUI for managing AI agent skills across 50+ coding agents
colors:
  color-primary: '#0a0a0a'
  color-ink: '#1a1a1a'
  color-stone: '#6b7280'
  color-muted: '#757575'
  color-canvas: '#ffffff'
  color-surface: '#f7f8fa'
  color-hairline: '#e5e7eb'
  color-hairline-hover: '#d1d5db'
  color-brand-coral: '#ff5530'
  color-brand-blue: '#1456f0'
  color-brand-magenta: '#ea5ec1'
  color-brand-purple: '#a855f7'
  color-brand-blue-200: '#dbeafe'
  color-brand-blue-deep: '#1e40af'
  color-brand-coral-light: '#ff7a59'
  color-brand-magenta-light: '#ff6ec7'
  color-brand-coral-dark: '#e64720'
  color-avatar-coral: '#c4321a'
  color-avatar-blue: '#1e40af'
  color-avatar-magenta: '#c43a9a'
  color-avatar-purple: '#7c3aed'
  color-agent-coral-bg: '#fff5f2'
  color-agent-coral-border: '#ffe0d6'
  color-agent-blue-bg: '#eff6ff'
  color-agent-blue-border: '#dbeafe'
  color-agent-magenta-bg: '#fdf2f8'
  color-agent-magenta-border: '#fce7f3'
  color-agent-purple-bg: '#faf5ff'
  color-agent-purple-border: '#f3e8ff'
  color-brand-blue-tint: 'rgba(37, 99, 235, 0.08)'
  color-interactive-accent: '#2563eb'
  color-success-bg: '#dcfce7'
  color-success-text: '#166534'
  color-warning: '#f0a020'
  color-warning-bg: '#fffbeb'
  color-warning-border: 'rgba(240, 160, 32, 0.35)'
  color-error: '#d45656'
  color-error-bg: '#fef2f2'
  sidebar-bg: '#111111'
  sidebar-icon-color: 'rgba(255, 255, 255, 0.7)'
  sidebar-icon-hover-color: 'rgba(255, 255, 255, 0.85)'
  sidebar-icon-active-color: '#ffffff'
  sidebar-item-hover-bg: 'rgba(255, 255, 255, 0.05)'
  sidebar-item-active-bg: 'rgba(255, 255, 255, 0.1)'
  sidebar-divider-color: 'rgba(255, 255, 255, 0.12)'
  color-terminal-bg: '#1e1e1e'
  color-terminal-text: '#d4d4d4'
typography:
  text-hero:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.25
  text-heading-lg:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.25
  text-heading-md:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.25
  text-heading-sm:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.25
  text-body-lg:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '1.0625rem'
    fontWeight: 400
    lineHeight: 1.5
  text-body-md:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  text-body-sm:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  text-caption:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '0.8125rem'
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: '0.5px'
  text-micro:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.5
rounded:
  radius-xs: '4px'
  radius-sm: '6px'
  radius-md: '8px'
  radius-lg: '12px'
  radius-xl: '16px'
  radius-xxl: '20px'
  radius-hero: '32px'
  radius-full: '9999px'
spacing:
  space-xxs: '4px'
  space-xs: '8px'
  space-sm: '12px'
  space-md: '16px'
  space-lg: '20px'
  space-xl: '24px'
  space-xxl: '32px'
  space-xxxl: '48px'
  space-section: '64px'
  space-section-lg: '80px'
components:
  button-primary:
    backgroundColor: '{colors.color-primary}'
    textColor: '{colors.color-canvas}'
    rounded: '{rounded.radius-full}'
    padding: '8px 20px'
  button-primary-hover:
    backgroundColor: '{colors.color-ink}'
  button-secondary:
    backgroundColor: '{colors.color-canvas}'
    textColor: '{colors.color-ink}'
    rounded: '{rounded.radius-full}'
  chip:
    backgroundColor: '{colors.color-surface}'
    textColor: '{colors.color-stone}'
    rounded: '{rounded.radius-full}'
    padding: '4px 12px'
  card:
    backgroundColor: '{colors.color-canvas}'
    rounded: '{rounded.radius-xl}'
    padding: '16px'
  input:
    backgroundColor: '{colors.color-canvas}'
    textColor: '{colors.color-ink}'
    rounded: '{rounded.radius-md}'
    height: '40px'
  nav-sidebar:
    backgroundColor: '{colors.sidebar-bg}'
    width: '72px'
---

# Design System: skillsDeck

## 1. Overview

**Creative North Star: "The Operator's Console"**

A dark command strip on the left. A bright, dense work surface on the right. Every element is a control, every glance yields information. This is not a place for exploration or discovery. It is a place for execution.

The design system serves a single posture: a developer opens the app to do one specific thing (install a skill, check an agent, update everything), does it in seconds, and closes it. The interface earns trust by being fast, predictable, and visually decisive. No decorative gradients, no loading animations, no celebration states. When an action completes, the list updates. That is the feedback.

The dark sidebar is the constant: it anchors navigation and signals "this is a tool, not a website." The content area is clean canvas where information density wins over whitespace. Agent cards use saturated color to make the multi-agent landscape scannable at a glance.

**Key Characteristics:**

- Dark sidebar (`--sidebar-bg`: #111111) + light canvas (`--color-canvas`: #ffffff): two-zone architecture with distinct purposes
- Pill-shaped controls: every button is a rounded pill (`--radius-full`: 9999px), forming a consistent tactile vocabulary
- Tonal layering over shadows: surfaces differentiate by background color value, not by drop shadows
- Single font family: DM Sans carries every role from page titles to button labels
- Four-brand-color agent system: coral, blue, magenta, purple distinguish agents visually

## 2. Colors

The palette is split into two zones: the dark command strip (sidebar) and the bright work surface (content). Neutrals lean cool-gray with no warm tint. Brand colors are saturated and used structurally for agent differentiation, not decoratively.

### Primary

- **Ember Coral** (`--color-brand-coral`, #ff5530): The primary brand accent. Used for the sidebar active indicator bar and the FAB hover state. Appears on approximately 5% of any given screen. Its rarity is intentional.

### Secondary

- **Steel Blue** (`--color-brand-blue`, #1456f0): The work accent. Used for toolbar badges (skill count, agent count), external links, search results, and agent card color theme 1. Carries the "clickable" or "active" signal in the content area.
- **Steel Blue Deep** (`--color-brand-blue-deep`, #1e40af): Used for text on light blue badges (install count chips).
- **Steel Blue 200** (`--color-brand-blue-200`, #dbeafe): Light tint for hover states, drop zone backgrounds, and subtle blue backgrounds.

### Tertiary

- **Neon Magenta** (`--color-brand-magenta`, #ea5ec1): Agent card color theme 2. Used structurally to distinguish agent groups.
- **Ion Purple** (`--color-brand-purple`, #a855f7): Agent card color theme 3. Used structurally to distinguish agent groups.

### Neutral

- **Carbon Ink** (`--color-primary`, #0a0a0a): Primary action buttons, active text. The deepest value in the system.
- **Text Primary** (`--color-ink`, #1a1a1a): All body text, headings, and labels. Never pure black.
- **Text Secondary** (`--color-stone`, #6b7280): Supporting text, descriptions, secondary information. Visible but clearly subordinate.
- **Text Muted** (`--color-muted`, #757575): Captions, metadata, timestamps. The lightest readable text. Must maintain at least 4.5:1 contrast against canvas. This value was deepened from #9ca3af to pass WCAG AA.
- **Canvas** (`--color-canvas`, #ffffff): The default background for the content area and cards.
- **Surface** (`--color-surface`, #f7f8fa): Elevated or grouped surfaces. Sidebar section backgrounds, input backgrounds, skill list area backgrounds.
- **Hairline** (`--color-hairline`, #e5e7eb): Borders, dividers, card outlines. The structural line color.
- **Hairline Hover** (`--color-hairline-hover`, #d1d5db): Border color on hover states.

### Semantic

- **Success Background** (`--color-success-bg`, #dcfce7) + **Success Text** (`--color-success-text`, #166534): Environment check pass states.
- **Error** (`--color-error`, #d45656) + **Error Background** (`--color-error-bg`, #fef2f2): Error states, destructive action buttons, environment check fail states.
- **Warning** (`--color-warning`, #f0a020) + **Warning Background** (`--color-warning-bg`, #fffbeb) + **Warning Border** (`--color-warning-border`, rgba(240, 160, 32, 0.35)): Warning states and alerts.

### Sidebar Zone

- **Sidebar Background** (`--sidebar-bg`, #111111): Flat dark background for the sidebar. No gradient.
- **Sidebar Icon Default** (`--sidebar-icon-color`, rgba(255,255,255,0.7)): Resting state for navigation icons.
- **Sidebar Icon Hover** (`--sidebar-icon-hover-color`, rgba(255,255,255,0.85)): Hover state, sufficient contrast against the dark background.
- **Sidebar Icon Active** (`--sidebar-icon-active-color`, #ffffff): The active navigation item. Pure white for maximum signal.
- **Sidebar Item Hover** (`--sidebar-item-hover-bg`, rgba(255,255,255,0.05)): Hover background for sidebar items.
- **Sidebar Item Active** (`--sidebar-item-active-bg`, rgba(255,255,255,0.1)): Active background for sidebar items.
- **Sidebar Divider** (`--sidebar-divider-color`, rgba(255,255,255,0.12)): Subtle separator between navigation groups.

### Agent Card Tints (Four-Color Cycling)

These tokens assign background and border colors to agent cards by index (modulo 4):

- Coral: `--color-agent-coral-bg` (#fff5f2) / `--color-agent-coral-border` (#ffe0d6)
- Blue: `--color-agent-blue-bg` (#eff6ff) / `--color-agent-blue-border` (#dbeafe)
- Magenta: `--color-agent-magenta-bg` (#fdf2f8) / `--color-agent-magenta-border` (#fce7f3)
- Purple: `--color-agent-purple-bg` (#faf5ff) / `--color-agent-purple-border` (#f3e8ff)

### Avatar Dark Variants

Darkened brand colors for avatar backgrounds with white text (WCAG AA compliant):

- `--color-avatar-coral` (#c4321a)
- `--color-avatar-blue` (#1e40af)
- `--color-avatar-magenta` (#c43a9a)
- `--color-avatar-purple` (#7c3aed)

### Terminal

- **Terminal Background** (`--color-terminal-bg`, #1e1e1e): Dark terminal output background.
- **Terminal Text** (`--color-terminal-text`, #d4d4d4): Monospace terminal text color.

**The One Signal Rule.** `--color-brand-coral` appears on exactly one element per screen (the active sidebar indicator, or a FAB). It is never used for cards, badges, or decorative fills. When you see coral, it means "you are here."

**The Four-Color Agent Rule.** `--color-brand-blue`, `--color-brand-magenta`, `--color-brand-purple`, and `--color-brand-coral` are assigned to agent cards by index (modulo 4). These colors serve a structural purpose: making the agent grid scannable. They are never used for status, priority, or data encoding.

## 3. Typography

**Font Family:** DM Sans ("DM Sans", "Inter", "Helvetica Neue", Arial, sans-serif)
**Mono Family:** "SF Mono", "Consolas", "Monaco", monospace
**Terminal Family:** "Cascadia Code", "Fira Code", "Consolas", monospace

**Character:** A single geometric sans-serif that handles every role. No display/body pairing, no serif counterpoint. DM Sans is clean without being clinical, friendly without being casual. The personality comes from weight and size contrast, not font switching.

### Hierarchy

- **Display** (`--text-hero`, 700, 2rem / 32px, line-height 1.25): Page-level hero text. Reserved for the largest title on any screen. Currently unused in production.
- **Headline** (`--text-heading-lg`, 700, 1.5rem / 24px, line-height 1.25): Page titles ("我的技能", "Agent 管理", "设置"). The typographic anchor of each page.
- **Title** (`--text-heading-md`, 600, 1.25rem / 20px, line-height 1.25): Section titles and card names. Used inside settings sections.
- **Body** (`--text-body-md`, 400, 1rem / 16px, line-height 1.5): Default text for all readable content. Skill names, descriptions, form labels. Max line length 65-75ch for prose blocks.
- **Body Small** (`--text-body-sm`, 400, 0.875rem / 14px, line-height 1.5): Supporting content, toolbar text, env check labels.
- **Caption** (`--text-caption`, 400, 0.8125rem / 13px, line-height 1.5): Metadata, version numbers, secondary labels. The smallest size used for regular content.
- **Micro** (`--text-micro`, 400, 0.75rem / 12px, line-height 1.5): Badge text, count indicators, timestamps. The minimum readable size.

### Label Convention

Section headers in settings use a label treatment: `--text-caption` size, weight 500 (`--weight-medium`), `--color-stone` color, uppercase with 0.5px letter-spacing. This creates a clear "section marker" that is distinct from body text without adding visual weight.

**The Single Family Rule.** DM Sans handles every typographic role. No secondary font is introduced for emphasis. Hierarchy is achieved exclusively through size (`--text-micro` to `--text-hero`, a 2.67x range) and weight (`--weight-regular` to `--weight-bold`, three steps).

## 4. Elevation

**Direction: Tonal layering.** Depth is conveyed through background color value, not through drop shadows. The hierarchy from back to front:

1. **Canvas** (`--color-canvas`, #ffffff): The base layer. Page backgrounds, card backgrounds at rest.
2. **Surface** (`--color-surface`, #f7f8fa): One step above canvas. Grouped areas, input backgrounds, panel bodies, env check chips.
3. **Hairline borders** (`--color-hairline`, #e5e7eb): Structural boundaries between surfaces, not elevation.

### Shadow Vocabulary (transitional)

- **Shadow 1** (`--shadow-1`, `0 1px 2px rgba(36,36,36,0.06)`): Card rest state. Nearly invisible, adds subtle separation.
- **Shadow 2** (`--shadow-2`, `rgba(36,36,36,0.06) 0 2px 6px -2px`): Skill row hover.
- **Shadow 3** (`--shadow-3`, `rgba(36,36,36,0.08) 0 4px 12px -2px`): Card hover, settings card rest.
- **Shadow 4** (`--shadow-4`, `rgba(36,36,36,0.08) 0 12px 16px -4px`): FAB, elevated modals.
- **Shadow 0** (`--shadow-0`, `none`): Explicit no-shadow.

**The Flat-by-Default Rule.** At rest, surfaces are flat. Shadows appear only as a hover response. A card at rest has a hairline border and canvas background; on hover it gains shadow-2 and a muted border. The target system replaces shadows entirely with tonal shifts: hover states deepen the background from canvas to surface rather than adding shadow.

**The No Nested Cards Rule.** Nested cards (a card inside a card) are always wrong. If two levels of grouping are needed, the inner level uses surface background with a hairline border, never a full card with its own shadow.

## 5. Components

> NaiveUI 组件的主题覆盖完整映射详见 [references/naiveui-theme.md](references/naiveui-theme.md)。本章节只描述视觉语义和设计意图。

### Layout

- **App Shell:** Flex 水平排列。左侧为固定宽度的 sidebar (`--sidebar-width`: 72px)，右侧为 flex column 的页面容器。
- **Page Container:** `width: 100%` + padding 填满内容区。禁止给页面容器设固定像素宽度。文本块可用 `max-width: 75ch` 限制行宽。
- **Card Grid:** CSS grid + `repeat(auto-fill, minmax(280px, 1fr))`。不使用 flex wrap。
- **Spacing Strategy:** Flex/grid 容器使用 `gap` + spacing token 控制间距，避免在子元素上用 margin 拆分。
- **Minimum Window:** 1200×800。布局在此尺寸下必须可用。

### Toolbar

- **Structure:** Flex row + gap。必须 `flex-wrap: wrap` 以适应不同窗口宽度。
- **Search Inputs:** 当位于 toolbar 内时使用 pill shape (`--radius-full`) 和 `--color-surface` 背景。

### Buttons

- **Shape:** Pill (`--radius-full`: 9999px). Every button in the system shares this shape regardless of size or variant.
- **Primary:** `--color-primary` background, `--color-canvas` text, weight 500. Hover darkens to `--color-ink`.
- **Secondary:** `--color-canvas` background, `--color-ink` text, weight 500, with a 1px `--color-hairline` border. Hover adds `--color-surface` background.
- **Ghost/Quaternary:** Transparent background, icon-only (24px touch target), `--color-stone` color. Hover adds `--color-surface` background circle.
- **Danger:** `--color-error` border and text, transparent background. Hover adds `--color-error-bg`.
- **Sizes:** `tiny` (icon buttons in rows), `small` (toolbar actions), `medium` (primary actions), `large` (search, FAB).
- **Focus:** 2px solid `--color-brand-coral` outline with 2px offset on focus-visible.

### Chips / Tags

- **Shape:** Pill (`--radius-full`: 9999px).
- **Default:** `--color-surface` background, `--color-stone` text, 1px `--color-hairline` border.
- **Active/Selected:** `--color-primary` background, `--color-canvas` text, no border. Hover darkens to `--color-ink`.
- **Agent Tag (in skill rows):** Same as default chip but clickable. Hover inverts to muted background with `--color-ink` text.
- **Badge (counts):** `--color-brand-blue` background, `--color-canvas` text, used for toolbar count indicators.

### Cards / Containers

- **Corner Style:** XL (`--radius-xl`: 16px).
- **Background:** `--color-canvas` at rest. `--color-surface` for grouped areas.
- **Border:** 1px `--color-hairline`. Hover shifts to `--color-muted` border.
- **Shadow Strategy:** `--shadow-1` at rest, `--shadow-2` or `--shadow-3` on hover (transitional, migrating to tonal shifts).
- **Internal Padding:** `--space-sm` (12px) to `--space-md` (16px).
- **Agent Cards:** Use brand-color backgrounds (`--color-agent-blue-bg`, equivalent pink/lavender tints) with corresponding brand-color avatar. Each card has a distinct color theme (modulo 4).

### Inputs / Fields

- **Style:** `--color-canvas` background, 1px `--color-hairline` border, MD (`--radius-md`: 8px) radius, 40px height.
- **Search Inputs:** Pill shape (`--radius-full`: 9999px), `--color-surface` background when inside toolbar.
- **Focus:** `--color-brand-blue` border on focus.
- **Prefix Icons:** 16-18px, `--color-muted` color.

### Navigation (Sidebar)

- **Style:** `--sidebar-width` (72px) fixed width, flat dark background (`--sidebar-bg`: #111111).
- **Items:** 44px square, `--radius-lg` (12px), icon-only (24px). No text labels visible; hover shows browser title tooltip.
- **Active State:** White icon (`--sidebar-icon-active-color`), 8% white background overlay (`--sidebar-item-active-bg`), 3px `--color-brand-coral` left indicator bar.
- **Divider:** 1px line at 12% white opacity (`--sidebar-divider-color`), 24px width, centered.
- **Transition:** `--transition-base` (150ms ease) on color and background changes.

### Drawers

- **Width:** `min(480px, 40vw)`. Responsive to window width.
- **Background:** Transparent (native NDrawer is transparent, inner content is `--color-canvas`).
- **Header:** `--color-surface` background, 1px `--color-hairline` bottom border. Compact: `--space-sm` (12px) vertical padding.
- **Body:** Light blue tint background (`--color-brand-blue-200` equivalent). Contains skill cards with `--color-canvas` background.

### Modals / Dialogs

- **Border Radius:** XXL (`--radius-xxl`: 20px) for install dialog, XL (`--radius-xl`: 16px) for remove dialog.
- **Background:** `--color-canvas`. Content uses standard spacing.
- **Mask:** Semi-transparent, dismissible when not in loading state.

### Command Output / Terminal

- **Background:** `--color-terminal-bg` (#1e1e1e, dark, independent of theme).
- **Text:** `--color-terminal-text` (#d4d4d4), monospace (Cascadia Code, Fira Code, Consolas).
- **Skill References:** `--color-brand-blue`, underlined, clickable.
- **Max Height:** 400px with overflow scroll.

## 6. Do's and Don'ts

### Do:

- **Do** use the pill shape (`--radius-full`: 9999px) for every button and chip. Shape consistency is an affordance.
- **Do** use background color value to differentiate surfaces (`--color-canvas` at base, `--color-surface` one step up). Shadows are secondary, used only on hover.
- **Do** assign the four brand colors (`--color-brand-coral`, `--color-brand-blue`, `--color-brand-magenta`, `--color-brand-purple`) to agent cards by modulo index. This makes the grid scannable without encoding meaning.
- **Do** keep the sidebar dark and minimal. Four icons, no text labels, one active indicator. Navigation is fast because choices are few.
- **Do** use DM Sans weight 700 (`--weight-bold`) for headlines and 600 (`--weight-semibold`) for titles. The weight jump from 400 body to 700 headline (1.75x ratio) creates clear hierarchy.
- **Do** ensure all text meets WCAG AA contrast (4.5:1 for normal text, 3:1 for large text). Test `--color-muted` (#757575) against `--color-canvas`; darken if below threshold.
- **Do** make interactive elements keyboard accessible. Buttons should be `<button>` elements, not `<div>` with click handlers. Add `focus-visible` styles.
- **Do** reference CSS variables from `tokens.css` for all colors, spacing, radius, shadows, and transitions. Never hard-code values.

### Don't:

- **Don't** use generic SaaS dashboard patterns: hero metrics, gradient accents, card grids with identical tiles, or blue-and-white everything. This is a developer's tool, not a marketing page. (PRODUCT.md anti-reference)
- **Don't** use `#000` or `#fff` directly. `--color-primary` and `--color-canvas` are the system's darkest and lightest values, tinted with the brand's cool-gray character.
- **Don't** add decorative motion. Transitions are `--transition-fast` (100ms) to `--transition-slow` (200ms) ease, used for state changes (hover, route change, expand/collapse). No orchestrated page-load sequences, no bounce easing, no elastic curves. (PRODUCT.md: "Speed over polish")
- **Don't** nest cards. A card inside a card is always wrong. Use `--color-surface` background + `--color-hairline` border for inner grouping instead.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards or list items. The sidebar's 3px active bar is the one exception, justified by navigation context.
- **Don't** use gradient text (`background-clip: text` with a gradient). Emphasis comes from weight or size.
- **Don't** hard-code colors outside of tokens.css. Every color value in component CSS must reference a CSS custom property. If a token doesn't exist for the needed value, add one to tokens.css first.
- **Don't** hard-code transition timing. Use `--transition-fast` (100ms), `--transition-base` (150ms), or `--transition-slow` (200ms) tokens. The only exception is continuous loading animations (spinners).
- **Don't** hide scrollbars globally. Developers rely on scroll position for spatial orientation. Use thin overlay scrollbars or NaiveUI's NScrollbar instead of `scrollbar-width: none` on `*`.
- **Don't** use modals as the first solution for progressive flows. The install dialog is justified by its multi-step nature. Confirm removals inline when possible.

## 7. Agent Prompt Guide

This section is for AI agents generating code for this project. Follow these rules precisely to avoid UI style errors.

### Token Reference

All visual values must reference `src/renderer/src/assets/tokens.css`. The CSS custom properties defined there are the single source of truth. This DESIGN.md's YAML frontmatter uses the same names (without the `--` prefix).

**Quick mapping:**

| Token type        | CSS variable          | Value   | Usage                             |
| ----------------- | --------------------- | ------- | --------------------------------- |
| Primary action bg | `--color-primary`     | #0a0a0a | Primary buttons, active chip bg   |
| Body text         | `--color-ink`         | #1a1a1a | All text, headings                |
| Secondary text    | `--color-stone`       | #6b7280 | Descriptions, metadata            |
| Muted text        | `--color-muted`       | #757575 | Captions, placeholders            |
| Page bg           | `--color-canvas`      | #ffffff | Page backgrounds, cards           |
| Surface bg        | `--color-surface`     | #f7f8fa | Input bg, grouped areas           |
| Borders           | `--color-hairline`    | #e5e7eb | Card borders, dividers            |
| Brand coral       | `--color-brand-coral` | #ff5530 | Sidebar active indicator          |
| Brand blue        | `--color-brand-blue`  | #1456f0 | Links, badges, search             |
| Error             | `--color-error`       | #d45656 | Error states, destructive actions |
| Sidebar bg        | `--sidebar-bg`        | #111111 | Sidebar background (flat)         |
| Sidebar width     | `--sidebar-width`     | 72px    | Fixed sidebar width               |

**Spacing:** Use `--space-xxs` (4px) through `--space-xxxl` (48px). Never hard-code padding/margin values.

**Radius:** Use `--radius-xs` (4px) through `--radius-full` (9999px). Buttons and chips always use `--radius-full`.

**Shadows:** Use `--shadow-0` (none) through `--shadow-4`. At rest, use no shadow or `--shadow-1`.

**Typography:** Use `--text-micro` (0.75rem) through `--text-hero` (2rem). Weights: `--weight-regular` (400), `--weight-medium` (500), `--weight-semibold` (600), `--weight-bold` (700).

**Transitions:** Use `--transition-fast` (100ms), `--transition-base` (150ms), or `--transition-slow` (200ms).

### NaiveUI Component Rules

When using NaiveUI components, consult [references/naiveui-theme.md](references/naiveui-theme.md) for the complete theme override mapping. Key rules:

- **Colors:** NaiveUI's `themeOverrides` uses hardcoded hex values (JS string literals), not CSS `var()`. If you need to add a new NaiveUI component, check `App.vue` for existing overrides first.
- **Buttons:** All buttons use `borderRadius: '9999px'` (pill shape) and `fontWeight: '500'`.
- **Inputs:** Default border radius is 8px (`--radius-md`), height is 40px.
- **Cards:** Default border radius is 16px (`--radius-xl`), no shadow at rest.
- **Tags/Chips:** Default border radius is 9999px (`--radius-full`).

### Common Mistakes to Avoid

1. **Using old token names.** The old DESIGN.md used names like `carbon-ink`, `ember-coral`, `steel-blue`. These do NOT exist in the code. Use `--color-primary`, `--color-brand-coral`, `--color-brand-blue` instead.
2. **Wrong sidebar width.** The sidebar is 72px wide (`--sidebar-width`), not 60px.
3. **Wrong sidebar background.** The sidebar is flat `#111111` (`--sidebar-bg`), not a gradient.
4. **Wrong muted text color.** `--color-muted` is `#757575`, not `#9ca3af`.
5. **Missing agent card tokens.** Agent cards use `--color-agent-*-bg` and `--color-agent-*-border` tokens, not raw brand colors.
6. **Forgetting dark mode.** `tokens.css` has `[data-theme='dark']` overrides. When adding new color tokens, consider whether they need dark variants.
7. **Hard-coding NaiveUI colors.** Never pass raw hex to NaiveUI props. If a token doesn't exist in `themeOverrides`, add it to `App.vue` first, then document it in `references/naiveui-theme.md`.
