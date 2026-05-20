# Install Flow Fixes Design

> **Status:** ✅ Implemented (2026-05-18)

修复 GitHub 链接安装和压缩包安装中的导航守卫缺失、临时文件夹过早清理、布局溢出问题，并通过 composable 复用安装逻辑。

## 问题清单

| #   | 问题                                       | 影响                 |
| --- | ------------------------------------------ | -------------------- |
| 1   | 解析 GitHub URL 后离开页面无确认提示       | 用户丢失解析结果     |
| 2   | GitHub 安装完第一个技能后自动清理临时目录  | 逐个安装时后续失败   |
| 3   | Archive 页面有内容时离开无确认提示         | 用户丢失扫描结果     |
| 4   | Archive 页面扫描结果和安装按钮超出可视区域 | 按钮不可见，无法操作 |

## 方案：提取共享 Composable（方案 B）

### 1. `useSkillInstall` Composable

**文件**：`src/renderer/src/composables/useSkillInstall.ts`

**职责**：封装技能安装流程中所有可共享的状态和逻辑，不包含任何 UI。

```typescript
export function useSkillInstall() {
  // 状态
  const selectedSkills: Ref<string[]>
  const selectedAgents: Ref<string[]>
  const isGlobal: Ref<boolean>
  const installing: Ref<boolean>
  const installResult: Ref<LocalInstallResult | null>
  const tempDir: Ref<string>

  // 计算属性
  const hasContent: ComputedRef<boolean>  // tempDir 不为空 或 selectedSkills 不为空
  const canInstall: ComputedRef<boolean>  // 至少一个技能 + (全局模式 或 至少一个 agent)

  // 方法
  setSkills(skills: ScannedSkill[]): void     // 设置技能列表，默认全选
  setTempDir(dir: string): void               // 记录临时目录路径
  async install(): Promise<void>              // 执行安装，不清理临时目录
  async cleanup(): Promise<void>              // 清理临时目录
  resetResult(): void                         // 清除安装结果

  return { /* 所有状态、计算属性、方法 */ }
}
```

**关键约束**：

- `install()` 执行安装后**不清理**临时目录
- `cleanup()` 仅在确认离开页面或重新解析时调用

### 2. 导航守卫

**位置**：`src/renderer/src/views/SkillsSearch.vue`（GitHub 和 Archive 的父页面）

**逻辑**：

```
onBeforeRouteLeave:
  检查当前活跃 tab 对应的 composable.hasContent
    ├── 无内容 → 直接放行
    └── 有内容 → 弹出确认对话框
        ├── 确认离开 → 调用 cleanup()，放行
        └── 取消 → 阻止导航
```

**窗口关闭**：当 `hasContent` 为 true 时，监听 `window.beforeunload` 弹出浏览器原生确认。

**状态传递机制**：

- `GitHubInstaller` 和 `ArchiveInstaller` 各自调用 `useSkillInstall()` 创建实例
- 通过 `defineExpose({ hasContent, cleanup })` 暴露给父组件
- `SkillsSearch.vue` 使用 template ref（`ref<InstanceType<typeof GitHubInstaller>>()` 等）获取子组件引用
- 导航守卫中通过 `gitHubRef.value?.hasContent` / `archiveRef.value?.hasContent` 判断，并根据当前活跃 tab 决定检查哪个

两个 tab 的守卫逻辑统一，只是检查各自 composable 实例的 `hasContent`。

### 3. 临时文件夹清理策略

**简化版**（仅两个清理点）：

| 触发时机                  | 操作                              |
| ------------------------- | --------------------------------- |
| 解析新 URL / 选择新文件前 | 清理旧的临时目录                  |
| 导航离开确认后            | 调用 `cleanup()` 清理当前临时目录 |

**不清理的时机**：每次安装技能后（这是核心修复，解决逐个安装问题）。

ArchiveInstaller 与 GitHubInstaller 逻辑一致，触发点从"解析 URL"变为"选择新文件/拖入新文件"。

### 4. Archive 页面布局修复

**当前问题**：`LocalInstallPanel` 的 grid 两列布局 + 安装按钮在 Archive 页面中被 drop zone 推到视口下方，按钮不可见。

**修复方案**：将 `LocalInstallPanel` 改为 flex 纵向布局，内容区域可滚动，安装按钮固定在底部。

```
┌─────────────────────────────────────┐
│  拖拽压缩包到此处 / 点击选择文件      │  ← drop zone（固定高度）
├─────────────────┬───────────────────┤
│  扫描到的技能    │  安装目标          │  ← 可滚动区域
│  ☐ skill-a     │  ☑ 全局安装        │     (flex: 1, min-height: 0, overflow-y: auto)
│  ☐ skill-b     │  常用: [Claude]... │
│  ☐ skill-c     │  筛选: [______]    │
│                 │  ☐ agent-x        │
├─────────────────┴───────────────────┤
│                    [安装选中技能]     │  ← 底部固定，始终可见
└─────────────────────────────────────┘
```

**CSS 改动要点**：

- `local-install-panel` 改为 `display: flex; flex-direction: column; height: 100%`
- `panel-grid` 设为 `flex: 1; min-height: 0; overflow: hidden`
- 各 section 内部列表可滚动
- `panel-actions` 固定在底部

### 5. 组件结构与样式差异化

**数据/逻辑复用，UI 样式独立**：

```
useSkillInstall (composable)  ← 共享逻辑
    ├── GitHubInstaller.vue    ← 独立模板 + 独立样式
    │   ├── URL 输入 + 解析
    │   ├── 技能列表（内联 checkbox，GitHub 专属卡片样式）
    │   ├── AgentSelector（通过外层 CSS 覆盖外观）
    │   └── 安装按钮 + 结果展示
    │
    └── ArchiveInstaller.vue   ← 独立模板 + 独立样式
        ├── Drop zone
        ├── LocalInstallPanel（接收 composable 状态）
        │   ├── SkillScanResult
        │   ├── AgentSelector（通过不同 CSS 覆盖外观）
        │   └── 安装按钮
        └── 结果展示
```

**UI 差异化方式**：`AgentSelector` 组件保持不变，各父组件通过 `:deep()` 或包装容器类名覆盖其视觉样式（边框、背景、圆角等）。如果差异较大，可通过 prop 传入 variant 类名。

## 涉及文件

| 文件                                                       | 改动                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/renderer/src/composables/useSkillInstall.ts`          | **新建** — 共享安装逻辑 composable                                                                                             |
| `src/renderer/src/components/skills/GitHubInstaller.vue`   | 重构：使用 composable，添加导航守卫支持                                                                                        |
| `src/renderer/src/components/skills/ArchiveInstaller.vue`  | 重构：使用 composable，添加导航守卫支持                                                                                        |
| `src/renderer/src/components/skills/LocalInstallPanel.vue` | 布局修复：flex 纵向布局 + 固定底部按钮                                                                                         |
| `src/renderer/src/views/SkillsSearch.vue`                  | 添加路由级 `onBeforeRouteLeave` 守卫                                                                                           |
| `src/main/ipc/skills.ipc.ts`                               | 移除 `skills:install-local` handler 中第 225-238 行的自动清理逻辑（从 skillDirs 推断 tempRoot 并调用 cleanupTempDir 的代码块） |
