# 响应式布局重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将项目从固定宽度（max-width: 960px）布局改造为纯流式自适应布局，零 media query，利用 flex + grid 的内建能力实现响应式。

**Architecture:** 移除所有页面容器的 max-width 限制，将固定列数网格（repeat(3, 1fr)）改为 auto-fill 自适应网格（repeat(auto-fill, minmax(280px, 1fr))），工具栏添加 flex-wrap: wrap，Drawer 宽度改为相对计算。Electron 主进程设置 minWidth: 1200, minHeight: 800。

**Tech Stack:** Electron 39 + Vue 3.5 + TypeScript 5.9 + Naive UI 2.44

---

## 文件结构映射

| 文件                                                    | 变更类型 | 职责                                                                                    |
| ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `src/main/services/WindowManager.ts`                    | 修改     | 设置主窗口最小尺寸为 1200×800                                                           |
| `src/renderer/src/components/skills/SkillSearchBar.vue` | 修改     | 移除搜索栏容器 max-width: 680px                                                         |
| `src/renderer/src/views/SkillsSearch.vue`               | 修改     | 移除页面 max-width，搜索网格改为 auto-fill                                              |
| `src/renderer/src/views/InstalledList.vue`              | 修改     | 移除页面 max-width，工具栏添加 flex-wrap                                                |
| `src/renderer/src/views/AgentView.vue`                  | 修改     | 移除页面 max-width，Agent 网格改为 auto-fill，工具栏添加 flex-wrap，Drawer 宽度动态计算 |
| `src/renderer/src/views/SettingsView.vue`               | 修改     | 移除页面 max-width                                                                      |
| `CLAUDE.md`                                             | 修改     | 更新 CSS 约束和布局约束章节，追加流式布局规范                                           |

---

### Task 1: 设置主窗口最小尺寸

**Files:**

- Modify: `src/main/services/WindowManager.ts:52-53`

- [ ] **Step 1: 修改 createMainWindow 的最小尺寸**

将 `minWidth` 从 `1100` 改为 `1200`，`minHeight` 从 `700` 改为 `800`：

```ts
export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow(
    createWindowOptions({
      width: 1200,
      height: 800,
      minWidth: 1200,
      minHeight: 800,
      title: 'NPX Skills UI'
    })
  )
```

- [ ] **Step 2: Commit**

```bash
git add src/main/services/WindowManager.ts
git commit -m "feat: set main window min size to 1200x800"
```

---

### Task 2: 搜索栏移除宽度限制

**Files:**

- Modify: `src/renderer/src/components/skills/SkillSearchBar.vue:55`

- [ ] **Step 1: 移除 search-bar-container 的 max-width**

找到 `.search-bar-container` 样式块，删除 `max-width: 680px;`：

```css
.search-bar-container {
  display: flex;
  gap: var(--space-md);
  width: 100%;
  align-items: center;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/skills/SkillSearchBar.vue
git commit -m "feat: remove max-width from search bar"
```

---

### Task 3: SkillsSearch 页面流式化

**Files:**

- Modify: `src/renderer/src/views/SkillsSearch.vue:155-162` (样式区域)
- Modify: `src/renderer/src/views/SkillsSearch.vue:216-220` (样式区域)

- [ ] **Step 1: 移除 search-page 的 max-width 和 margin**

找到 `.search-page` 样式块，修改为：

```css
.search-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 0 var(--space-xl);
}
```

- [ ] **Step 2: 搜索网格改为 auto-fill**

找到 `.search-grid` 样式块，修改为：

```css
.search-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/SkillsSearch.vue
git commit -m "feat: make skills search page fluid with auto-fill grid"
```

---

### Task 4: InstalledList 页面流式化

**Files:**

- Modify: `src/renderer/src/views/InstalledList.vue:242-245` (样式区域)
- Modify: `src/renderer/src/views/InstalledList.vue:247-253` (样式区域)

- [ ] **Step 1: 移除 container 的 max-width 和 margin**

找到 `.container` 样式块，修改为：

```css
.container {
  width: 100%;
}
```

- [ ] **Step 2: 工具栏添加 flex-wrap**

找到 `.toolbar` 样式块，添加 `flex-wrap: wrap;`：

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/InstalledList.vue
git commit -m "feat: make installed list page fluid with wrapping toolbar"
```

---

### Task 5: AgentView 页面流式化

**Files:**

- Modify: `src/renderer/src/views/AgentView.vue` (script + template + style)

- [ ] **Step 1: 添加窗口宽度响应式跟踪**

在 `<script setup>` 中，在现有 `drawerVisible` ref 之后添加：

```ts
const windowWidth = ref(window.innerWidth)

function handleResize(): void {
  windowWidth.value = window.innerWidth
}
```

然后修改 `onMounted` 和 `onUnmounted`：

```ts
onMounted(() => {
  window.addEventListener('resize', handleResize)
  skillsStore.fetchInstalled()
  unsubscribeTasks = taskStore.subscribe()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  unsubscribeTasks?.()
})
```

- [ ] **Step 2: Drawer 宽度改为动态计算**

找到 `<NDrawer` 标签（第 209-219 行），将 `:width="500"` 改为：

```vue
:width="Math.min(480, windowWidth * 0.4)"
```

- [ ] **Step 3: 移除 container 的 max-width 和 margin**

找到 `.container` 样式块（第 320-323 行），修改为：

```css
.container {
  width: 100%;
}
```

- [ ] **Step 4: Agent 网格改为 auto-fill**

找到 `.agent-grid` 样式块（第 376-381 行），修改为：

```css
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
  padding-bottom: var(--space-xl);
}
```

- [ ] **Step 5: 工具栏添加 flex-wrap**

找到 `.toolbar` 样式块（第 326-331 行），添加 `flex-wrap: wrap;`：

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "feat: make agent view fluid with auto-fill grid and dynamic drawer width"
```

---

### Task 6: SettingsView 页面流式化

**Files:**

- Modify: `src/renderer/src/views/SettingsView.vue:616-619` (样式区域)

- [ ] **Step 1: 移除 settings-page 的 max-width 和 margin**

找到 `.settings-page` 样式块，修改为：

```css
.settings-page {
  padding: var(--space-xl);
  width: 100%;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/views/SettingsView.vue
git commit -m "feat: make settings view fluid"
```

---

### Task 8: 更新 CLAUDE.md 布局规范

**Files:**

- Modify: `CLAUDE.md:110-128` (CSS 约束和布局约束章节)

- [ ] **Step 1: CSS 约束章节追加**

在 CSS 约束章节末尾（第 118 行之后），添加：

```markdown
- **流式布局优先**：所有页面容器使用 `width: 100%` + padding，禁止写死 `max-width` 或固定像素宽度
- **网格使用 auto-fill**：多列卡片列表使用 `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`，禁止写死 `repeat(N, 1fr)`
- **零 media query 原则**：布局弹性通过 flex 和 grid 的内建能力实现，不引入断点；仅在极特殊场景下可例外
```

- [ ] **Step 2: 布局约束章节修改**

将第 125-126 行：

```markdown
- **内容区限宽居中**：页面内容设置 `max-width`（960px 或 720px），自然居中，不用 flex/grid 居中
```

替换为：

```markdown
- **页面容器填满内容区**：每个页面根元素为 `width: 100%`，通过 `padding` 控制内容边距，不用 `max-width` 限制
```

将第 127-128 行：

```markdown
- **不用响应式断点**：桌面端应用，固定列数和宽度，不做 media query 适配
```

替换为：

```markdown
- **工具栏允许换行**：`display: flex` 的 toolbar 必须设置 `flex-wrap: wrap`，防止空间不足时溢出
- **Drawer 使用相对宽度**：侧滑抽屉宽度使用 `min(固定值, 窗口百分比)`，不用固定像素
- **最小窗口保障**：Electron 主进程设置 `minWidth: 1200, minHeight: 800`，布局在此尺寸下必须可用
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update layout constraints for fluid responsive design"
```

---

### Task 9: 开发环境验证

**Files:**

- 无文件变更，仅验证

- [ ] **Step 1: 启动 dev server**

```bash
npm run dev
```

- [ ] **Step 2: 验证 SkillsSearch 页面**

切换到搜索页，确认：

- 搜索栏填满可用宽度
- 搜索结果网格列数随窗口宽度变化（缩小/放大窗口观察）
- 无内容被截断或溢出

- [ ] **Step 3: 验证 InstalledList 页面**

切换到"我的技能"页，确认：

- 页面内容填满可用宽度
- 工具栏在空间不足时正确换行
- 技能列表正常显示

- [ ] **Step 4: 验证 AgentView 页面**

切换到 Agent 管理页，确认：

- Agent 卡片网格列数随窗口宽度变化
- 点击 Agent 卡片打开 Drawer，Drawer 宽度合理（约窗口的 40%，不超过 480px）
- 工具栏正确换行

- [ ] **Step 5: 验证 SettingsView 页面**

切换到设置页，确认：

- 设置表单填满可用宽度
- NSelect 和 NInput 控件正常拉伸
- FAB 保存按钮不被遮挡

- [ ] **Step 6: 运行 lint 和 typecheck**

```bash
npm run lint
npm run typecheck
```

Expected: 无错误

- [ ] **Step 7: Commit（如 lint/typecheck 通过）**

```bash
git commit --allow-empty -m "chore: verify responsive layout refactor"
```

---

## Spec Coverage Checklist

| Spec 要求                    | 对应任务        |
| ---------------------------- | --------------- |
| 容器零约束（移除 max-width） | Task 3, 4, 5, 6 |
| 网格自适配（auto-fill）      | Task 3, 5       |
| 组件内聚弹性（flex-wrap）    | Task 4, 5       |
| Drawer 相对宽度              | Task 5          |
| 窗口最小尺寸 1200×800        | Task 1          |
| CLAUDE.md 规范更新           | Task 8          |
| 验证所有页面                 | Task 9          |

## Placeholder Scan

- [x] 无 "TBD"、"TODO"、"implement later"
- [x] 无 "Add appropriate error handling" 等模糊描述
- [x] 每个步骤包含实际代码或精确命令
- [x] 无 "Similar to Task N" 引用

## Type Consistency

- `windowWidth` 为 `Ref<number>`，在 Task 5 的 template 中通过 `windowWidth * 0.4` 使用，类型正确
- `handleResize` 为无参数、无返回值函数，与 `addEventListener('resize', ...)` 兼容
