# Agent 技能抽屉 UI 重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重设计 Agent 管理页面的技能抽屉，解决头部不紧凑、按钮文字冗余、列表样式单调三个体验问题。

**Architecture:** 仅修改 `AgentView.vue` 一个文件的 template 和 style 部分，不引入新依赖，不改逻辑。所有视觉改动通过 HTML 结构调整 + CSS 实现。

**Tech Stack:** Vue 3 SFC (`<script setup>`), NaiveUI 组件库, scoped CSS

---

### Task 1: 重构 Drawer Header 为紧凑一行布局

**Files:**

- Modify: `src/renderer/src/views/AgentView.vue:210-229` (drawer-header template)
- Modify: `src/renderer/src/views/AgentView.vue:473-504` (drawer-header CSS)

- [ ] **Step 1: 替换 drawer-header template**

将原来的两行布局（名字+按钮在 `drawer-header-content` div，关闭按钮独立定位）改为单行 flex 布局：头像 + 名字/计数 + 文件夹/关闭按钮在同一行。

替换 `AgentView.vue` 第 211-229 行的 `drawer-header` div 内容为：

```html
<div class="drawer-header">
  <div class="header-left">
    <div class="header-avatar">{{ getAgentInitials(selectedAgent.agentName) }}</div>
    <div class="header-info">
      <div class="header-name">{{ selectedAgent.agentName }}</div>
      <div class="header-count">{{ selectedAgent.count }} 个技能</div>
    </div>
  </div>
  <div class="header-actions">
    <NButton
      quaternary
      circle
      size="small"
      class="header-icon-btn"
      @click="openAgentFolder(selectedAgent!)"
    >
      <template #icon>
        <NIcon :size="18"><FolderOpenOutline /></NIcon>
      </template>
    </NButton>
    <NButton quaternary circle size="small" class="header-icon-btn" @click="closeDrawer">
      <template #icon>
        <NIcon :size="18"><CloseOutline /></NIcon>
      </template>
    </NButton>
  </div>
</div>
```

- [ ] **Step 2: 替换 drawer-header CSS**

删除旧的 `.drawer-header`、`.drawer-header-content`、`.drawer-header-name`、`.drawer-header-count`、`.drawer-close-btn` 样式（第 473-504 行），替换为：

```css
/* Drawer Header - 紧凑一行布局 */
.drawer-header {
  padding: 12px 20px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--weight-bold);
  font-size: var(--text-body-sm);
  flex-shrink: 0;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-name {
  font-size: var(--text-body-lg);
  font-weight: var(--weight-bold);
  color: var(--color-ink);
}

.header-count {
  font-size: var(--text-caption);
  color: #475569;
  background: rgba(37, 99, 235, 0.08);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  width: fit-content;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-icon-btn {
  width: 34px !important;
  height: 34px !important;
  color: #475569 !important;
}

.header-icon-btn:hover {
  background: rgba(37, 99, 235, 0.08) !important;
  color: #2563eb !important;
}
```

- [ ] **Step 3: 启动 dev server 验证头部布局**

Run: `npm run dev`
验证：点击任意 Agent 卡片，抽屉头部应显示为头像 + 名字 + 按钮的单行紧凑布局。

- [ ] **Step 4: 提交**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "refactor: compact drawer header into single-row layout"
```

---

### Task 2: 技能列表卡片化 + 序号标签

**Files:**

- Modify: `src/renderer/src/views/AgentView.vue:230-263` (drawer-body template)
- Modify: `src/renderer/src/views/AgentView.vue:506-537` (drawer-body + skill-row CSS)

- [ ] **Step 1: 替换 drawer-body template**

将原来的 `v-for` skill-row 列表替换为带序号的卡片列表。替换第 230-263 行的 `drawer-body` div 内容为：

```html
<div class="drawer-body">
  <div v-for="(skillName, idx) in selectedAgent.skills" :key="skillName" class="skill-card">
    <div class="skill-left">
      <div class="skill-index">{{ String(idx + 1).padStart(2, '0') }}</div>
      <div class="skill-name">{{ skillName }}</div>
    </div>
    <div class="skill-actions">
      <NButton
        quaternary
        circle
        size="small"
        class="action-btn update"
        @click="handleUpdate(skillName)"
      >
        <template #icon>
          <NIcon :size="16"><RefreshOutline /></NIcon>
        </template>
      </NButton>
      <NButton
        quaternary
        circle
        size="small"
        class="action-btn delete"
        :loading="removingSkill === skillName"
        @click="handleRemove(skillName)"
      >
        <template #icon>
          <NIcon :size="16"><TrashOutline /></NIcon>
        </template>
      </NButton>
    </div>
  </div>
</div>
```

注意：`NButton` 的 `title` 属性在 NaiveUI 中不生效，tooltip 需要通过 `NTooltip` 包裹实现，但这会增加较多模板复杂度。先用 `title` 原生 HTML 属性作为基础 tooltip（浏览器原生行为），后续如有需要再升级为 NTooltip。

- [ ] **Step 2: 替换 drawer-body 和 skill-row CSS**

删除旧的 `.drawer-body`、`.skill-row`、`.skill-row:last-child`、`.skill-row-info`、`.skill-row-name` 样式（第 506-537 行），替换为：

```css
/* Drawer Body - 卡片列表 */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #eff6ff;
}

/* Skill Card */
.skill-card {
  background: white;
  border: 1px solid rgba(37, 99, 235, 0.1);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 150ms ease;
}

.skill-card:hover {
  border-color: #2563eb;
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.1);
}

.skill-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.skill-index {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-micro);
  font-weight: var(--weight-bold);
  flex-shrink: 0;
}

.skill-name {
  font-size: var(--text-body-md);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Action Buttons */
.skill-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  width: 32px !important;
  height: 32px !important;
  color: #475569 !important;
}

.action-btn.update:hover {
  background: rgba(37, 99, 235, 0.08) !important;
  color: #2563eb !important;
}

.action-btn.delete:hover {
  background: #fef2f2 !important;
  color: #ef4444 !important;
}
```

- [ ] **Step 3: 启动 dev server 验证卡片列表**

Run: `npm run dev`
验证：

- 技能列表为浅蓝背景上的白色卡片
- 每张卡片左侧有 `01`-`N` 序号标签
- 操作按钮为纯图标，无文字
- hover 卡片时蓝色边框+阴影

- [ ] **Step 4: 提交**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "feat: card-style skill list with numbered index in agent drawer"
```

---

### Task 3: 添加 Tooltip + 最终视觉调优

**Files:**

- Modify: `src/renderer/src/views/AgentView.vue:2-10` (imports)

- [ ] **Step 1: 引入 NTooltip 组件**

在 import 行中添加 `NTooltip`：

```typescript
import {
  NDrawer,
  NTooltip,
  NEmpty,
  NText,
  NSpace,
  NButton,
  NIcon,
  NInput,
  NSpin,
  useMessage
} from 'naive-ui'
```

- [ ] **Step 2: 用 NTooltip 包裹头部图标按钮**

将 Task 1 中的两个头部图标按钮分别用 `NTooltip` 包裹。将 `.header-actions` 内容改为：

```html
<div class="header-actions">
  <NTooltip>
    <template #trigger>
      <NButton
        quaternary
        circle
        size="small"
        class="header-icon-btn"
        @click="openAgentFolder(selectedAgent!)"
      >
        <template #icon>
          <NIcon :size="18"><FolderOpenOutline /></NIcon>
        </template>
      </NButton>
    </template>
    打开文件夹
  </NTooltip>
  <NTooltip>
    <template #trigger>
      <NButton quaternary circle size="small" class="header-icon-btn" @click="closeDrawer">
        <template #icon>
          <NIcon :size="18"><CloseOutline /></NIcon>
        </template>
      </NButton>
    </template>
    关闭
  </NTooltip>
</div>
```

- [ ] **Step 3: 用 NTooltip 包裹卡片操作按钮**

将 Task 2 中的更新和删除按钮分别用 `NTooltip` 包裹。将 `.skill-actions` 内容改为：

```html
<div class="skill-actions">
  <NTooltip>
    <template #trigger>
      <NButton
        quaternary
        circle
        size="small"
        class="action-btn update"
        @click="handleUpdate(skillName)"
      >
        <template #icon>
          <NIcon :size="16"><RefreshOutline /></NIcon>
        </template>
      </NButton>
    </template>
    更新
  </NTooltip>
  <NTooltip>
    <template #trigger>
      <NButton
        quaternary
        circle
        size="small"
        class="action-btn delete"
        :loading="removingSkill === skillName"
        @click="handleRemove(skillName)"
      >
        <template #icon>
          <NIcon :size="16"><TrashOutline /></NIcon>
        </template>
      </NButton>
    </template>
    删除
  </NTooltip>
</div>
```

- [ ] **Step 4: 启动 dev server 验证完整效果**

Run: `npm run dev`
验证：

- hover 头部文件夹/关闭按钮时显示 tooltip
- hover 更新按钮时显示"更新"tooltip + 蓝色背景
- hover 删除按钮时显示"删除"tooltip + 红色背景
- 整体视觉效果与设计稿一致

- [ ] **Step 5: 运行 lint 和 format**

```bash
npm run lint && npm run format
```

- [ ] **Step 6: 提交**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "feat: add tooltips to icon buttons in agent drawer"
```

---

### Task 4: 清理和最终验证

**Files:**

- Modify: `src/renderer/src/views/AgentView.vue` (如需清理)

- [ ] **Step 1: 检查是否残留未使用的 import**

确认 `NSpace` 是否仍在使用。如果 template 中不再使用 `NSpace`，从 import 中移除。

- [ ] **Step 2: 运行 typecheck**

```bash
npm run typecheck
```

Expected: 无错误

- [ ] **Step 3: 全量 dev 验证**

Run: `npm run dev`
完整验证清单：

- [ ] Agent 卡片网格样式未受影响
- [ ] 点击 Agent 打开抽屉，头部紧凑一行
- [ ] 技能列表为浅蓝背景 + 白色卡片
- [ ] 序号标签正确显示 01-05
- [ ] 更新按钮 hover 蓝色 + tooltip
- [ ] 删除按钮 hover 红色 + tooltip
- [ ] 删除功能正常（loading 状态 + 确认弹窗）
- [ ] 更新功能正常（确认弹窗）
- [ ] 打开文件夹按钮正常
- [ ] 关闭抽屉正常（点击关闭按钮 / 点击遮罩）

- [ ] **Step 4: 清理 visual-options 临时文件**

```bash
rm -rf .visual-options
```

- [ ] **Step 5: 最终提交（如有 lint 修复）**

```bash
git add -A
git commit -m "chore: clean up unused imports after drawer redesign"
```
