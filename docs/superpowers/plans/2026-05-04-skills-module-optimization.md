# Skills Module Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the skills listing page: remove project tab, add multi-select agent filtering with client-side filtering, replace table with card grid layout, add "open location" action.

**Architecture:** One-shot data fetch from `npx skills list --json -g` (no `--agent` param). Client-side filtering by selected agents. New `AgentFilter.vue` and `SkillCard.vue` components. New `shell:open-path` IPC for opening file explorer.

**Tech Stack:** Electron (main/preload/renderer), Vue 3 + `<script setup lang="ts">`, Pinia, Naive UI, TypeScript

---

### Task 1: Data Layer — SkillsService + IPC + Preload

**Files:**

- Modify: `src/main/services/SkillsService.ts:76-95`
- Modify: `src/main/ipc/skills.ipc.ts:16-17`
- Modify: `src/main/ipc/index.ts:1-9`
- Modify: `src/preload/index.ts:7-8`
- Modify: `src/preload/index.d.ts:13`

- [ ] **Step 1: Remove agent param from listSkills in SkillsService.ts**

Change the `listSkills` function signature and body — remove the `agent` parameter and the `--agent` arg logic:

```typescript
// src/main/services/SkillsService.ts — replace listSkills function (lines 76-95)
export async function listSkills(global?: boolean): Promise<Skill[]> {
  const args = ['list', '--json']
  if (global) args.push('-g')
  const result = await execute(args)
  if (!result.success) {
    throw new SkillsError('EXECUTION_FAILED', 'list', result.stderr, result.exitCode)
  }
  try {
    return JSON.parse(result.stdout)
  } catch (error) {
    console.error('Failed to parse skills list JSON:', error)
    throw new SkillsError(
      'EXECUTION_FAILED',
      'list',
      `Invalid JSON: ${result.stdout}`,
      result.exitCode
    )
  }
}
```

- [ ] **Step 2: Update skills.ipc.ts — remove agent from skills:list handler**

```typescript
// src/main/ipc/skills.ipc.ts — replace line 16-17
ipcMain.handle('skills:list', async (_, opts?: { global?: boolean }) => {
  return listSkills(opts?.global)
})
```

- [ ] **Step 3: Add shell:open-path IPC handler in index.ts**

Add a new `shellIpc` registration in `src/main/ipc/index.ts`:

```typescript
// src/main/ipc/index.ts — replace entire file
import { ipcMain, shell } from 'electron'
import { registerSkillsIpc } from './skills.ipc'
import { registerEnvIpc } from './env.ipc'
import { registerStoreIpc } from './store.ipc'

function registerShellIpc(): void {
  ipcMain.handle('shell:open-path', async (_, path: string) => {
    shell.showItemInFolder(path)
  })
}

export function registerIpcHandlers(): void {
  registerSkillsIpc()
  registerEnvIpc()
  registerStoreIpc()
  registerShellIpc()
}
```

- [ ] **Step 4: Add openPath to preload/index.ts**

Add `openPath` inside the `api` object after the `skills` block:

```typescript
// src/preload/index.ts — add after the skills block (after line 17), before env:
  shell: {
    openPath: (path: string): Promise<void> => ipcRenderer.invoke('shell:open-path', path)
  },
```

- [ ] **Step 5: Add openPath type to preload/index.d.ts**

Add a `shell` section to the `AppApi` interface in `src/preload/index.d.ts`, after the `skills` block and before `env`:

```typescript
shell: {
  openPath: (path: string) => Promise<void>
}
```

- [ ] **Step 6: Run typecheck to verify data layer changes**

Run: `npm run typecheck`
Expected: PASS (no type errors)

---

### Task 2: Pinia Store — Add Filtering State and Actions

**Files:**

- Modify: `src/renderer/src/stores/skills.ts`

- [ ] **Step 1: Update the store with selectedAgents, filteredSkills, and openLocation**

Replace the entire store file:

```typescript
// src/renderer/src/stores/skills.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Skill, CommandResult, SkillSearchResult } from '../../../shared/types'

export const useSkillsStore = defineStore('skills', () => {
  const searchResults = ref<SkillSearchResult[]>([])
  const searchDuration = ref(0)
  const installedSkills = ref<Skill[]>([])
  const selectedAgents = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const filteredSkills = computed(() => {
    if (selectedAgents.value.length === 0) return installedSkills.value
    return installedSkills.value.filter((skill) =>
      selectedAgents.value.some((agent) => skill.agents.includes(agent))
    )
  })

  function clearError(): void {
    error.value = null
  }

  async function search(keyword: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await window.api.skills.search(keyword)
      searchResults.value = response.skills
      searchDuration.value = response.duration_ms
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed'
      searchResults.value = []
      searchDuration.value = 0
    } finally {
      loading.value = false
    }
  }

  async function fetchInstalled(global?: boolean): Promise<void> {
    loading.value = true
    error.value = null
    try {
      installedSkills.value = await window.api.skills.list({ global })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load skills'
    } finally {
      loading.value = false
    }
  }

  async function install(
    packageRef: string,
    agents: string[],
    isGlobal: boolean
  ): Promise<CommandResult> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.install({ packageRef, agents, global: isGlobal })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Install failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(packageRef: string, global?: boolean): Promise<CommandResult> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.update({ packageRef, global })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateAll(global?: boolean): Promise<CommandResult> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.updateAll({ global })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update all failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(packageRef: string): Promise<CommandResult> {
    loading.value = true
    error.value = null
    try {
      return await window.api.skills.remove({ packageRef })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Remove failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function openLocation(path: string): Promise<void> {
    await window.api.shell.openPath(path)
  }

  return {
    searchResults,
    searchDuration,
    installedSkills,
    selectedAgents,
    filteredSkills,
    loading,
    error,
    clearError,
    search,
    fetchInstalled,
    install,
    update,
    updateAll,
    remove,
    openLocation
  }
})
```

- [ ] **Step 2: Run typecheck to verify store changes**

Run: `npm run typecheck`
Expected: PASS

---

### Task 3: Create AgentFilter.vue Component

**Files:**

- Create: `src/renderer/src/components/skills/AgentFilter.vue`

- [ ] **Step 1: Create AgentFilter.vue**

```vue
<!-- src/renderer/src/components/skills/AgentFilter.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { NSelect } from 'naive-ui'
import { AGENTS } from '@renderer/constants/agents'

const selectedAgents = defineModel<string[]>({ default: () => [] })

const agentOptions = computed(() =>
  AGENTS.map((a) => ({
    label: a.name,
    value: a.agentFlag
  }))
)
</script>

<template>
  <NSelect
    v-model:value="selectedAgents"
    :options="agentOptions"
    multiple
    filterable
    placeholder="筛选 Agent"
    clearable
    max-tag-count="responsive"
    style="min-width: 260px"
  />
</template>
```

---

### Task 4: Create SkillCard.vue Component

**Files:**

- Create: `src/renderer/src/components/skills/SkillCard.vue`

- [ ] **Step 1: Create SkillCard.vue**

```vue
<!-- src/renderer/src/components/skills/SkillCard.vue -->
<script setup lang="ts">
import { NButton, NSpace, NTag, NText } from 'naive-ui'
import { AGENTS } from '@renderer/constants/agents'
import type { Skill } from '../../../../shared/types'

const props = defineProps<{ skill: Skill }>()

const emit = defineEmits<{
  update: [name: string]
  remove: [name: string]
  openLocation: [path: string]
}>()

const agentNameMap = new Map(AGENTS.map((a) => [a.agentFlag, a.name]))

function getAgentName(flag: string): string {
  return agentNameMap.get(flag) || flag
}
</script>

<template>
  <div class="skill-card">
    <NText class="skill-name">{{ props.skill.name }}</NText>
    <div class="skill-agents">
      <NTag v-for="agent in props.skill.agents" :key="agent" size="small" :bordered="false" round>
        {{ getAgentName(agent) }}
      </NTag>
    </div>
    <NSpace class="skill-actions" :size="8" align="center">
      <NButton size="tiny" quaternary @click="emit('openLocation', props.skill.source)">
        打开位置
      </NButton>
      <NButton size="tiny" quaternary @click="emit('update', props.skill.name)"> 更新 </NButton>
      <NButton size="tiny" quaternary type="error" @click="emit('remove', props.skill.name)">
        删除
      </NButton>
    </NSpace>
  </div>
</template>

<style scoped>
.skill-card {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--n-border-color);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-name {
  font-weight: 600;
  font-size: 15px;
}

.skill-agents {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.skill-actions {
  margin-top: auto;
}
</style>
```

---

### Task 5: Rewrite InstalledList.vue

**Files:**

- Modify: `src/renderer/src/views/InstalledList.vue`

- [ ] **Step 1: Rewrite InstalledList.vue**

```vue
<!-- src/renderer/src/views/InstalledList.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { NButton, NEmpty, NSpin, NSpace, NText } from 'naive-ui'
import { useSkillsStore } from '../stores/skills'
import AgentFilter from '../components/skills/AgentFilter.vue'
import SkillCard from '../components/skills/SkillCard.vue'
import { useMessage } from 'naive-ui'

const skillsStore = useSkillsStore()
const message = useMessage()

async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled(true)
}

onMounted(() => loadSkills())

async function handleUpdateAll(): Promise<void> {
  const result = await skillsStore.updateAll(true)
  if (result.success) {
    message.success('更新成功')
    loadSkills()
  } else {
    message.error('更新失败: ' + (result.stderr || '未知错误'))
  }
}

async function handleUpdate(name: string): Promise<void> {
  const result = await skillsStore.update(name, true)
  if (result.success) {
    message.success(`${name} 更新成功`)
    loadSkills()
  } else {
    message.error(`${name} 更新失败`)
  }
}

async function handleRemove(name: string): Promise<void> {
  if (!window.confirm(`确定删除 ${name}? 此操作不可撤销`)) return
  const result = await skillsStore.remove(name)
  if (result.success) {
    message.success(`${name} 已删除`)
    loadSkills()
  } else {
    message.error(`${name} 删除失败`)
  }
}

function handleOpenLocation(path: string): void {
  skillsStore.openLocation(path)
}
</script>

<template>
  <div class="list-page">
    <div class="list-header">
      <NText class="count-text">{{ skillsStore.filteredSkills.length }} 个技能</NText>
      <NSpace align="center" :size="12">
        <AgentFilter v-model="skillsStore.selectedAgents" />
        <NButton
          type="primary"
          size="small"
          :loading="skillsStore.loading"
          @click="handleUpdateAll"
        >
          全部更新
        </NButton>
      </NSpace>
    </div>
    <NSpin :show="skillsStore.loading">
      <div v-if="skillsStore.filteredSkills.length > 0" class="card-grid">
        <SkillCard
          v-for="skill in skillsStore.filteredSkills"
          :key="skill.name"
          :skill="skill"
          @update="handleUpdate"
          @remove="handleRemove"
          @open-location="handleOpenLocation"
        />
      </div>
      <NEmpty
        v-else-if="!skillsStore.loading"
        description="暂无已安装的技能"
        style="margin-top: 48px"
      />
    </NSpin>
  </div>
</template>

<style scoped>
.list-page {
  max-width: 960px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.count-text {
  font-size: 14px;
  font-weight: 500;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
</style>
```

---

### Task 6: Adapt AgentView.vue

**Files:**

- Modify: `src/renderer/src/views/AgentView.vue:28`

- [ ] **Step 1: Update fetchInstalled call in AgentView.vue**

The call at line 28 currently passes `true` as `global` and no agent. Since `fetchInstalled` no longer accepts `agent`, this call is already compatible — no change needed for the signature. But verify it compiles.

Actually, the existing call `skillsStore.fetchInstalled(true)` already matches the new signature `fetchInstalled(global?: boolean)`. No code change needed here. Skip this task.

---

### Task 7: Verify Everything

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — no type errors in node or web compilation

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS — no lint errors
