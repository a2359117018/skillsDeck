# GitHub Installer UX Improvements Design

**Date:** 2026-05-17
**Status:** Approved
**Scope:** GitHubInstaller.vue and related components only (ArchiveInstaller deferred)

## Problem Statement

GitHub 链接安装技能的 UI 存在四个核心问题：

1. **页面过长，流程分散** — 扫描结果、Agent 选择、安装按钮纵向堆叠，信息密度低
2. **错误提示不明显** — 使用 Toast 通知，容易被忽略且自动消失
3. **Tab 切换丢失状态** — 解析仓库后切换 tab 再切回，解析结果丢失
4. **临时文件残留** — 未安装、安装失败或应用崩溃时，临时文件不会被清理

## Design Decisions

### 1. 左右分栏布局

将 GitHubInstaller 的纵向堆叠改为左右分栏：

```
┌─────────────────────────────────────────────┐
│ [URL 输入框 ............................. 解析] │
│ [错误通知栏（如果有）]                          │
├───────────────────────┬─────────────────────┤
│  左栏：扫描结果         │  右栏：安装配置        │
│                       │                     │
│  □ skill-a            │  [x] 全局安装         │
│  □ skill-b            │                     │
│  ■ skill-c            │  常用 Agent:          │
│  □ skill-d            │  [Claude] [Cursor]   │
│                       │                     │
│  全选 (1/4)            │  筛选: [________]    │
│                       │  □ agent-1           │
│                       │  □ agent-2           │
│                       │  已选: 0 个 agent     │
│                       │                     │
│                       │  [安装选中技能]        │
├───────────────────────┴─────────────────────┤
│ [安装结果（如果有）]                           │
└─────────────────────────────────────────────┘
```

- URL 输入和错误通知栏横跨全宽
- 左栏约 40%，右栏约 60%（Agent 选择器需要更多空间）
- 小屏幕（< 640px）自动回退为纵向布局
- 安装结果横跨全宽

### 2. 错误通知栏

在 URL 输入框下方使用 `NAlert` 组件（type="error", closable）：

- 任何操作失败（解析失败、安装失败）都在此显示
- 不会自动消失，用户需手动关闭
- 新错误替换旧错误
- 新操作开始时（点击解析/安装）自动清除旧错误
- 成功提示仍使用 Toast（`message.success()`）

### 3. Tab 状态保持

确保 GitHubInstaller 的解析结果在 tab 切换后不丢失：

- 移除 `NTabs` 的 `animated` 属性（避免动画导致的意外重渲染）
- 确认 Naive UI NTabs 默认行为（不销毁非活跃 tab 内容）保持生效
- 只在用户主动操作（输入新 URL、点击清除）时清空解析结果

### 4. 临时文件清理（三层保障）

**第一层 — 组件卸载时清理：**
- `GitHubInstaller` 的 `onUnmounted` 中，如有未安装的解析结果，调用新 IPC `skills:cleanup-temp` 清理临时目录
- 需要在组件中记录临时目录路径

**第二层 — 新操作覆盖旧操作：**
- 用户输入新 URL 点击解析时，先清理上一次未安装的临时文件

**第三层 — 应用启动时兜底：**
- 主进程 `app.on('ready')` 时扫描 `os.tmpdir()` 下 `skills-github-*` 和 `skills-archive-*` 目录，清理所有遗留
- 处理应用崩溃或被强制关闭的场景

## Components Affected

| Component | Change |
|-----------|--------|
| `GitHubInstaller.vue` | 左右分栏重构 + 通知栏 + 内联安装逻辑（不再使用 LocalInstallPanel） + 临时文件路径追踪 |
| `SkillsSearch.vue` | 移除 `animated` 属性 |
| `skills.ipc.ts` | 新增 `skills:cleanup-temp` IPC handler；`skills:parse-github` 返回值增加 `tempDir` 字段 |
| `shared/types.ts` | `ScannedSkill` 或新增类型中包含 `tempDir` 路径信息 |
| `GitHubSkillInstaller.ts`（或相关 service） | 新增 `cleanupTempDirs()` 方法；`parseGitHub` 返回 tempDir 路径 |
| `src/main/index.ts` | app ready 时执行临时文件清理 |

## Implementation Notes

- `LocalInstallPanel` 不受影响，继续被 `ArchiveInstaller` 使用。`GitHubInstaller` 改为直接组合 `SkillScanResult` + `AgentSelector`，内联安装逻辑（从 `LocalInstallPanel` 中提取），不再依赖 `LocalInstallPanel`。
- 临时文件清理需要后端 IPC 返回 `tempDir` 路径。当前 `skills:parse-github` 只返回 `ScannedSkill[]`，需扩展返回值包含临时目录路径，供前端追踪和清理。
