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

## Auto-Update

`electron-updater` is configured with a generic provider. Update URL in `electron-builder.yml` is currently a placeholder (`https://example.com/auto-updates`).
