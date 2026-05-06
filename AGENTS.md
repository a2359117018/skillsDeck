# AGENTS.md

## Project Overview

Electron + Vue 3 + TypeScript desktop app. Wraps the `npx skills` CLI to provide a GUI for searching, installing, updating, and removing skills packages.

## Architecture

Three-process Electron app:

- **Main** (`src/main/`): Node.js process. Handles window management, IPC, and spawns `npx skills` commands via `execa`.
- **Preload** (`src/preload/`): Context bridge exposing typed APIs to renderer.
- **Renderer** (`src/renderer/src/`): Vue 3 SPA with Vue Router (hash history) and Pinia.
- **Shared** (`src/shared/`): TypeScript interfaces shared across main/preload/renderer.

Entry points:

- Main: `src/main/index.ts`
- Renderer: `src/renderer/src/main.ts`
- Preload: `src/preload/index.ts`

## Developer Commands

```bash
# Development (hot reload for renderer, restart for main)
npm run dev

# Production build (includes typecheck)
npm run build

# Platform-specific distributable
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux

# Code quality
npm run lint         # ESLint with cache
npm run typecheck    # tsc (node) + vue-tsc (web)
npm run format       # Prettier write
```

## Build & Typecheck

- Built with `electron-vite`. Config: `electron.vite.config.ts`.
- Output: `out/` (main), `out/preload/`, `out/renderer/`.
- TypeScript project references: root `tsconfig.json` references `tsconfig.node.json` (main/preload/shared) and `tsconfig.web.json` (renderer).
- **Always run `npm run typecheck` before committing.** It checks both node and web compilations.

## Key Conventions

- **Vue single-file components must use `<script setup lang="ts">`**. ESLint rule `vue/block-lang` enforces `lang="ts"`.
- **Path alias**: `@renderer/*` maps to `src/renderer/src/*`. Used in renderer imports.
- **Prettier config** (`.prettierrc.yaml`): `singleQuote: true`, `semi: false`, `printWidth: 100`, `trailingComma: none`.
- **No tests** currently exist in the repo.

## Multi-Window Behavior

The app creates three window types controlled by the `window` query parameter:

- `main` (default): Primary app shell with sidebar.
- `env`: Modal dialog for environment detection (Node.js installation).
- `settings`: Modal dialog for app settings.

Router handles all views; `App.vue` switches layout based on `windowType`.

## IPC & Services

- IPC handlers registered in `src/main/ipc/index.ts`.
- Domain-specific IPC: `skills.ipc.ts`, `env.ipc.ts`, `store.ipc.ts`.
- Services (business logic): `src/main/services/SkillsService.ts`, `EnvService.ts`, `StoreService.ts`, `WindowManager.ts`.
- Preload exposes APIs on `window.api` (see `src/preload/index.d.ts` for types).

## Skills CLI Integration

`SkillsService` shells out to `npx skills` via `execa`:

- Commands: `find`, `list --json`, `add`, `update`, `remove`.
- **Windows**: `shell: true` is required for `execa` to resolve `npx`.
- **Timeout**: 60 seconds (`COMMAND_TIMEOUT`).
- ANSI output is stripped with `strip-ansi`.

## State & Storage

- **Pinia** for reactive UI state in renderer.
- **electron-store** for persistent settings (main process, exposed via IPC).
- Settings schema: `AppSettings` in `src/shared/types.ts`.

## UI Style Guide

> Full token reference: `DESIGN.md` at project root. The section below is a concise guide for implementation.

### Colors

| Token                         | Hex                   | Usage                                                            |
| ----------------------------- | --------------------- | ---------------------------------------------------------------- |
| `primary`                     | `#0a0a0a`             | Primary CTA buttons, promo banners, dominant interactive element |
| `on-primary`                  | `#ffffff`             | Text on primary/brand-coral/dark surfaces                        |
| `canvas`                      | `#ffffff`             | Page background, card surfaces                                   |
| `surface`                     | `#f7f8fa`             | Subtle section bg, sidebar active state, search pill rest        |
| `surface-soft`                | `#f2f3f5`             | Quieter section divisions                                        |
| `hairline`                    | `#e5e7eb`             | 1px borders (inputs, dividers)                                   |
| `hairline-soft`               | `#eaecf0`             | Secondary dividers, table row separators                         |
| `ink`                         | `#0a0a0a`             | Headlines, CTA text                                              |
| `charcoal`                    | `#222222`             | Body text on light surfaces                                      |
| `slate`                       | `#45515e`             | Secondary text, metadata                                         |
| `steel`                       | `#5f5f5f`             | Tertiary text, table headers, inactive sidebar                   |
| `stone`                       | `#8e8e93`             | Muted captions, inactive tab labels                              |
| `muted`                       | `#a8aab2`             | De-emphasized labels, footer links                               |
| `brand-coral`                 | `#ff5530`             | Accent CTA, "NEW" badges — use sparingly                         |
| `brand-blue`                  | `#1456f0`             | Blue accent, links                                               |
| `brand-blue-deep`             | `#1d4ed8`             | Active input border, link emphasis                               |
| `brand-blue-200`              | `#bfdbfe`             | Code badge bg, info tag bg                                       |
| `brand-magenta`               | `#ea5ec1`             | Product identity accent only                                     |
| `brand-purple`                | `#a855f7`             | Product identity accent only                                     |
| `success-bg` / `success-text` | `#e8ffea` / `#1ba673` | Success badges, confirmations                                    |
| Error (inline)                | `#d45656`             | Error input borders, validation text                             |

### Typography

**Font**: DM Sans (primary), Inter / Helvetica Neue / Arial fallback. Single typeface — never mix.

| Token            | Size | Weight | Line-Height | Letter-Spacing | Use                              |
| ---------------- | ---- | ------ | ----------- | -------------- | -------------------------------- |
| `heading-md`     | 32px | 600    | 1.25        | -0.5px         | Page headlines                   |
| `heading-sm`     | 24px | 600    | 1.30        | 0              | Section headers, card titles     |
| `card-title`     | 20px | 600    | 1.40        | 0              | Feature card titles              |
| `subtitle`       | 18px | 500    | 1.50        | 0              | Section subtitles                |
| `body-md`        | 16px | 400    | 1.50        | 0              | Primary body text                |
| `body-md-bold`   | 16px | 700    | 1.50        | 0              | Body emphasis                    |
| `body-sm`        | 14px | 400    | 1.50        | 0              | Secondary text, nav, table cells |
| `body-sm-medium` | 14px | 500    | 1.50        | 0              | Active nav, button labels        |
| `caption`        | 13px | 400    | 1.70        | 0              | Fine print, captions             |
| `caption-bold`   | 13px | 600    | 1.50        | 0              | Badge labels, table headers      |
| `micro`          | 12px | 400    | 1.50        | 0              | Micro labels, chips              |
| `button-md`      | 14px | 600    | 1.40        | 0              | All button text                  |

**Weight discipline**: 400 (body), 500 (medium), 600 (headings/buttons), 700 (strong emphasis). No heavier weights.

### Spacing

Base unit: 4px. Primary increment: 8px.

| Token        | Value | Use                                |
| ------------ | ----- | ---------------------------------- |
| `xxs`        | 4px   | Tight gaps                         |
| `xs`         | 8px   | Sidebar nav rhythm                 |
| `sm`         | 12px  | Input padding vertical             |
| `md`         | 16px  | Table row padding, standard gap    |
| `lg`         | 20px  | Card internal padding (doc cards)  |
| `xl`         | 24px  | Card internal padding (base cards) |
| `xxl`        | 32px  | Product card padding, section gaps |
| `xxxl`       | 40px  | Large section breathing room       |
| `section`    | 64px  | Section separators (docs)          |
| `section-lg` | 80px  | Section separators (marketing)     |

### Border Radius

| Token  | Value  | Use                                        |
| ------ | ------ | ------------------------------------------ |
| `xs`   | 4px    | Code chips                                 |
| `sm`   | 6px    | Compact controls, table cells, code badges |
| `md`   | 8px    | Inputs, search pill, data tables           |
| `lg`   | 12px   | Doc cards, recommendation tiles            |
| `xl`   | 16px   | Feature cards, standard white cards        |
| `xxl`  | 20px   | Larger panels                              |
| `xxxl` | 24px   | AI product tiles                           |
| `hero` | 32px   | Vibrant product cards, promo CTA           |
| `full` | 9999px | **All buttons, all pill tabs, all badges** |

### Elevation

Predominantly flat. Shadow only for modals/dropdowns.

| Level | Shadow                                 | Use                       |
| ----- | -------------------------------------- | ------------------------- |
| 0     | None, hairline border only             | Cards, inputs, table rows |
| 1     | `rgba(0,0,0,0.04) 0 1px 2px`           | Hover-elevated tiles      |
| 2     | `rgba(0,0,0,0.08) 0 4px 6px`           | Dropdowns, feature cards  |
| 3     | `rgba(0,0,0,0.08) 0 0 22px`            | Featured product glow     |
| 4     | `rgba(36,36,36,0.08) 0 12px 16px -4px` | Modals, sticky panels     |

### Key Component Patterns

**Buttons** — always pill-shaped (`rounded-full`):

- **Primary**: bg `primary`, text white, padding `11px 24px`, pressed → `charcoal`
- **Secondary**: transparent bg, text `ink`, border `1px solid ink`
- **Tertiary**: bg `canvas`, text `ink`, border `1px solid hairline`

**Cards**:

- **Base**: bg `canvas`, `rounded-xl`, padding `xl`, border `1px solid hairline`
- **Feature**: bg `surface`, `rounded-xl`, padding `xxl`
- **Product (vibrant)**: bg brand color, `rounded-hero` (32px), padding `xxl`

**Inputs**: bg `canvas`, border `1px solid hairline`, `rounded-md`, height 40px. Focused → border `2px solid brand-blue-deep`. Error → border `1px solid #d45656`.

**Tabs**:

- **Segmented**: underline style; active = `ink` text + 2px bottom border
- **Pill**: inactive = `canvas` bg + `hairline` border; active = `primary` bg + white text

**Badges** — all `rounded-full`:

- Success: bg `success-bg`, text `success-text`
- NEW: bg `brand-coral`, text white
- BETA/Info: bg `brand-blue-200`, text `brand-blue-deep`
- Code: `rounded-sm`, bg `brand-blue-200`, text `brand-blue-deep`

### Do's and Don'ts

**Do**:

- Use `primary` (black) as the dominant CTA color
- Apply `rounded-full` to every button, pill tab, and badge
- Keep brand colors (coral, magenta, blue, purple) confined to product-identity moments
- Use `body-md` as default body; `subtitle` for emphasis
- Pair `rounded-hero` (32px) gradient cards with `rounded-xl` (16px) white cards for visual contrast

**Don't**:

- Don't use brand colors on body text or large generic surfaces
- Don't soften button corners below `rounded-full`
- Don't introduce a second display typeface
- Don't apply heavy shadows on white cards; flat-with-borders is the default
- Don't put gradient backgrounds on standard buttons

## Auto-Update

`electron-updater` is configured with a generic provider. Update URL in `electron-builder.yml` is currently a placeholder (`https://example.com/auto-updates`).
