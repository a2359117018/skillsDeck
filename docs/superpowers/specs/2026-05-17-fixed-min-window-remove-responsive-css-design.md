# 固定最小窗口 + 移除响应式 CSS

**日期:** 2026-05-17

## 背景

应用为纯 PC 端 Electron 桌面程序，无需多端适配。当前主窗口没有设置 minWidth/minHeight，用户可以无限缩小窗口导致布局异常。代码中残留少量响应式/触摸适配 CSS，应一并清理。

## 方案

最小化改动：设置窗口最小尺寸 + 移除所有多端适配代码。保留标准桌面布局模式（`100vh` 全高、`max-width` 居中容器、`width: 100%` 填满父级）。

## 改动清单

### 1. WindowManager.ts — 设置窗口最小尺寸

**文件:** `src/main/services/WindowManager.ts`
**改动:** 主窗口创建选项中添加 `minWidth: 1100, minHeight: 700`

### 2. GitHubInstaller.vue — 移除媒体查询、触摸适配、视口单位

**文件:** `src/renderer/src/components/skills/GitHubInstaller.vue`

- **第 350-354 行:** 删除 `@media (max-width: 640px)` 整个块，`.split-layout` 始终保持 `grid-template-columns: 2fr 3fr`
- **第 384 行:** 移除 `touch-action: pan-y;`
- **第 422 行:** `max-height: 70vh` 改为 `max-height: 500px`

### 3. AgentView.vue — 固定 grid 列数

**文件:** `src/renderer/src/views/AgentView.vue`

- **第 378 行:** `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` 改为 `grid-template-columns: repeat(3, 1fr)`

### 4. SkillsSearch.vue — 固定 grid 列数

**文件:** `src/renderer/src/views/SkillsSearch.vue`

- **第 159 行:** `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` 改为 `grid-template-columns: repeat(3, 1fr)`

### 5. AgentTagBar.vue — 移除 flex-wrap

**文件:** `src/renderer/src/components/skills/AgentTagBar.vue`

- **第 121 行:** 移除 `flex-wrap: wrap;`

### 6. SkillRow.vue — 移除 flex-wrap

**文件:** `src/renderer/src/components/skills/SkillRow.vue`

- **第 127 行:** 移除 `flex-wrap: wrap;`

### 7. AgentSelector.vue — 移除触摸适配

**文件:** `src/renderer/src/components/skills/AgentSelector.vue`

- **第 166 行:** 移除 `touch-action: pan-y;`

### 8. SkillScanResult.vue — 移除触摸适配

**文件:** `src/renderer/src/components/skills/SkillScanResult.vue`

- **第 86 行:** 移除 `touch-action: pan-y;`

## 不改动的内容

- `100vh` / `100vw` 全高全宽 — Electron 标准做法
- `max-width` 居中容器 — 桌面布局合理约束
- `width: 100%` 填满父级 — 标准布局
- 设置窗口（600×500 模态窗口）— 尺寸合理
- `overflow-y: auto` 滚动容器 — 标准桌面模式

## 总计

7 个文件，10 处改动。
