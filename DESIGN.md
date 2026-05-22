---
name: NPX Skills UI
description: Desktop GUI for managing AI agent skills across 50+ coding agents
colors:
  carbon-ink: '#0a0a0a'
  text-primary: '#1a1a1a'
  text-secondary: '#6b7280'
  text-muted: '#9ca3af'
  canvas: '#ffffff'
  surface: '#f7f8fa'
  hairline: '#e5e7eb'
  ember-coral: '#ff5530'
  steel-blue: '#1456f0'
  neon-magenta: '#ea5ec1'
  ion-purple: '#a855f7'
  ember-coral-light: '#ff7a59'
  ember-coral-dark: '#e64720'
  steel-blue-200: '#dbeafe'
  steel-blue-deep: '#1e40af'
  neon-magenta-light: '#ff6ec7'
  success-bg: '#dcfce7'
  success-text: '#166534'
  error: '#d45656'
  error-bg: '#fef2f2'
  sidebar-dark-start: '#0a0a0a'
  sidebar-dark-end: '#1a1a2e'
typography:
  display:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: '0.8125rem'
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: '0.5px'
rounded:
  xs: '4px'
  sm: '6px'
  md: '8px'
  lg: '12px'
  xl: '16px'
  xxl: '20px'
  hero: '32px'
  full: '9999px'
spacing:
  xxs: '4px'
  xs: '8px'
  sm: '12px'
  md: '16px'
  lg: '20px'
  xl: '24px'
  xxl: '32px'
  xxxl: '48px'
components:
  button-primary:
    backgroundColor: '{colors.carbon-ink}'
    textColor: '{colors.canvas}'
    rounded: '{rounded.full}'
    padding: '8px 20px'
  button-primary-hover:
    backgroundColor: '{colors.text-primary}'
  button-secondary:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.full}'
  chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text-secondary}'
    rounded: '{rounded.full}'
    padding: '4px 12px'
  card:
    backgroundColor: '{colors.canvas}'
    rounded: '{rounded.xl}'
    padding: '16px'
  input:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.md}'
    height: '40px'
  nav-sidebar:
    backgroundColor: '{colors.sidebar-dark-start}'
    width: '60px'
---

# Design System: NPX Skills UI

## 1. Overview

**Creative North Star: "The Operator's Console"**

A dark command strip on the left. A bright, dense work surface on the right. Every element is a control, every glance yields information. This is not a place for exploration or discovery. It is a place for execution.

The design system serves a single posture: a developer opens the app to do one specific thing (install a skill, check an agent, update everything), does it in seconds, and closes it. The interface earns trust by being fast, predictable, and visually decisive. No decorative gradients, no loading animations, no celebration states. When an action completes, the list updates. That is the feedback.

The dark sidebar is the constant: it anchors navigation and signals "this is a tool, not a website." The content area is clean canvas where information density wins over whitespace. Agent cards use saturated color to make the multi-agent landscape scannable at a glance.

**Key Characteristics:**

- Dark sidebar + light canvas: two-zone architecture with distinct purposes
- Pill-shaped controls: every button is a rounded pill (9999px radius), forming a consistent tactile vocabulary
- Tonal layering over shadows: surfaces differentiate by background color value, not by drop shadows
- Single font family: DM Sans carries every role from page titles to button labels
- Four-brand-color agent system: coral, blue, magenta, purple distinguish agents visually

## 2. Colors

The palette is split into two zones: the dark command strip (sidebar) and the bright work surface (content). Neutrals lean cool-gray with no warm tint. Brand colors are saturated and used structurally for agent differentiation, not decoratively.

### Primary

- **Ember Coral** (#ff5530): The primary brand accent. Used for the sidebar active indicator bar and the FAB hover state. Appears on approximately 5% of any given screen. Its rarity is intentional.

### Secondary

- **Steel Blue** (#1456f0): The work accent. Used for toolbar badges (skill count, agent count), external links, search results, and agent card color theme 1. Carries the "clickable" or "active" signal in the content area.
- **Steel Blue Deep** (#1e40af): Used for text on light blue badges (install count chips).
- **Steel Blue 200** (#dbeafe): Light tint for hover states, drop zone backgrounds, and subtle blue backgrounds.

### Tertiary

- **Neon Magenta** (#ea5ec1): Agent card color theme 2. Used structurally to distinguish agent groups.
- **Ion Purple** (#a855f7): Agent card color theme 3. Used structurally to distinguish agent groups.

### Neutral

- **Carbon Ink** (#0a0a0a): Primary action buttons, sidebar background start, active text. The deepest value in the system.
- **Text Primary** (#1a1a1a): All body text, headings, and labels. Never pure black.
- **Text Secondary** (#6b7280): Supporting text, descriptions, secondary information. Visible but clearly subordinate.
- **Text Muted** (#9ca3af): Captions, metadata, timestamps. The lightest readable text. Must maintain at least 4.5:1 contrast against canvas.
- **Canvas** (#ffffff): The default background for the content area and cards.
- **Surface** (#f7f8fa): Elevated or grouped surfaces. Sidebar section backgrounds, input backgrounds, skill list area backgrounds.
- **Hairline** (#e5e7eb): Borders, dividers, card outlines. The structural line color.

### Semantic

- **Success Background** (#dcfce7) + **Success Text** (#166534): Environment check pass states.
- **Error** (#d45656) + **Error Background** (#fef2f2): Error states, destructive action buttons, environment check fail states.

### Sidebar Zone

- **Sidebar Dark Start** (#0a0a0a) to **Sidebar Dark End** (#1a1a2e): A subtle vertical gradient on the sidebar. The shift from pure dark to dark-navy adds depth without decoration.
- **Sidebar Icon Default** (rgba(255,255,255,0.55)): Resting state for navigation icons.
- **Sidebar Icon Hover** (rgba(255,255,255,0.85)): Hover state, sufficient contrast against the dark background.
- **Sidebar Icon Active** (#ffffff): The active navigation item. Pure white for maximum signal.
- **Sidebar Divider** (rgba(255,255,255,0.12)): Subtle separator between navigation groups.

**The One Signal Rule.** Ember Coral appears on exactly one element per screen (the active sidebar indicator, or a FAB). It is never used for cards, badges, or decorative fills. When you see coral, it means "you are here."

**The Four-Color Agent Rule.** Steel Blue, Neon Magenta, Ion Purple, and Ember Coral are assigned to agent cards by index (modulo 4). These colors serve a structural purpose: making the agent grid scannable. They are never used for status, priority, or data encoding.

## 3. Typography

**Font Family:** DM Sans ("DM Sans", "Inter", "Helvetica Neue", Arial, sans-serif)
**Mono Family:** "SF Mono", "Consolas", "Monaco", monospace
**Terminal Family:** "Cascadia Code", "Fira Code", "Consolas", monospace

**Character:** A single geometric sans-serif that handles every role. No display/body pairing, no serif counterpoint. DM Sans is clean without being clinical, friendly without being casual. The personality comes from weight and size contrast, not font switching.

### Hierarchy

- **Display** (700, 2rem / 32px, line-height 1.25): Page-level hero text. Reserved for the largest title on any screen. Currently unused in production.
- **Headline** (700, 1.5rem / 24px, line-height 1.25): Page titles ("我的技能", "Agent 管理", "设置"). The typographic anchor of each page.
- **Title** (600, 1.25rem / 20px, line-height 1.25): Section titles and card names. Used inside settings sections.
- **Body** (400, 1rem / 16px, line-height 1.5): Default text for all readable content. Skill names, descriptions, form labels. Max line length 65-75ch for prose blocks.
- **Body Small** (400, 0.875rem / 14px, line-height 1.5): Supporting content, toolbar text, env check labels.
- **Caption** (400, 0.8125rem / 13px, line-height 1.5): Metadata, version numbers, secondary labels. The smallest size used for regular content.
- **Micro** (400, 0.75rem / 12px, line-height 1.5): Badge text, count indicators, timestamps. The minimum readable size.

### Label Convention

Section headers in settings use a label treatment: 0.8125rem, weight 500, text-secondary color, uppercase with 0.5px letter-spacing. This creates a clear "section marker" that is distinct from body text without adding visual weight.

**The Single Family Rule.** DM Sans handles every typographic role. No secondary font is introduced for emphasis. Hierarchy is achieved exclusively through size (0.75rem to 2rem, a 2.67x range) and weight (400 to 700, three steps).

## 4. Elevation

**Direction: Tonal layering.** Depth is conveyed through background color value, not through drop shadows. The hierarchy from back to front:

1. **Canvas** (#ffffff): The base layer. Page backgrounds, card backgrounds at rest.
2. **Surface** (#f7f8fa): One step above canvas. Grouped areas, input backgrounds, panel bodies, env check chips.
3. **Hairline borders** (#e5e7eb): Structural boundaries between surfaces, not elevation.

### Current Shadow Vocabulary (transitional)

- **Shadow 1** (`0 1px 2px rgba(36,36,36,0.06)`): Card rest state. Nearly invisible, adds subtle separation.
- **Shadow 2** (`rgba(36,36,36,0.06) 0 2px 6px -2px`): Skill row hover.
- **Shadow 3** (`rgba(36,36,36,0.08) 0 4px 12px -2px`): Card hover, settings card rest.
- **Shadow 4** (`rgba(36,36,36,0.08) 0 12px 16px -4px`): FAB, elevated modals.

**The Flat-by-Default Rule.** At rest, surfaces are flat. Shadows appear only as a hover response. A card at rest has a hairline border and canvas background; on hover it gains shadow-2 and a muted border. The target system replaces shadows entirely with tonal shifts: hover states deepen the background from canvas to surface rather than adding shadow.

**The No Nested Cards Rule.** Nested cards (a card inside a card) are always wrong. If two levels of grouping are needed, the inner level uses surface background with a hairline border, never a full card with its own shadow.

## 5. Components

### Buttons

- **Shape:** Pill (radius 9999px). Every button in the system shares this shape regardless of size or variant.
- **Primary:** Carbon Ink background, Canvas text, weight 500. Hover darkens to Text Primary.
- **Secondary:** Canvas background, Text Primary text, weight 500, with a 1px hairline border. Hover adds surface background.
- **Ghost/Quaternary:** Transparent background, icon-only (24px touch target), Text Secondary color. Hover adds surface background circle.
- **Danger:** Error border and text, transparent background. Hover adds Error Background.
- **Sizes:** `tiny` (icon buttons in rows), `small` (toolbar actions), `medium` (primary actions), `large` (search, FAB).
- **Focus:** Not currently implemented. Target: 2px solid Ember Coral outline with 2px offset on focus-visible.

### Chips / Tags

- **Shape:** Pill (radius 9999px).
- **Default:** Surface background, Text Secondary text, 1px Hairline border.
- **Active/Selected:** Carbon Ink background, Canvas text, no border. Hover darkens to Text Primary.
- **Agent Tag (in skill rows):** Same as default chip but clickable. Hover inverts to muted background with Text Primary text.
- **Badge (counts):** Steel Blue background, Canvas text, used for toolbar count indicators.

### Cards

- **Corner Style:** XL (16px radius).
- **Background:** Canvas at rest. Surface for grouped areas.
- **Border:** 1px Hairline. Hover shifts to Text Muted border.
- **Shadow Strategy:** Shadow-1 at rest, Shadow-2 or Shadow-3 on hover (transitional, migrating to tonal shifts).
- **Internal Padding:** sm (12px) to md (16px).
- **Agent Cards:** Use brand-color backgrounds (Steel Blue 200, equivalent pink/lavender tints) with corresponding brand-color avatar. Each card has a distinct color theme (modulo 4).

### Inputs / Fields

- **Style:** Canvas background, 1px Hairline border, MD (8px) radius, 40px height.
- **Search Inputs:** Pill shape (9999px radius), Surface background when inside toolbar.
- **Focus:** Not currently styled beyond NaiveUI defaults. Target: Steel Blue border on focus.
- **Prefix Icons:** 16-18px, Text Muted color.

### Navigation (Sidebar)

- **Style:** 60px fixed width, dark gradient background (Carbon Ink to Sidebar Dark End).
- **Items:** 44px square, Hairline-radius-lg, icon-only (24px). No text labels visible; hover shows browser title tooltip.
- **Active State:** White icon, 8% white background overlay, 3px Ember Coral left indicator bar.
- **Divider:** 1px line at 12% white opacity, 24px width, centered.
- **Transition:** 150ms ease on color and background changes.

### Drawers

- **Width:** `min(480px, 40vw)`. Responsive to window width.
- **Background:** Transparent (native NDrawer is transparent, inner content is Canvas).
- **Header:** Surface background, 1px Hairline bottom border. Compact: 12px vertical padding.
- **Body:** Light blue tint background (Steel Blue 200 equivalent). Contains skill cards with Canvas background.

### Modals / Dialogs

- **Border Radius:** XXL (20px) for install dialog, XL (16px) for remove dialog.
- **Background:** Canvas. Content uses standard spacing.
- **Mask:** Semi-transparent, dismissible when not in loading state.

### Command Output / Terminal

- **Background:** #1e1e1e (dark, independent of theme).
- **Text:** #d4d4d4, monospace (Cascadia Code, Fira Code, Consolas).
- **Skill References:** Steel Blue, underlined, clickable.
- **Max Height:** 400px with overflow scroll.

## 6. Do's and Don'ts

### Do:

- **Do** use the pill shape (9999px radius) for every button and chip. Shape consistency is an affordance.
- **Do** use background color value to differentiate surfaces (canvas at base, surface one step up). Shadows are secondary, used only on hover.
- **Do** assign the four brand colors (Ember Coral, Steel Blue, Neon Magenta, Ion Purple) to agent cards by modulo index. This makes the grid scannable without encoding meaning.
- **Do** keep the sidebar dark and minimal. Four icons, no text labels, one active indicator. Navigation is fast because choices are few.
- **Do** use DM Sans weight 700 for headlines and 600 for titles. The weight jump from 400 body to 700 headline (1.75x ratio) creates clear hierarchy.
- **Do** ensure all text meets WCAG AA contrast (4.5:1 for normal text, 3:1 for large text). Test Text Muted (#9ca3af) against Canvas; darken if below threshold.
- **Do** make interactive elements keyboard accessible. Buttons should be `<button>` elements, not `<div>` with click handlers. Add `focus-visible` styles.

### Don't:

- **Don't** use generic SaaS dashboard patterns: hero metrics, gradient accents, card grids with identical tiles, or blue-and-white everything. This is a developer's tool, not a marketing page. (PRODUCT.md anti-reference)
- **Don't** use `#000` or `#fff` directly. Carbon Ink and Canvas are the system's darkest and lightest values, tinted with the brand's cool-gray character.
- **Don't** add decorative motion. Transitions are 100-200ms ease, used for state changes (hover, route change, expand/collapse). No orchestrated page-load sequences, no bounce easing, no elastic curves. (PRODUCT.md: "Speed over polish")
- **Don't** nest cards. A card inside a card is always wrong. Use Surface background + Hairline border for inner grouping instead.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards or list items. The sidebar's 3px active bar is the one exception, justified by navigation context.
- **Don't** use gradient text (`background-clip: text` with a gradient). Emphasis comes from weight or size.
- **Don't** hard-code colors outside of tokens.css. Every color value in component CSS must reference a CSS custom property. If a token doesn't exist for the needed value, add one to tokens.css first.
- **Don't** hide scrollbars globally. Developers rely on scroll position for spatial orientation. Use thin overlay scrollbars or NaiveUI's NScrollbar instead of `scrollbar-width: none` on `*`.
- **Don't** use modals as the first solution for progressive flows. The install dialog is justified by its multi-step nature. Confirm removals inline when possible.
