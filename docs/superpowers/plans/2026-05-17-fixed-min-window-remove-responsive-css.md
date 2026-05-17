# 固定最小窗口 + 移除响应式 CSS 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Electron 主窗口设置 1100×700 最小尺寸，移除所有响应式/触摸适配 CSS。

**Architecture:** 纯 CSS 属性替换和删除，加上一处 Electron BrowserWindow 配置。不涉及逻辑变更。

**Tech Stack:** Electron 39, Vue 3 SFC scoped styles, TypeScript

---

## 文件变更清单

| 文件 | 操作 | 改动点数 |
|---|---|---|
| `src/main/services/WindowManager.ts` | 修改 | 1 |
| `src/renderer/src/components/skills/GitHubInstaller.vue` | 修改 | 3 |
| `src/renderer/src/views/AgentView.vue` | 修改 | 1 |
| `src/renderer/src/views/SkillsSearch.vue` | 修改 | 1 |
| `src/renderer/src/components/skills/AgentTagBar.vue` | 修改 | 1 |
| `src/renderer/src/components/skills/SkillRow.vue` | 修改 | 1 |
| `src/renderer/src/components/skills/AgentSelector.vue` | 修改 | 1 |
| `src/renderer/src/components/skills/SkillScanResult.vue` | 修改 | 1 |

---

### Task 1: 设置主窗口最小尺寸

**Files:**
- Modify: `src/main/services/WindowManager.ts:15-25`

`createWindowOptions` 函数需要接收并传递 minWidth/minHeight。当前函数只从 opts 中取 width 和 height。

- [ ] **Step 1: 修改 createWindowOptions 传递 minWidth/minHeight**

在 `createWindowOptions` 函数中，将 `width: opts.width, height: opts.height` 所在的返回对象中添加 minWidth 和 minHeight 透传：

```typescript
// 文件: src/main/services/WindowManager.ts 第 15-16 行附近
// 原:
    width: opts.width,
    height: opts.height,
// 改为:
    width: opts.width,
    height: opts.height,
    minWidth: opts.minWidth,
    minHeight: opts.minHeight,
```

同时需要在 `WindowOptions` 类型定义（第 8-12 行附近）中添加这两个可选字段：

```typescript
interface WindowOptions {
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  title: string
}
```

- [ ] **Step 2: 修改 createMainWindow 调用传入最小尺寸**

```typescript
// 文件: src/main/services/WindowManager.ts 第 44-46 行
// 原:
  mainWindow = new BrowserWindow(
    createWindowOptions({ width: 1200, height: 800, title: 'NPX Skills UI' })
  )
// 改为:
  mainWindow = new BrowserWindow(
    createWindowOptions({ width: 1200, height: 800, minWidth: 1100, minHeight: 700, title: 'NPX Skills UI' })
  )
```

- [ ] **Step 3: 提交**

```bash
git add src/main/services/WindowManager.ts
git commit -m "feat: set main window min dimensions to 1100×700"
```

---

### Task 2: 清理 GitHubInstaller.vue 的响应式样式

**Files:**
- Modify: `src/renderer/src/components/skills/GitHubInstaller.vue`

共 3 处改动。

- [ ] **Step 1: 删除 @media 查询**

删除第 350-354 行的整个媒体查询块：

```css
/* 删除这整段（第 350-354 行）: */
@media (max-width: 640px) {
  .split-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: 移除扫描列表的 touch-action**

```css
/* 文件: src/renderer/src/components/skills/GitHubInstaller.vue 第 384 行 */
/* .scan-list 规则中 */
/* 原: */
.scan-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  touch-action: pan-y;
}
/* 改为: */
.scan-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

- [ ] **Step 3: 替换视口单位为固定值**

```css
/* 文件: src/renderer/src/components/skills/GitHubInstaller.vue 第 422 行 */
/* .result-toast 规则中 */
/* 原: */
  max-height: 70vh;
/* 改为: */
  max-height: 500px;
```

- [ ] **Step 4: 提交**

```bash
git add src/renderer/src/components/skills/GitHubInstaller.vue
git commit -m "refactor: remove responsive CSS from GitHubInstaller"
```

---

### Task 3: 固定 AgentView grid 列数

**Files:**
- Modify: `src/renderer/src/views/AgentView.vue:378`

- [ ] **Step 1: 替换 auto-fill minmax 为固定列数**

```css
/* 文件: src/renderer/src/views/AgentView.vue 第 378 行 */
/* .agent-grid 规则中 */
/* 原: */
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
/* 改为: */
  grid-template-columns: repeat(3, 1fr);
```

- [ ] **Step 2: 提交**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "refactor: use fixed 3-column grid in AgentView"
```

---

### Task 4: 固定 SkillsSearch grid 列数

**Files:**
- Modify: `src/renderer/src/views/SkillsSearch.vue:159`

- [ ] **Step 1: 替换 auto-fill minmax 为固定列数**

```css
/* 文件: src/renderer/src/views/SkillsSearch.vue 第 159 行 */
/* .search-grid 规则中 */
/* 原: */
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
/* 改为: */
  grid-template-columns: repeat(3, 1fr);
```

- [ ] **Step 2: 提交**

```bash
git add src/renderer/src/views/SkillsSearch.vue
git commit -m "refactor: use fixed 3-column grid in SkillsSearch"
```

---

### Task 5: 移除 AgentTagBar 和 SkillRow 的 flex-wrap

**Files:**
- Modify: `src/renderer/src/components/skills/AgentTagBar.vue:121`
- Modify: `src/renderer/src/components/skills/SkillRow.vue:127`

两个文件改动相同性质，一起提交。

- [ ] **Step 1: 移除 AgentTagBar 的 flex-wrap**

```css
/* 文件: src/renderer/src/components/skills/AgentTagBar.vue 第 119-126 行 */
/* .panel-body 规则中 */
/* 原: */
.panel-body {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md) var(--space-md);
  border-top: 1px solid var(--color-hairline);
  background: var(--color-surface);
}
/* 改为: */
.panel-body {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md) var(--space-md);
  border-top: 1px solid var(--color-hairline);
  background: var(--color-surface);
}
```

- [ ] **Step 2: 移除 SkillRow 的 flex-wrap**

```css
/* 文件: src/renderer/src/components/skills/SkillRow.vue 第 125-129 行 */
/* .skill-agents 规则中 */
/* 原: */
.skill-agents {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xxs);
}
/* 改为: */
.skill-agents {
  display: flex;
  gap: var(--space-xxs);
}
```

- [ ] **Step 3: 提交**

```bash
git add src/renderer/src/components/skills/AgentTagBar.vue src/renderer/src/components/skills/SkillRow.vue
git commit -m "refactor: remove flex-wrap from tag components"
```

---

### Task 6: 移除触摸适配 (touch-action)

**Files:**
- Modify: `src/renderer/src/components/skills/AgentSelector.vue:166`
- Modify: `src/renderer/src/components/skills/SkillScanResult.vue:86`

- [ ] **Step 1: 移除 AgentSelector 的 touch-action**

```css
/* 文件: src/renderer/src/components/skills/AgentSelector.vue 第 163-171 行 */
/* .agent-list-scroll 规则中 */
/* 原: */
.agent-list-scroll {
  max-height: 180px;
  overflow-y: auto;
  touch-action: pan-y;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  background: var(--color-surface);
}
/* 改为: */
.agent-list-scroll {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  background: var(--color-surface);
}
```

- [ ] **Step 2: 移除 SkillScanResult 的 touch-action**

```css
/* 文件: src/renderer/src/components/skills/SkillScanResult.vue 第 83-87 行 */
/* .scan-list 规则中 */
/* 原: */
.scan-list {
  max-height: 240px;
  overflow-y: auto;
  touch-action: pan-y;
}
/* 改为: */
.scan-list {
  max-height: 240px;
  overflow-y: auto;
}
```

- [ ] **Step 3: 提交**

```bash
git add src/renderer/src/components/skills/AgentSelector.vue src/renderer/src/components/skills/SkillScanResult.vue
git commit -m "refactor: remove touch-action pan-y from scrollable lists"
```

---

### Task 7: 验证与最终提交

- [ ] **Step 1: 运行类型检查**

```bash
npm run typecheck
```

Expected: 无错误。

- [ ] **Step 2: 运行 lint**

```bash
npm run lint
```

Expected: 无错误。

- [ ] **Step 3: 启动开发服务器并手动验证**

```bash
npm run dev
```

验证：
1. 主窗口可以正常显示
2. 拖动窗口边缘缩小，确认不能小于 1100×700
3. SkillsSearch 页面卡片为固定 3 列
4. AgentView 页面卡片为固定 3 列
5. GitHubInstaller 两栏布局正常，不会折叠为单栏
