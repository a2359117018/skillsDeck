# GitHub Installer 左右分栏高度对齐

**Date:** 2026-05-17
**Status:** Approved
**Scope:** GitHubInstaller.vue + AgentSelector.vue

## Problem

1. 左右分栏高度不一致 — 左栏（扫描结果 `max-height: 240px`）和右栏（Agent 选择器，无固定高度）视觉高度不对齐
2. 选择"全局安装"时，`AgentSelector` 的 `v-if="!isGlobal"` 将整个 Agent 区域收起，导致右栏高度突变，布局跳动

## Design

### 1. 左右等高

`GitHubInstaller.vue` 的 `.split-layout` 改为：
```css
.split-layout {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: var(--space-lg);
  align-items: stretch;
}

.split-left,
.split-right {
  display: flex;
  flex-direction: column;
}
```

两栏子容器使用 flex column 布局，自然拉伸等高。

### 2. 全局安装时不收起 Agent 区域

`AgentSelector.vue`：
- 将 `v-if="!isGlobal"` 改为 `v-show="!isGlobal"`
- 在 `.agent-section` 上添加 `opacity: 0.5; pointer-events: none;` 当 `isGlobal` 为 true
- 或者更优雅：在全局安装时给 agent-section 添加 `disabled` 类，样式上降低透明度并禁用交互

这样选择全局安装时，Agent 区域保持占位但视觉禁用，右栏高度不会突变。
