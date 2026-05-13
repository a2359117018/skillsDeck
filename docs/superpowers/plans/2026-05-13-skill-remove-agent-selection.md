# Skill Remove Agent Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users choose whether to delete a skill from all agents or only a specific agent in the InstalledList page.

**Architecture:** New `SkillRemoveDialog.vue` component handles agent selection UI. `InstalledList.vue` manages dialog visibility via a ref, delegates to the existing simple `confirmRemove()` for single-agent skills, and opens `SkillRemoveDialog` for multi-agent skills. No changes to backend/IPC/store — `skillsStore.remove()` already accepts an optional `agent` parameter.

**Tech Stack:** Vue 3 (SFC `<script setup>`), NaiveUI (NModal, NRadioGroup, NRadio, NButton), TypeScript

---

### Task 1: Create SkillRemoveDialog component

**Files:**

- Create: `src/renderer/src/components/skills/SkillRemoveDialog.vue`

- [ ] **Step 1: Write the component**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NCard, NRadioGroup, NRadio, NButton, NIcon, NText } from 'naive-ui'
import { TrashOutline } from '@vicons/ionicons5'
import type { InstalledSkillAgent } from '../../../../shared/types'
import { AGENTS } from '../../constants/agents'

interface RemoveResult {
  confirmed: boolean
  agent?: string
}

const props = defineProps<{
  skillName: string
  agents: InstalledSkillAgent[]
}>()

const emit = defineEmits<{
  done: [result: RemoveResult]
}>()

const visible = ref(true)

/** '__all__' means delete from every agent; any other value is a specific agentFlag */
const selectedTarget = ref<string>('__all__')

const agentDisplayNames = new Map(AGENTS.map((a) => [a.agentFlag, a.name]))

function getAgentLabel(agentFlag: string): string {
  return agentDisplayNames.get(agentFlag) || agentFlag
}

function handleConfirm(): void {
  const agent = selectedTarget.value === '__all__' ? undefined : selectedTarget.value
  visible.value = false
  emit('done', { confirmed: true, agent })
}

function handleCancel(): void {
  visible.value = false
  emit('done', { confirmed: false })
}
</script>

<template>
  <NModal v-model:show="visible" :mask-closable="false" @mask-click="handleCancel">
    <NCard
      style="width: 420px"
      :bordered="false"
      :title="`删除「${props.skillName}」`"
      size="medium"
      role="dialog"
      aria-modal="true"
    >
      <div class="remove-dialog-body">
        <NText depth="3" class="remove-dialog-hint">选择删除范围：</NText>
        <NRadioGroup v-model:value="selectedTarget" class="remove-dialog-radios">
          <NRadio value="__all__">全部删除（{{ props.agents.length }} 个 agent）</NRadio>
          <NRadio v-for="agent in props.agents" :key="agent.name" :value="agent.name">
            {{ getAgentLabel(agent.name) }}
          </NRadio>
        </NRadioGroup>
      </div>
      <template #footer>
        <div class="remove-dialog-footer">
          <NButton round @click="handleCancel">取消</NButton>
          <NButton type="error" round @click="handleConfirm">
            <template #icon>
              <NIcon :size="14"><TrashOutline /></NIcon>
            </template>
            确认删除
          </NButton>
        </div>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.remove-dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.remove-dialog-hint {
  font-size: var(--text-body-sm);
}

.remove-dialog-radios {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.remove-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}
</style>
```

- [ ] **Step 2: Verify component compiles**

Run: `cd E:/ElectronProjects/npx-skills-ui && npm run typecheck`
Expected: no type errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/skills/SkillRemoveDialog.vue
git commit -m "feat: add SkillRemoveDialog component for agent-targeted deletion"
```

---

### Task 2: Wire SkillRemoveDialog into InstalledList

**Files:**

- Modify: `src/renderer/src/views/InstalledList.vue`

- [ ] **Step 1: Update InstalledList.vue script**

Add these imports at the top of `<script setup>`:

```typescript
import { ref, onMounted } from 'vue'
import SkillRemoveDialog from '../components/skills/SkillRemoveDialog.vue'
import type { InstalledSkillAgent } from '../../../shared/types'
```

Note: `ref` is added to the existing `onMounted` import line (replace `import { onMounted } from 'vue'` with `import { ref, onMounted } from 'vue'`).

Add reactive state for the dialog (after the existing `const { ... } = useConfirm()` line):

```typescript
const removeDialogState = ref<{
  visible: boolean
  skillName: string
  agents: InstalledSkillAgent[]
}>({ visible: false, skillName: '', agents: [] })
```

Replace the entire `handleRemove` function (currently at lines 50-64) with:

```typescript
async function handleRemove(name: string): Promise<void> {
  const skill = skillsStore.installedSkills.find((s) => s.name === name)
  const agents = skill?.agents || []

  if (agents.length <= 1) {
    const confirmed = await confirmRemove(name)
    if (!confirmed) return
    try {
      const result = await skillsStore.remove(name, true)
      if (result.success) {
        message.success(`${name} 已删除`)
        await loadSkills()
      } else {
        message.error(`${name} 删除失败`)
      }
    } catch {
      message.error(`${name} 删除失败`)
    }
    return
  }

  removeDialogState.value = { visible: true, skillName: name, agents }
}
```

Add the dialog result handler after `handleRemove`:

```typescript
async function handleRemoveDialogDone(result: {
  confirmed: boolean
  agent?: string
}): Promise<void> {
  if (!result.confirmed) {
    removeDialogState.value.visible = false
    return
  }
  const { skillName } = removeDialogState.value
  removeDialogState.value.visible = false
  try {
    const removeResult = await skillsStore.remove(skillName, true, result.agent)
    if (removeResult.success) {
      message.success(`${skillName} 已删除`)
      await loadSkills()
    } else {
      message.error(`${skillName} 删除失败`)
    }
  } catch {
    message.error(`${skillName} 删除失败`)
  }
}
```

- [ ] **Step 2: Update InstalledList.vue template**

Add the dialog component right before the closing `</div>` of `.container` (before line 170 `</div>`):

```html
<SkillRemoveDialog
  v-if="removeDialogState.visible"
  :skill-name="removeDialogState.skillName"
  :agents="removeDialogState.agents"
  @done="handleRemoveDialogDone"
/>
```

- [ ] **Step 3: Verify typecheck**

Run: `cd E:/ElectronProjects/npx-skills-ui && npm run typecheck`
Expected: no type errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/views/InstalledList.vue
git commit -m "feat: wire SkillRemoveDialog into InstalledList for agent-targeted deletion"
```

---

### Task 3: Manual smoke test

**Files:** none

- [ ] **Step 1: Start dev server**

Run: `cd E:/ElectronProjects/npx-skills-ui && npm run dev`

- [ ] **Step 2: Test single-agent skill deletion**

1. Find a skill installed under only one agent
2. Click delete
3. Expect: simple confirmation dialog (existing behavior)
4. Confirm → skill removed

- [ ] **Step 3: Test multi-agent skill deletion**

1. Find a skill installed under 2+ agents
2. Click delete
3. Expect: new dialog with radio options ("全部删除" + individual agents)
4. Select a specific agent → confirm → skill removed only from that agent
5. Repeat with "全部删除" → skill removed from all agents

- [ ] **Step 4: Test cancel**

1. Click delete on any multi-agent skill
2. Click cancel
3. Expect: dialog closes, no deletion
