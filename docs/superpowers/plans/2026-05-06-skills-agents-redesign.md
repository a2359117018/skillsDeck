# Skills & Agents Module Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inaccurate CLI-based agent attribution with filesystem scanning, redesign the skills page as a searchable list, and make AgentView self-sufficient via directory scanning.

**Architecture:** New `AgentScanner` main-process service scans each agent's `globalPath` directory. Skills store combines `npx list` metadata with scan-based agent attribution. Two views consume enriched data independently.

**Tech Stack:** Electron (main/renderer/preload), Vue 3 + Pinia, TypeScript, Naive UI, `fs.readdir` for scanning.

**Design spec:** `docs/superpowers/specs/2026-05-06-skills-agents-redesign-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/main/services/AgentScanner.ts` | Scan agent directories, build reverse path map |
| Create | `src/main/ipc/agents.ipc.ts` | IPC handlers for agent scanning |
| Create | `src/renderer/src/components/skills/SkillRow.vue` | Two-line list row for installed skills |
| Modify | `src/shared/types.ts` | Add `AgentScanResult` interface |
| Modify | `src/preload/index.ts` | Add `api.agents` namespace |
| Modify | `src/preload/index.d.ts` | Add agents type declarations |
| Modify | `src/main/ipc/index.ts` | Register agents IPC |
| Modify | `src/renderer/src/stores/skills.ts` | Dual data source, enriched skills, search keyword |
| Modify | `src/renderer/src/views/InstalledList.vue` | List layout, search input, new header |
| Modify | `src/renderer/src/views/AgentView.vue` | Scan-based data, search header, simplified logic |
| Modify | `src/renderer/src/components/skills/AgentFilter.vue` | Scan-based options |

---

### Task 1: Add `AgentScanResult` type to shared types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add the interface after the existing `Skill` interface**

Add after line 15 (after the `Skill` interface closing brace):

```typescript
export interface AgentScanResult {
  agentFlag: string
  agentName: string
  globalPath: string
  skills: string[]
  count: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add AgentScanResult type to shared types"
```

---

### Task 2: Create `AgentScanner` service

**Files:**
- Create: `src/main/services/AgentScanner.ts`

- [ ] **Step 1: Create the file with full implementation**

```typescript
import fs from 'fs'
import path from 'path'
import os from 'os'
import type { AgentScanResult } from '../../shared/types'
import agentsData from '../../shared/agents.json'

interface AgentDef {
  name: string
  agentFlag: string
  projectPath: string
  globalPath: string
}

class AgentScanner {
  private agents: AgentDef[] = agentsData as AgentDef[]
  private reverseMap: Map<string, AgentDef[]> = new Map()

  constructor() {
    this.buildReverseMap()
  }

  private buildReverseMap(): void {
    for (const agent of this.agents) {
      const normalized = this.normalizeGlobalPath(agent.globalPath)
      const existing = this.reverseMap.get(normalized) || []
      existing.push(agent)
      this.reverseMap.set(normalized, existing)
    }
  }

  private normalizeGlobalPath(p: string): string {
    const expanded = p.startsWith('~')
      ? path.join(os.homedir(), p.slice(2))
      : path.resolve(p)
    return expanded.replace(/\\/g, '/').toLowerCase()
  }

  private expandPath(p: string): string {
    if (p.startsWith('~')) {
      return path.join(os.homedir(), p.slice(2))
    }
    return path.resolve(p)
  }

  async scanAll(): Promise<AgentScanResult[]> {
    const results: AgentScanResult[] = []
    for (const agent of this.agents) {
      results.push(await this.scanOneAgent(agent))
    }
    return results
  }

  async scanAgent(agentFlag: string): Promise<AgentScanResult | null> {
    const agent = this.agents.find((a) => a.agentFlag === agentFlag)
    if (!agent) return null
    return this.scanOneAgent(agent)
  }

  private async scanOneAgent(agent: AgentDef): Promise<AgentScanResult> {
    const absPath = this.expandPath(agent.globalPath)
    const skills: string[] = []

    try {
      const entries = await fs.promises.readdir(absPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          skills.push(entry.name)
        }
      }
    } catch {
      // directory does not exist — agent not installed
    }

    return {
      agentFlag: agent.agentFlag,
      agentName: agent.name,
      globalPath: absPath,
      skills,
      count: skills.length
    }
  }

  getReversePathMap(): Map<string, AgentDef[]> {
    return this.reverseMap
  }
}

export const agentScanner = new AgentScanner()
```

- [ ] **Step 2: Commit**

```bash
git add src/main/services/AgentScanner.ts
git commit -m "feat: add AgentScanner service for filesystem-based agent scanning"
```

---

### Task 3: Create agents IPC handlers

**Files:**
- Create: `src/main/ipc/agents.ipc.ts`
- Modify: `src/main/ipc/index.ts`

- [ ] **Step 1: Create `src/main/ipc/agents.ipc.ts`**

```typescript
import { ipcMain } from 'electron'
import { agentScanner } from '../services/AgentScanner'

export function registerAgentsIpc(): void {
  ipcMain.handle('agent:scan-all', async () => {
    try {
      return { ok: true, data: await agentScanner.scanAll() }
    } catch (e) {
      return {
        ok: false,
        error: {
          code: 'UNKNOWN' as const,
          command: '',
          stderr: '',
          exitCode: null,
          message: e instanceof Error ? e.message : String(e)
        }
      }
    }
  })

  ipcMain.handle('agent:scan-one', async (_, agentFlag: string) => {
    try {
      return { ok: true, data: await agentScanner.scanAgent(agentFlag) }
    } catch (e) {
      return {
        ok: false,
        error: {
          code: 'UNKNOWN' as const,
          command: '',
          stderr: '',
          exitCode: null,
          message: e instanceof Error ? e.message : String(e)
        }
      }
    }
  })
}
```

- [ ] **Step 2: Register in `src/main/ipc/index.ts`**

Add import at top of file (after line 7):

```typescript
import { registerAgentsIpc } from './agents.ipc'
```

Add call inside `registerIpcHandlers()` function (after `registerShellIpc()` line):

```typescript
registerAgentsIpc()
```

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc/agents.ipc.ts src/main/ipc/index.ts
git commit -m "feat: add agents IPC handlers for filesystem scanning"
```

---

### Task 4: Update preload to expose agents API

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Add `agents` namespace to `src/preload/index.ts`**

Add after the `skills` object inside `const api` (after the `remove` function, before `shell`):

```typescript
agents: {
  scanAll: (): Promise<unknown> => ipcRenderer.invoke('agent:scan-all'),
  scanOne: (agentFlag: string): Promise<unknown> =>
    ipcRenderer.invoke('agent:scan-one', agentFlag)
},
```

- [ ] **Step 2: Add type declarations to `src/preload/index.d.ts`**

Add `AgentScanResult` to the import from `'../shared/types'`:

```typescript
import type {
  EnvStatus,
  Skill,
  AppSettings,
  CommandResult,
  SkillSearchResponse,
  CommandErrorInfo,
  AgentScanResult
} from '../shared/types'
```

Add `agents` section to the `AppApi` interface (after `skills`, before `shell`):

```typescript
agents: {
  scanAll: () => Promise<IpcResult<AgentScanResult[]>>
  scanOne: (agentFlag: string) => Promise<IpcResult<AgentScanResult | null>>
}
```

- [ ] **Step 3: Commit**

```bash
git add src/preload/index.ts src/preload/index.d.ts
git commit -m "feat: expose agents scanning API via preload"
```

---

### Task 5: Update skills store with dual data source

**Files:**
- Modify: `src/renderer/src/stores/skills.ts`

This is the largest change. The store gains a second data source (agent scan), enriched skill computation, and search keyword state.

- [ ] **Step 1: Add `AgentScanResult` to the import from shared types**

Change line 3 from:

```typescript
import type { Skill, CommandResult, SkillSearchResult } from '../../../shared/types'
```

to:

```typescript
import type {
  Skill,
  CommandResult,
  SkillSearchResult,
  AgentScanResult
} from '../../../shared/types'
```

- [ ] **Step 2: Add `agentScanCache` after `installedCache`**

Add after the `installedCache` definition (after line 14):

```typescript
const agentScanCache = useCachedResource<AgentScanResult[]>(
  async () => unwrapResult(await window.api.agents.scanAll()),
  []
)
```

- [ ] **Step 3: Add `searchKeyword` ref**

Add after `selectedAgents` ref (after line 16):

```typescript
const searchKeyword = ref('')
```

- [ ] **Step 4: Replace `filteredSkills` computed with enriched pipeline**

Delete the existing `filteredSkills` computed and replace with these three computed properties:

```typescript
const enrichedSkills = computed(() => {
  const scanData = agentScanCache.data.value
  if (!scanData || scanData.length === 0) return installedCache.data.value

  const pathToAgents = new Map<string, string[]>()
  for (const result of scanData) {
    const normalized = result.globalPath.replace(/\\/g, '/').toLowerCase()
    const existing = pathToAgents.get(normalized) || []
    existing.push(result.agentFlag)
    pathToAgents.set(normalized, existing)
  }

  return installedCache.data.value.map((skill) => ({
    ...skill,
    agents: resolveAgentsByPath(skill.path, pathToAgents)
  }))
})

const filteredSkills = computed(() => {
  let skills = enrichedSkills.value

  if (selectedAgents.value.length > 0) {
    const lowered = selectedAgents.value.map((a) => a.toLowerCase())
    skills = skills.filter((s) => s.agents.some((a) => lowered.includes(a.toLowerCase())))
  }

  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    skills = skills.filter((s) => s.name.toLowerCase().includes(kw))
  }

  return skills
})

const sortedAgentResults = computed(() =>
  [...(agentScanCache.data.value || [])].sort((a, b) => b.count - a.count)
)
```

- [ ] **Step 5: Add `resolveAgentsByPath` helper function**

Add after `unwrapResult` function (after line 24):

```typescript
function resolveAgentsByPath(
  skillPath: string,
  pathToAgents: Map<string, string[]>
): string[] {
  const normalized = skillPath.replace(/\\/g, '/').toLowerCase()
  const matched: string[] = []
  for (const [dir, flags] of pathToAgents) {
    if (normalized.includes(dir)) {
      matched.push(...flags)
    }
  }
  return matched
}
```

- [ ] **Step 6: Update `fetchInstalled` to refresh both caches**

Replace the existing `fetchInstalled` function with:

```typescript
async function fetchInstalled(_global?: boolean): Promise<void> {
  void _global
  await Promise.all([installedCache.ensure(), agentScanCache.ensure()])
}
```

- [ ] **Step 7: Add `setSearchKeyword` function**

Add after `clearError`:

```typescript
function setSearchKeyword(keyword: string): void {
  searchKeyword.value = keyword
}
```

- [ ] **Step 8: Update the return object**

Replace the entire return block with:

```typescript
return {
  searchResults,
  searchDuration,
  installedSkills,
  selectedAgents,
  filteredSkills,
  enrichedSkills,
  sortedAgentResults,
  fetching,
  searching,
  installing,
  updating,
  updatingAll,
  removing,
  loading,
  error,
  searchKeyword,
  clearError,
  setSearchKeyword,
  setMessageHandler,
  search,
  fetchInstalled,
  install,
  installStreaming,
  update,
  updateAll,
  remove,
  openLocation
}
```

- [ ] **Step 9: Run typecheck**

Run: `npm run typecheck`
Expected: No errors (typecheck passes)

- [ ] **Step 10: Commit**

```bash
git add src/renderer/src/stores/skills.ts
git commit -m "feat: add dual data source and enriched agent attribution to skills store"
```

---

### Task 6: Create `SkillRow` component

**Files:**
- Create: `src/renderer/src/components/skills/SkillRow.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { NIcon, NButton, NTag, NText } from 'naive-ui'
import { FolderOpenOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import type { Skill } from '../../../../shared/types'

const props = defineProps<{ skill: Skill }>()

const emit = defineEmits<{
  update: [name: string]
  remove: [name: string]
  openLocation: [path: string]
}>()
</script>

<template>
  <div class="skill-row">
    <div class="skill-row-line1">
      <NText class="skill-row-name">{{ props.skill.name }}</NText>
      <div class="skill-row-actions">
        <NButton
          quaternary
          circle
          size="tiny"
          title="打开位置"
          @click="emit('openLocation', props.skill.path)"
        >
          <template #icon>
            <NIcon :size="16"><FolderOpenOutline /></NIcon>
          </template>
        </NButton>
        <NButton
          quaternary
          circle
          size="tiny"
          title="更新"
          @click="emit('update', props.skill.name)"
        >
          <template #icon>
            <NIcon :size="16"><RefreshOutline /></NIcon>
          </template>
        </NButton>
        <NButton
          quaternary
          circle
          size="tiny"
          type="error"
          title="删除"
          @click="emit('remove', props.skill.name)"
        >
          <template #icon>
            <NIcon :size="16"><TrashOutline /></NIcon>
          </template>
        </NButton>
      </div>
    </div>
    <div v-if="props.skill.agents.length > 0" class="skill-row-agents">
      <NTag
        v-for="agent in props.skill.agents"
        :key="agent"
        size="small"
        :bordered="false"
        round
        class="skill-row-tag"
      >
        {{ agent }}
      </NTag>
    </div>
  </div>
</template>

<style scoped>
.skill-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 12px;
  border-bottom: 1px solid #eaecf0;
  transition: background 0.15s ease;
}

.skill-row:hover {
  background: #f7f8fa;
  box-shadow: rgba(0, 0, 0, 0.04) 0 1px 2px;
}

.skill-row-line1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-row-name {
  font-weight: 500;
  font-size: 14px;
  color: #222222;
}

.skill-row-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.skill-row:hover .skill-row-actions {
  opacity: 1;
}

.skill-row-agents {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.skill-row-tag {
  font-size: 12px;
  font-weight: 400;
  --n-border-radius: 9999px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/skills/SkillRow.vue
git commit -m "feat: add SkillRow two-line list component"
```

---

### Task 7: Redesign `InstalledList` view

**Files:**
- Modify: `src/renderer/src/views/InstalledList.vue`

- [ ] **Step 1: Replace entire file content**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import {
  NButton,
  NEmpty,
  NSpace,
  NText,
  NScrollbar,
  NInput,
  NIcon,
  useMessage
} from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { useSkillsStore } from '../stores/skills'
import { useConfirm } from '../composables/useConfirm'
import AgentFilter from '../components/skills/AgentFilter.vue'
import SkillRow from '../components/skills/SkillRow.vue'

const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdateAll, confirmUpdate, confirmRemove } = useConfirm()

skillsStore.setMessageHandler((msg, type) => {
  message[type](msg)
})

async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled(true)
}

onMounted(() => loadSkills())

async function handleUpdateAll(): Promise<void> {
  const names = skillsStore.installedSkills.map((s) => s.name)
  if (names.length === 0) {
    message.info('没有可更新的技能')
    return
  }
  const confirmed = await confirmUpdateAll(names)
  if (!confirmed) return
  try {
    const result = await skillsStore.updateAll(true)
    if (result.success) {
      message.success('更新成功')
      await loadSkills()
    } else {
      message.error('更新失败: ' + (result.stderr || '未知错误'))
    }
  } catch {
    message.error('更新失败')
  }
}

async function handleUpdate(name: string): Promise<void> {
  const confirmed = await confirmUpdate(name)
  if (!confirmed) return
  try {
    const result = await skillsStore.update(name, true)
    if (result.success) {
      message.success(`${name} 更新成功`)
      await loadSkills()
    } else {
      message.error(`${name} 更新失败`)
    }
  } catch {
    message.error(`${name} 更新失败`)
  }
}

async function handleRemove(name: string): Promise<void> {
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
}

function handleOpenLocation(path: string): void {
  skillsStore.openLocation(path)
}

function handleSearchInput(val: string): void {
  skillsStore.setSearchKeyword(val)
}
</script>

<template>
  <div class="list-page">
    <div class="list-header">
      <NInput
        :value="skillsStore.searchKeyword"
        placeholder="搜索技能..."
        clearable
        round
        class="search-input"
        @update:value="handleSearchInput"
      />
      <NSpace align="center" :size="12">
        <AgentFilter v-model="skillsStore.selectedAgents" />
        <NText class="count-text">{{ skillsStore.filteredSkills.length }} 个技能</NText>
        <NButton size="small" round @click="handleUpdateAll" :loading="skillsStore.updatingAll">
          <template #icon>
            <NIcon :size="14"><RefreshOutline /></NIcon>
          </template>
          全部更新
        </NButton>
      </NSpace>
    </div>
    <NScrollbar class="list-scroll">
      <div v-if="skillsStore.filteredSkills.length > 0" class="skill-list">
        <TransitionGroup name="list" tag="div">
          <SkillRow
            v-for="skill in skillsStore.filteredSkills"
            :key="skill.name"
            :skill="skill"
            @update="handleUpdate"
            @remove="handleRemove"
            @open-location="handleOpenLocation"
          />
        </TransitionGroup>
      </div>
      <NEmpty v-else description="暂无已安装的技能" style="margin-top: 48px" />
    </NScrollbar>
  </div>
</template>

<style scoped>
.list-page {
  max-width: 960px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
  gap: 12px;
}

.search-input {
  max-width: 240px;
}

.count-text {
  font-size: 14px;
  font-weight: 400;
  color: #45515e;
}

.list-scroll {
  flex: 1;
  min-height: 0;
}

.list-scroll :deep(.n-scrollbar-rail) {
  display: none !important;
}

.skill-list {
  padding-bottom: 24px;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.list-move {
  transition: transform 0.2s ease;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/views/InstalledList.vue
git commit -m "feat: redesign InstalledList with search, list layout, and enriched data"
```

---

### Task 8: Update `AgentFilter` to use scan-based options

**Files:**
- Modify: `src/renderer/src/components/skills/AgentFilter.vue`

- [ ] **Step 1: Replace entire file content**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NSelect } from 'naive-ui'
import { useSkillsStore } from '@renderer/stores/skills'

const skillsStore = useSkillsStore()
const selectedAgents = defineModel<string[]>({ default: () => [] })

const agentOptions = computed(() =>
  (skillsStore.sortedAgentResults || [])
    .filter((a) => a.count > 0)
    .map((a) => ({
      label: `${a.agentName} (${a.count})`,
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

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/skills/AgentFilter.vue
git commit -m "feat: update AgentFilter to use scan-based agent options"
```

---

### Task 9: Redesign `AgentView` with scan-based data

**Files:**
- Modify: `src/renderer/src/views/AgentView.vue`

- [ ] **Step 1: Replace entire file content**

```vue
<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import {
  NDrawer,
  NDrawerContent,
  NEmpty,
  NTag,
  NText,
  NSpace,
  NButton,
  NIcon,
  NScrollbar,
  NInput,
  useMessage
} from 'naive-ui'
import { FolderOpenOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import { useSkillsStore } from '@renderer/stores/skills'
import { useConfirm } from '@renderer/composables/useConfirm'
import type { AgentScanResult } from '../../../shared/types'

const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdate, confirmRemove } = useConfirm()

skillsStore.setMessageHandler((msg, type) => {
  message[type](msg)
})

const agentSearchKeyword = ref('')
const selectedAgent = ref<AgentScanResult | null>(null)
const drawerVisible = ref(false)
const updatingSkill = ref<string | null>(null)
const removingSkill = ref<string | null>(null)

const visibleAgentResults = computed(() =>
  skillsStore.sortedAgentResults.filter((a) => {
    if (a.count === 0) return false
    if (!agentSearchKeyword.value) return true
    return a.agentName.toLowerCase().includes(agentSearchKeyword.value.toLowerCase())
  })
)

function openAgentCard(agent: AgentScanResult): void {
  selectedAgent.value = agent
  drawerVisible.value = true
}

function closeDrawer(): void {
  drawerVisible.value = false
  selectedAgent.value = null
}

function openAgentFolder(agent: AgentScanResult, e?: Event): void {
  e?.stopPropagation()
  skillsStore.openLocation(agent.globalPath)
}

async function handleOpenLocation(path: string): Promise<void> {
  await skillsStore.openLocation(path)
}

async function handleUpdate(name: string): Promise<void> {
  const confirmed = await confirmUpdate(name)
  if (!confirmed) return
  updatingSkill.value = name
  try {
    const result = await skillsStore.update(name, true)
    if (result.success) {
      message.success(`${name} 更新成功`)
      await skillsStore.fetchInstalled(true)
    } else {
      message.error(`${name} 更新失败`)
    }
  } catch {
    message.error(`${name} 更新失败`)
  } finally {
    updatingSkill.value = null
  }
}

async function handleRemove(name: string): Promise<void> {
  const confirmed = await confirmRemove(name)
  if (!confirmed) return
  removingSkill.value = name
  try {
    const result = await skillsStore.remove(name, true)
    if (result.success) {
      message.success(`${name} 已删除`)
      await skillsStore.fetchInstalled(true)
    } else {
      message.error(`${name} 删除失败`)
    }
  } catch {
    message.error(`${name} 删除失败`)
  } finally {
    removingSkill.value = null
  }
}

async function handleRefresh(): Promise<void> {
  await skillsStore.fetchInstalled(true)
}

onMounted(() => skillsStore.fetchInstalled(true))
</script>

<template>
  <div class="agent-view">
    <div class="agent-header">
      <NInput
        v-model:value="agentSearchKeyword"
        placeholder="搜索 Agent..."
        clearable
        round
        class="agent-search-input"
      />
      <NButton size="small" quaternary circle title="刷新" @click="handleRefresh">
        <template #icon>
          <NIcon :size="18"><RefreshOutline /></NIcon>
        </template>
      </NButton>
    </div>
    <NScrollbar class="agent-scroll">
      <div v-if="visibleAgentResults.length > 0" class="agent-grid">
        <div
          v-for="agent in visibleAgentResults"
          :key="agent.agentFlag"
          class="card-base agent-card"
          @click="openAgentCard(agent)"
        >
          <div class="card-base-body agent-card-body">
            <div class="agent-card-header">
              <NText class="card-base-text">{{ agent.agentName }}</NText>
              <NTag size="small" :bordered="false" round type="info">{{ agent.count }}</NTag>
            </div>
            <div class="agent-card-footer">
              <NText depth="3" style="font-size: 12px">{{ agent.count }} 个技能</NText>
              <div class="agent-folder-btn">
                <NButton
                  size="tiny"
                  quaternary
                  circle
                  title="打开技能文件夹"
                  @click="openAgentFolder(agent, $event)"
                >
                  <template #icon>
                    <NIcon :size="14"><FolderOpenOutline /></NIcon>
                  </template>
                </NButton>
              </div>
            </div>
          </div>
        </div>
      </div>
      <NEmpty v-else description="暂无已安装的技能" style="margin-top: 48px" />
    </NScrollbar>

    <NDrawer
      :show="drawerVisible"
      :width="480"
      placement="right"
      @update:show="
        (val: boolean) => {
          if (!val) closeDrawer()
        }
      "
      @mask-click="closeDrawer"
    >
      <NDrawerContent closable :native-scrollbar="false" @close="closeDrawer">
        <template #header>
          <NSpace align="center" :size="8">
            <NText strong style="font-size: 16px">
              {{ selectedAgent ? selectedAgent.agentName : '' }}
            </NText>
            <NTag size="small" :bordered="false" type="info">
              {{ selectedAgent ? selectedAgent.count : 0 }} 个技能
            </NTag>
          </NSpace>
        </template>
        <div v-if="selectedAgent" class="skill-table">
          <div v-for="skillName in selectedAgent.skills" :key="skillName" class="skill-table-row">
            <div class="skill-table-info">
              <NText strong class="skill-table-name">{{ skillName }}</NText>
            </div>
            <NSpace :size="4" align="center">
              <NButton
                quaternary
                circle
                size="tiny"
                title="打开位置"
                @click="handleOpenLocation(selectedAgent!.globalPath + '/' + skillName)"
              >
                <template #icon>
                  <NIcon :size="15"><FolderOpenOutline /></NIcon>
                </template>
              </NButton>
              <NButton
                quaternary
                circle
                size="tiny"
                title="更新"
                :loading="updatingSkill === skillName"
                @click="handleUpdate(skillName)"
              >
                <template #icon>
                  <NIcon :size="15"><RefreshOutline /></NIcon>
                </template>
              </NButton>
              <NButton
                quaternary
                circle
                size="tiny"
                type="error"
                title="删除"
                :loading="removingSkill === skillName"
                @click="handleRemove(skillName)"
              >
                <template #icon>
                  <NIcon :size="15"><TrashOutline /></NIcon>
                </template>
              </NButton>
            </NSpace>
          </div>
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.agent-view {
  max-width: 960px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
  gap: 12px;
}

.agent-search-input {
  max-width: 240px;
}

.agent-scroll {
  flex: 1;
  min-height: 0;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  padding-bottom: 24px;
}

.agent-card {
  cursor: pointer;
}

.agent-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agent-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agent-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agent-folder-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.agent-card:hover .agent-folder-btn,
.agent-card:focus-within .agent-folder-btn {
  opacity: 1;
}

.skill-table {
  display: flex;
  flex-direction: column;
}

.skill-table-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e8eaee;
}

.skill-table-row:last-child {
  border-bottom: none;
}

.skill-table-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.skill-table-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/views/AgentView.vue
git commit -m "feat: redesign AgentView with scan-based data and search"
```

---

### Task 10: Run lint, format, and typecheck

- [ ] **Step 1: Run format**

Run: `npm run format`

- [ ] **Step 2: Run lint**

Run: `npm run lint`

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 4: Fix any issues found and commit**

If any errors found in lint/typecheck, fix them and commit with message:

```bash
git commit -m "fix: lint and typecheck fixes"
```

---

### Task 11: Remove unused `SkillCard.vue`

**Files:**
- Delete: `src/renderer/src/components/skills/SkillCard.vue`

- [ ] **Step 1: Verify `SkillCard` is not imported anywhere**

Run: `rg "SkillCard" src/`

Expected: No imports found (InstalledList now uses SkillRow, AgentView uses inline rows, SkillsSearch uses SearchResultCard)

- [ ] **Step 2: Delete the file**

```bash
git rm src/renderer/src/components/skills/SkillCard.vue
git commit -m "chore: remove unused SkillCard component"
```
