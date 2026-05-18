# Archive Installer Dedicated UI Design

**Date:** 2026-05-18
**Status:** Approved

## Problem

ArchiveInstaller 和 GitHubInstaller 共用 `LocalInstallPanel` 组件，但两者的上方区域高度不同。Archive 的拖拽区比 GitHub 的 URL 输入区高，导致剩余空间分配不足，技能列表和安装目标栏被截断，安装按钮不可见。

## Decision

为 ArchiveInstaller 设计专用 UI 布局，不再引用 `LocalInstallPanel`。采用左右分栏方案，拖拽区嵌入左栏顶部，两栏独立滚动，安装按钮固定在右栏底部。

## Layout

```
┌──────────────────────┬──────────────────────┐
│  📦 拖拽或点击选择     │  ② 选择目标           │
│  my-skills.zip       │  ☑ 全局安装            │
├──────────────────────┤  常用: [CC] [Cur] ... │
│  ① 选择技能 (3/3)     │  ┌──────────────┐    │
│  ┌─────────────────┐ │  │ 筛选...       │    │
│  │ ☑ code-review   │ │  │ ☑ Ampere     │    │
│  │ ☑ debugging     │ │  │ ☐ Augment    │    │
│  │ ☑ tdd           │ │  │ ...          │    │
│  │ (独立滚动)       │ │  │ (独立滚动)    │    │
│  └─────────────────┘ │  └──────────────┘    │
│                      │  已选: 2 个 agent     │
│                      │  [安装选中技能 (3)]    │
└──────────────────────┴──────────────────────┘
```

## Component Changes

### 1. `ArchiveInstaller.vue` — 重写模板和样式

**模板结构**（替换当前引用 LocalInstallPanel 的方式）：

```
.archive-installer (flex column, height: 100%)
├── .archive-columns (grid 1fr 1fr, flex: 1, min-height: 0)
│   ├── .column-left (flex column)
│   │   ├── .drop-zone (紧凑拖拽区，flex-shrink: 0)
│   │   ├── .step-header (步骤编号 ① + 标题 + 计数)
│   │   └── .skill-list-area (flex: 1, overflow-y: auto)
│   │       └── <SkillScanResult>
│   └── .column-right (flex column)
│       ├── .step-header (步骤编号 ② + 标题)
│       ├── <AgentSelector> (flex: 1, min-height: 0, overflow-y: auto)
│       └── .column-actions (flex-shrink: 0, 安装按钮)
└── .install-result (条件渲染，flex-shrink: 0)
```

**拖拽区样式**（保持不变）：
- `border: 2px dashed var(--color-hairline)` → hover/active 时 `var(--color-brand-blue)`
- `border-radius: var(--radius-xl)`
- `background: var(--color-canvas)` → hover/active 时 `var(--color-brand-blue-200)`
- 尺寸紧凑：`padding: var(--space-md) var(--space-lg)`

**步骤编号样式**：
- 编号圆圈：`background: var(--color-brand-blue); color: white; 20×20px; border-radius: 50%`
- 标题：`font-weight: var(--weight-semibold); font-size: var(--text-body-sm)`
- 计数：`font-size: var(--text-micro); color: var(--color-muted)`

**技能列表区样式**：
- 外框：`border: 1px solid var(--color-hairline); border-radius: var(--radius-md)`
- 内部：`padding: var(--space-sm); background: var(--color-canvas)`
- 每个技能项：`padding: var(--space-xs) var(--space-sm); background: var(--color-canvas); border-radius: var(--radius-sm)`
- 路径文字：`font-size: var(--text-micro); color: var(--color-muted)`

**安装按钮样式**：
- `width: 100%; border-radius: var(--radius-full); font-weight: var(--weight-medium)`
- 背景色：`var(--color-brand-blue)`

### 2. `SkillScanResult.vue` — 无改动，继续复用

### 3. `AgentSelector.vue` — 无改动，继续复用

### 4. `LocalInstallPanel.vue` — 不再被 ArchiveInstaller 引用，仅 GitHubInstaller 使用

### 5. `useSkillInstall.ts` — 继续复用，无改动

## CSS Details

所有样式使用 `tokens.css` 中的 design tokens，不硬编码值：

| 元素 | Token 映射 |
|------|-----------|
| 拖拽区边框 | `var(--color-hairline)` / `var(--color-brand-blue)` |
| 拖拽区背景 | `var(--color-canvas)` / `var(--color-brand-blue-200)` |
| 步骤编号背景 | `var(--color-brand-blue)` |
| 文字主色 | `var(--color-ink)` |
| 文字辅助色 | `var(--color-stone)` / `var(--color-muted)` |
| 列表区背景 | `var(--color-canvas)` |
| 列表区边框 | `var(--color-hairline)` |
| 圆角 | `var(--radius-xl)` (拖拽区) / `var(--radius-md)` (列表) / `var(--radius-sm)` (列表项) |
| 间距 | `var(--space-*)` 系列 |

## Behavior

1. **初始状态**：显示两栏，左栏仅有拖拽区（占满高度），右栏为空提示
2. **拖入文件**：拖拽区高亮，与现有行为一致
3. **解压完成**：左栏显示技能列表（可滚动），右栏显示安装目标选择器（可滚动），底部显示安装按钮
4. **安装中**：按钮 loading 状态
5. **安装完成**：底部显示安装结果（成功/失败）
6. **全局安装勾选时**：Agent 选择器整体 disabled，与现有行为一致

## Out of Scope

- 不修改 GitHubInstaller 的布局
- 不修改 SkillScanResult 和 AgentSelector 的内部实现
- 不修改 useSkillInstall composable
- 不改变 IPC 通信逻辑
