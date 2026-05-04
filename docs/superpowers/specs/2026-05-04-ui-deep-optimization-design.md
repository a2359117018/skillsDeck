# UI Deep Optimization Design

## Overview

Modernize the NPX Skills UI with icon-based actions, proper view heights, improved search bar, and unified card design for light theme.

## Changes

### 1. Global Height Fix

- `SkillsSearch.vue` and `AgentView.vue` lack `height: 100%` and flex layout
- Fix: add `height: 100%; display: flex; flex-direction: column` to match `InstalledList.vue` pattern

### 2. SkillCard Refactor

- Text buttons ("打开位置", "更新", "删除") → NIcon buttons (FolderOpenOutline, RefreshOutline, TrashOutline)
- Card style: white bg + shadow + left 3px accent bar + hover lift effect
- Action icons: top-right corner, visible on hover

### 3. Search Bar Redesign

- Large centered search input with SearchOutline prefix icon
- Full width, size="large", integrated search icon inside input
- Enter to search, button on right

### 4. Agent View Cards

- Unify with SkillCard style: white bg + shadow + accent bar
- Replace emoji folder button with FolderOpenOutline icon
- Drawer skill list actions → icon buttons
- Height fix to fill content area

### 5. Navigation Rename

- "搜索" → "技能搜索"
- "Agent 视图" → "Agents"

### 6. Dependency

- Install `@vicons/ionicons5`

## Files

| File                   | Change                     |
| ---------------------- | -------------------------- |
| `App.vue`              | Menu labels                |
| `SkillCard.vue`        | Icons + card style         |
| `SkillSearchBar.vue`   | Search bar redesign        |
| `SearchResultCard.vue` | Unified style              |
| `SkillsSearch.vue`     | Height fix + layout        |
| `AgentView.vue`        | Height fix + cards + icons |
| `InstalledList.vue`    | Consistency tweaks         |
