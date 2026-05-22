# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NPX Skills UI is an Electron desktop app providing a GUI for managing AI coding agent skills via the `npx skills` CLI. It supports searching, installing, updating, and removing skills across 50+ AI agents (Claude Code, Cursor, Codex, etc.). The search API is hosted at `skills.sh`.

**Tech Stack:** Electron 39 + Vue 3.5 + TypeScript 5.9 + Pinia 3 + Naive UI 2.44 + electron-vite 5

## Development Commands

```bash
npm install            # Install dependencies
npm run dev            # Dev server with hot reload (port 7456)
npm run build          # Typecheck + production build
npm run lint           # ESLint
npm run format         # Prettier formatting
npm run typecheck      # Run both node and web typechecks
npm run build:win      # Build Windows NSIS installer
npm run build:mac      # Build macOS DMG
npm run build:linux    # Build Linux AppImage/deb
```

No test infrastructure exists in this project.

## Architecture

electron-vite 三进程架构。Main process（Node.js services + IPC handlers）、Preload（contextBridge）、Renderer（Vue 3 SPA）。详见 [references/architecture.md](references/architecture.md)。

> 修改架构（新增/删除文件、IPC channel、service 等）时，必须同步更新 references/architecture.md。

## Code Style

- **Prettier**: single quotes, no semicolons, 100 char print width, no trailing commas
- **ESLint**: Vue + TypeScript rules (`vue/require-default-prop` and `vue/multi-word-component-names` disabled, `vue/block-lang` enforces `lang="ts"`)
- **Vue SFCs**: `<script setup lang="ts">` exclusively
- **Path alias**: `@renderer` → `src/renderer/src` (configured in `electron.vite.config.ts`)
- **Component naming**: PascalCase `.vue` files, camelCase for composables (`use*.ts`)
- **IPC naming**: `category:action` format (e.g., `skills:install-streaming`)

## 样式与布局约束

### Token 规范
- 必须使用 design tokens（tokens.css），禁止硬编码 hex/rgb 颜色或 magic number 间距
- 新增 token 先在 tokens.css 添加，再在组件中引用
- 文本颜色必须通过 WCAG AA（对比度 >= 4.5:1），新增 token 时验证

### 布局
- app shell 为 flex 水平排列，页面容器为 flex column
- 卡片网格：CSS grid + `repeat(auto-fill, minmax(280px, 1fr))`，不用 flex wrap
- 工具栏：flex row + gap，必须 `flex-wrap: wrap`
- 页面容器：`width: 100%` + padding 填满内容区；文本块可用 `max-width: 75ch` 限制行宽，但禁止给页面容器设固定像素宽度
- 间距：flex/grid 容器用 `gap` + spacing token，不在子元素上用 margin 拆分
- Drawer：`min(固定值, 窗口百分比)`，不用固定像素
- 最小窗口 1200×800，布局在此尺寸下必须可用

### 组件样式
- scoped 优先，穿透 teleport/portal 时用全局 `<style>` 并注释原因
- BEM-like 命名（`.block-element`），kebab-case
- 单组件 style 超 80 行时考虑拆分子组件或提取公共 class
- NaiveUI 覆盖：`themeOverrides` prop > `:deep()` 选择器
- 禁止嵌套卡片（内层用 surface 背景 + hairline 边框）
- 禁止侧条纹强调（> 1px border-left/right），sidebar 活跃指示条除外

### 动画
- 仅允许 100-200ms ease 过渡用于状态变化（hover、展开/收起）
- 禁止 bounce/elastic 缓动、布局属性动画、装饰性动画

## Constraints

- **No test infrastructure**: No test runner or test files exist in this project
- **Windows `shell: true`**: Required for `execa` on Windows for CLI compatibility
- **Dev server port**: Hardcoded to 7456 in `electron.vite.config.ts`
- **Hash routing**: Uses `createWebHashHistory()` (required for Electron file:// protocol)
- **Agent paths**: `agents.json` contains platform-specific paths; `~` expansion handled in `AgentScanner`
- **Chinese mirror**: Build scripts use `npmmirror.com` for Electron binary downloads (`ELECTRON_MIRROR` env vars in package.json)

## Audit 范式

执行 `/impeccable audit` 时的审计规范（5 维度评分、报告格式、severity 定义、文件输出）。详见 [references/impeccable-audit.md](references/impeccable-audit.md)。
