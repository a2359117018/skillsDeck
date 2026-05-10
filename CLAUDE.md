# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NPX Skills UI is an Electron desktop app that provides a graphical interface for managing AI coding agent skills via the `npx skills` CLI. It supports searching, installing, updating, and removing skills across 50+ AI agents (Claude Code, Cursor, Codex, etc.). The search API is hosted at `skills.sh`.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server with hot reload
npm run build        # Typecheck + build for production
npm run lint         # ESLint
npm run format       # Prettier formatting
npm run typecheck    # Run both node and web typechecks
npm run build:win    # Build Windows installer
```

## Architecture

Built with **electron-vite** (Vite-based Electron build tooling). Three-process Electron architecture:

```
src/
├── main/            # Main process (Node.js)
│   ├── index.ts          # App lifecycle, window creation
│   ├── services/         # Business logic (singletons)
│   │   ├── CommandRunner.ts   # execa wrapper with streaming/cancel support
│   │   ├── NpxService.ts      # All `npx skills` CLI interactions
│   │   ├── AgentScanner.ts    # Scans filesystem for agent skill directories
│   │   ├── EnvService.ts      # Node.js detection, download, extraction
│   │   ├── StoreService.ts    # electron-store wrapper for settings/env
│   │   └── WindowManager.ts   # Multi-window management (main, env, settings)
│   ├── api/
│   │   └── skills.ts          # HTTP client for skills.sh search API
│   └── ipc/                   # IPC handler registration (skills, env, store, agents, shell)
├── preload/         # Preload script (contextBridge API)
│   ├── index.ts          # Exposes window.api with typed IPC methods
│   └── index.d.ts        # TypeScript declarations for window.api
├── renderer/        # Renderer process (Vue 3 SPA)
│   └── src/
│       ├── App.vue            # Root: NaiveUI config, sidebar + router-view layout
│       ├── router/            # Hash-based routing (/, /search, /skill/:ref, /agent-view, /env, /settings)
│       ├── views/             # Page-level components
│       ├── components/        # Reusable components (layout, skills, common)
│       ├── stores/            # Pinia stores (skills, settings, env)
│       ├── composables/       # useCachedResource (stale-while-revalidate), useConfirm
│       ├── constants/         # Agent definitions loaded from shared/agents.json
│       └── assets/            # CSS (tokens.css for design tokens, base.css, card.css)
└── shared/
    ├── types.ts          # Shared TypeScript interfaces (Skill, EnvStatus, CommandResult, etc.)
    └── agents.json       # Agent registry (name, agentFlag, project/global paths)
```

### Key Patterns

- **IPC communication**: All main↔renderer communication uses Electron IPC with typed channels. The preload script defines `window.api.*` methods; the renderer calls these directly. Main process IPC handlers are registered in `src/main/ipc/`.
- **Stale-while-revalidate caching**: `useCachedResource<T>` composable provides `ensure()`, `invalidate()`, and `refresh()` for all async data fetching in Pinia stores.
- **CLI interaction**: `CommandRunner` wraps `execa` with streaming output, timeout, and cancel support. `NpxService` uses it for all `npx skills` commands. The `shell: true` flag is set on Windows.
- **Agent scanning**: `AgentScanner` reads `shared/agents.json` and scans each agent's `globalPath` directory to discover installed skills. The renderer enriches installed skill data with agent associations via path matching.
- **Multi-window**: Three windows managed by `WindowManager` — main app, environment detection modal, and settings modal. Window type is passed via URL query parameter `?window=`.
- **Design system**: NaiveUI component library with custom theme overrides in `App.vue`. CSS design tokens in `tokens.css`. Rounded/pill styling (borderRadius: 9999px for buttons/tags, 16px for cards/modals).

## Code Style

- Prettier: single quotes, no semicolons, 100 char print width, no trailing commas
- ESLint: Vue + TypeScript rules, `vue/require-default-prop` and `vue/multi-word-component-names` disabled
- Vue SFCs use `<script setup lang="ts">` exclusively
- Path alias: `@renderer` maps to `src/renderer/src`
