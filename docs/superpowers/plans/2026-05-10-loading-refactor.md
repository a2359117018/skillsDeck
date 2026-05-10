# Loading Styles Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant global loading overlay and replace it with inline NSpin on each page for first-load state.

**Architecture:** Delete `AppLoading.vue` and its App.vue integration. Add `v-if/v-else-if/v-else` branches in InstalledList and AgentView to show a centered NSpin when fetching with no cached data. Simplify SkillDetail's double loading conditions.

**Tech Stack:** Vue 3 SFC, NaiveUI (NSpin), TypeScript

---

### Task 1: Remove AppLoading.vue Global Overlay

**Files:**

- Delete: `src/renderer/src/components/common/AppLoading.vue`
- Modify: `src/renderer/src/App.vue`

- [ ] **Step 1: Delete AppLoading.vue**

Delete the file `src/renderer/src/components/common/AppLoading.vue`.

- [ ] **Step 2: Remove AppLoading usage from App.vue**

In `src/renderer/src/App.vue`, make these three edits:

Remove the import (line 10):

```
// DELETE this line:
import AppLoading from './components/common/AppLoading.vue'
```

Remove the computed (line 16):

```
// DELETE this line:
const showGlobalLoading = computed(() => skillsStore.fetching)
```

Remove from template (line 68):

```
// DELETE this line:
          <AppLoading :show="showGlobalLoading" />
```

After edits, the `<script setup>` should look like:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  type GlobalThemeOverrides
} from 'naive-ui'
import AppSidebar from './components/layout/AppSidebar.vue'
import { useSkillsStore } from './stores/skills'

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'

const themeOverrides: GlobalThemeOverrides = {
  // ... unchanged
}
</script>
```

Note: `useSkillsStore()` is still called because it initializes the store (triggers onMounted fetches in child components). The `computed` import can be removed if no other computed properties remain — but `windowType` is not computed, so remove the `computed` import as well.

After removing both `computed` and `showGlobalLoading`, the top of `<script setup>` becomes:

```vue
<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  type GlobalThemeOverrides
} from 'naive-ui'
import AppSidebar from './components/layout/AppSidebar.vue'
import { useSkillsStore } from './stores/skills'

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'

const skillsStore = useSkillsStore()

const themeOverrides: GlobalThemeOverrides = {
```

- [ ] **Step 3: Verify dev server compiles**

Run: `npm run typecheck`
Expected: No type errors related to AppLoading.

Run: `npm run dev`
Expected: App launches without errors, no global overlay on any page.

- [ ] **Step 4: Commit**

```bash
git add -u src/renderer/src/components/common/AppLoading.vue src/renderer/src/App.vue
git commit -m "refactor: remove redundant global loading overlay (AppLoading.vue)"
```

---

### Task 2: Add Inline NSpin to InstalledList.vue

**Files:**

- Modify: `src/renderer/src/views/InstalledList.vue`

- [ ] **Step 1: Add NSpin import**

In the `<script setup>` block, update the NaiveUI import on line 3 to include `NSpin`:

```ts
// Before:
import { NEmpty, NText, NInput, NIcon, NButton, useMessage } from 'naive-ui'

// After:
import { NEmpty, NText, NInput, NIcon, NButton, NSpin, useMessage } from 'naive-ui'
```

- [ ] **Step 2: Replace the skill-list / NEmpty template section**

Replace lines 147–160 of the template (the `<!-- Skill List -->` section) with:

```vue
<!-- Skill List -->
<div v-if="skillsStore.fetching && skillsStore.filteredSkills.length === 0" class="page-loading">
        <NSpin size="large" />
      </div>
<div v-else-if="skillsStore.filteredSkills.length > 0" class="skill-list">
        <TransitionGroup name="list" tag="div">
          <SkillRow
            v-for="skill in skillsStore.filteredSkills"
            :key="skill.name"
            :skill="skill"
            @update="handleUpdate"
            @remove="handleRemove"
            @open-location="handleOpenLocation"
            @filter-agent="handleFilterAgent"
          />
        </TransitionGroup>
      </div>
<NEmpty v-else description="暂无已安装的技能" class="empty-state" />
```

- [ ] **Step 3: Add the `.page-loading` style**

Add this rule inside the `<style scoped>` block, after the `.toolbar-actions` rule:

```css
.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev`
Expected: Navigate to "我的技能" page. On first load (no cached data), a centered spinner appears. After data loads, the list renders. Clicking refresh shows the button spinner but the list stays visible.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/views/InstalledList.vue
git commit -m "feat(installed-list): add inline NSpin for first-load state"
```

---

### Task 3: Add Inline NSpin to AgentView.vue

**Files:**

- Modify: `src/renderer/src/views/AgentView.vue`

- [ ] **Step 1: Add NSpin import**

In the `<script setup>` block, update the NaiveUI import (line 4-11) to include `NSpin`:

```ts
// Before:
import { NDrawer, NEmpty, NText, NSpace, NButton, NIcon, NInput, useMessage } from 'naive-ui'

// After:
import { NDrawer, NEmpty, NText, NSpace, NButton, NIcon, NInput, NSpin, useMessage } from 'naive-ui'
```

- [ ] **Step 2: Replace the Agent Grid / NEmpty template section**

Replace lines 160–191 of the template (the `<!-- Agent Grid -->` section through the NEmpty) with:

```vue
      <!-- Agent Grid -->
      <div v-if="skillsStore.fetching && visibleAgentResults.length === 0" class="page-loading">
        <NSpin size="large" />
      </div>
      <div v-else-if="visibleAgentResults.length > 0" class="agent-grid">
        <div
          v-for="(agent, index) in visibleAgentResults"
          :key="agent.agentFlag"
          class="agent-card"
          :class="['color-' + getAgentColorIndex(index)]"
          @click="openAgentCard(agent)"
        >
          <div class="agent-card-avatar">
            {{ getAgentInitials(agent.agentName) }}
          </div>
          <div class="agent-card-name">
            <NText strong>{{ agent.agentName }}</NText>
          </div>
          <div class="agent-card-info">
            <NText depth="3">{{ agent.count }} 个技能</NText>
            <NButton
              size="tiny"
              quaternary
              circle
              title="打开技能文件夹"
              class="agent-folder-btn"
              @click="openAgentFolder(agent, $event)"
            >
              <template #icon>
                <NIcon :size="14"><FolderOpenOutline /></NIcon>
              </template>
            </NButton>
          </div>
        </div>
      </div>
      <NEmpty v-else description="暂无已安装的 Agent" class="empty-state" />
```

- [ ] **Step 3: Add the `.page-loading` style**

Add this rule inside the `<style scoped>` block, after the `.toolbar-actions` rule:

```css
.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev`
Expected: Navigate to "Agent 管理" page. Same behavior — spinner on first load, grid appears after data loads, refresh button spinner works without hiding grid.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "feat(agent-view): add inline NSpin for first-load state"
```

---

### Task 4: Simplify SkillDetail.vue Loading Conditions

**Files:**

- Modify: `src/renderer/src/views/SkillDetail.vue`

- [ ] **Step 1: Simplify button loading props**

In `src/renderer/src/views/SkillDetail.vue`, make two edits in the template:

Line 83 — Update button:

```vue
<!-- Before: -->
:loading="skillsStore.updating || operationLoading"

<!-- After: -->
:loading="operationLoading"
```

Line 92 — Remove button:

```vue
<!-- Before: -->
:loading="skillsStore.removing || operationLoading"

<!-- After: -->
:loading="operationLoading"
```

- [ ] **Step 2: Verify buttons still show loading during operations**

Run: `npm run dev`
Expected: Navigate to a skill detail page. Click "更新" — button shows spinner while operation runs. Click "删除" — button shows spinner while operation runs. Behavior unchanged from user perspective.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/SkillDetail.vue
git commit -m "refactor(skill-detail): simplify button loading to use operationLoading only"
```

---

### Task 5: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev` and verify:

1. "我的技能" page — first load shows spinner, data appears, refresh keeps list visible
2. "Agent 管理" page — same behavior
3. "搜索" page — search loading still works (unchanged)
4. "设置" page — "全部更新" button loading still works
5. Skill detail page — update/remove buttons show loading
6. No full-screen overlay appears on any page during any operation
