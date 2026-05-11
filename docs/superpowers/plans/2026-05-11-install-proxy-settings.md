# 安装进度与代理设置改造实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将技能安装日志替换为不确定性进度条，在设置中新增 GitHub 代理选择器，并改造安装命令参数构造为 git URL 格式。

**Architecture:** 后端 `NpxService` 从 `StoreService` 读取代理设置，拼接 `https://github.com/{source}.git`（或代理前缀版）作为 `npx skills add` 的参数。前端 `SkillInstallDialog` 移除实时终端输出，改为 indeterminate 进度条 + 状态文字，失败时展示原始日志。设置页面新增 `NSelect` 代理选择器。

**Tech Stack:** Electron + Vue 3 + NaiveUI + TypeScript + Pinia + electron-store

---

## File Structure

| File                                                        | Responsibility                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/shared/types.ts`                                       | `AppSettings` 接口新增 `proxyUrl` 字段                                      |
| `src/main/services/StoreService.ts`                         | 默认设置值新增 `proxyUrl: ''`                                               |
| `src/main/services/NpxService.ts`                           | 新增 `buildGitUrl`，改造 `buildInstallArgs` 接收 `source` 而非 `packageRef` |
| `src/main/ipc/skills.ipc.ts`                                | `install` 和 `install-streaming` handler 参数名 `packageRef` → `source`     |
| `src/preload/index.ts`                                      | `install` / `installStreaming` 的 opts 字段名同步更新                       |
| `src/preload/index.d.ts`                                    | `AppApi` 类型签名同步更新                                                   |
| `src/renderer/src/stores/skills.ts`                         | `doInstall` / `install` / `installStreaming` 参数名和 opts 字段名更新       |
| `src/renderer/src/stores/settings.ts`                       | `settingsCache` 默认值和 `save` 参数类型扩展                                |
| `src/renderer/src/views/SettingsView.vue`                   | 新增代理选择器 UI（预设 + 自定义输入）                                      |
| `src/renderer/src/components/skills/SkillInstallDialog.vue` | 移除终端输出区域，改为进度指示器；prop `packageRef` → `source`              |
| `src/renderer/src/components/skills/SearchResultCard.vue`   | `install` emit 传 `result.source` 而非 `packageRef`                         |
| `src/renderer/src/views/SkillsSearch.vue`                   | `handleInstall` 和 dialog prop 改为传 `source`                              |
| `src/renderer/src/views/SkillDetail.vue`                    | 计算 `source` 并传给 dialog                                                 |

---

### Task 1: Shared Types and StoreService Defaults

**Files:**

- Modify: `src/shared/types.ts:50-53`
- Modify: `src/main/services/StoreService.ts:9-12`

- [ ] **Step 1: Add `proxyUrl` to `AppSettings`**

```typescript
// src/shared/types.ts
export interface AppSettings {
  defaultAgent: string
  autoCheckEnv: boolean
  proxyUrl?: string
}
```

- [ ] **Step 2: Add `proxyUrl` to default settings**

```typescript
// src/main/services/StoreService.ts
const DEFAULT_SETTINGS: AppSettings = {
  defaultAgent: 'claude-code',
  autoCheckEnv: true,
  proxyUrl: ''
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts src/main/services/StoreService.ts
git commit -m "feat(settings): add proxyUrl field to AppSettings and defaults

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: NpxService URL Construction

**Files:**

- Modify: `src/main/services/NpxService.ts`

- [ ] **Step 1: Import `getSettings` and add `buildGitUrl`**

Replace the entire file content:

```typescript
import type { CommandResult } from '../../shared/types'
import { commandRunner } from './CommandRunner'
import { getSettings } from './StoreService'

class NpxService {
  async checkNpxVersion(): Promise<{ ok: boolean; version: string | null }> {
    try {
      const result = await commandRunner.run('npx', ['--version'], { timeout: 10000 })
      if (result.success) {
        return { ok: true, version: result.stdout.trim() }
      }
      return { ok: false, version: null }
    } catch {
      return { ok: false, version: null }
    }
  }

  async checkSkillsVersion(): Promise<{ ok: boolean; version: string | null }> {
    try {
      const result = await commandRunner.run('npx', ['skills', '--version'], {
        timeout: 10000
      })
      if (result.success) {
        return { ok: true, version: result.stdout.trim() }
      }
      return { ok: false, version: null }
    } catch {
      return { ok: false, version: null }
    }
  }

  async install(source: string, agents: string[], global?: boolean): Promise<CommandResult> {
    const args = this.buildInstallArgs(source, agents, global)
    return commandRunner.run('npx', args)
  }

  async installStreaming(
    onOutput: (text: string) => void,
    source: string,
    agents: string[],
    global?: boolean
  ): Promise<CommandResult> {
    const args = this.buildInstallArgs(source, agents, global)
    return commandRunner.run('npx', args, { onOutput })
  }

  cancelInstall(): void {
    commandRunner.cancel()
  }

  async update(name: string, global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('update', name, '-y')
    if (global) args.push('-g')
    return commandRunner.run('npx', args)
  }

  async updateAll(global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('update', '-y')
    if (global) args.push('-g')
    return commandRunner.run('npx', args)
  }

  async remove(name: string, agent?: string, global?: boolean): Promise<CommandResult> {
    const args = this.buildArgs('remove', name, '-y')
    if (global) args.push('-g')
    if (agent) args.push('-a', agent)
    return commandRunner.run('npx', args)
  }

  private buildArgs(subcommand: string, ...parts: string[]): string[] {
    return ['skills', subcommand, ...parts]
  }

  private buildGitUrl(source: string): string {
    const proxyUrl = getSettings().proxyUrl
    if (proxyUrl) {
      return `${proxyUrl}/https://github.com/${source}.git`
    }
    return `https://github.com/${source}.git`
  }

  private buildInstallArgs(source: string, agents: string[], global?: boolean): string[] {
    const gitUrl = this.buildGitUrl(source)
    const args = this.buildArgs('add', gitUrl)
    args.push('-g', '-y')
    if (global) {
      args.push('--agent', '*')
    } else if (agents.length > 0) {
      args.push('--agent', ...agents)
    }
    return args
  }
}

export const npxService = new NpxService()
```

- [ ] **Step 2: Commit**

```bash
git add src/main/services/NpxService.ts
git commit -m "feat(npx): build git URL with proxy prefix for skill install

- Add buildGitUrl that reads proxyUrl from settings
- buildInstallArgs now receives source (owner/repo) instead of packageRef
- install and installStreaming signatures updated

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: IPC and Preload Layer Parameter Rename

**Files:**

- Modify: `src/main/ipc/skills.ipc.ts:39-86`
- Modify: `src/preload/index.ts:8-14`
- Modify: `src/preload/index.d.ts:18-27`

- [ ] **Step 1: Update IPC handlers**

In `src/main/ipc/skills.ipc.ts`, replace the `skills:install` and `skills:install-streaming` handlers:

```typescript
ipcMain.handle(
  'skills:install',
  async (_, opts: { source: string; agents: string[]; global?: boolean }) => {
    try {
      return {
        ok: true,
        data: await npxService.install(opts.source, opts.agents, opts.global)
      }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  }
)

ipcMain.handle(
  'skills:install-streaming',
  async (_, opts: { source: string; agents: string[]; global?: boolean }) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) {
      return {
        ok: false,
        error: {
          code: 'UNKNOWN',
          command: '',
          stderr: '',
          exitCode: null,
          message: 'Main window not available'
        }
      }
    }
    try {
      const onOutput = (text: string): void => {
        if (mainWindow.isDestroyed()) return
        mainWindow.webContents.send('skills:install-output', text)
      }
      return {
        ok: true,
        data: await npxService.installStreaming(onOutput, opts.source, opts.agents, opts.global)
      }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  }
)
```

- [ ] **Step 2: Update preload script**

In `src/preload/index.ts`, replace the `install` and `installStreaming` entries:

```typescript
    install: (opts: { source: string; agents: string[]; global?: boolean }): Promise<unknown> =>
      ipcRenderer.invoke('skills:install', opts),
    installStreaming: (opts: {
      source: string
      agents: string[]
      global?: boolean
    }): Promise<unknown> => ipcRenderer.invoke('skills:install-streaming', opts),
```

- [ ] **Step 3: Update preload type declarations**

In `src/preload/index.d.ts`, replace the `install` and `installStreaming` types:

```typescript
install: (opts: { source: string; agents: string[]; global?: boolean }) =>
  Promise<IpcResult<CommandResult>>
installStreaming: (opts: { source: string; agents: string[]; global?: boolean }) =>
  Promise<IpcResult<CommandResult>>
```

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc/skills.ipc.ts src/preload/index.ts src/preload/index.d.ts
git commit -m "refactor(ipc): rename install parameter from packageRef to source

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Renderer Stores Update

**Files:**

- Modify: `src/renderer/src/stores/skills.ts:128-166`
- Modify: `src/renderer/src/stores/settings.ts:6-38`

- [ ] **Step 1: Update skills store**

In `src/renderer/src/stores/skills.ts`, replace `doInstall`, `install`, and `installStreaming`:

```typescript
async function doInstall(
  source: string,
  agents: string[],
  isGlobal: boolean,
  streaming: boolean
): Promise<CommandResult> {
  installing.value = true
  error.value = null
  try {
    const opts = { source, agents: [...agents], global: isGlobal }
    const result = streaming
      ? await window.api.skills.installStreaming(opts)
      : await window.api.skills.install(opts)
    const data = unwrapResult(result)
    installedCache.invalidate()
    return data
  } catch (e) {
    error.value = extractError(e)
    throw e
  } finally {
    installing.value = false
  }
}

async function install(
  source: string,
  agents: string[],
  isGlobal: boolean
): Promise<CommandResult> {
  return doInstall(source, agents, isGlobal, false)
}

async function installStreaming(
  source: string,
  agents: string[],
  isGlobal: boolean
): Promise<CommandResult> {
  return doInstall(source, agents, isGlobal, true)
}
```

- [ ] **Step 2: Update settings store**

Replace the entire `src/renderer/src/stores/settings.ts`:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCachedResource } from '../composables/useCachedResource'

export const useSettingsStore = defineStore('settings', () => {
  const settingsCache = useCachedResource(() => window.api.store.getSettings(), {
    defaultAgent: 'claude-code',
    autoCheckEnv: true,
    proxyUrl: ''
  })

  const defaultAgent = ref('claude-code')
  const autoCheckEnv = ref(true)
  const proxyUrl = ref('')
  const error = ref<string | null>(null)
  const fetching = computed(() => settingsCache.loading.value)
  const loading = fetching

  async function load(): Promise<void> {
    try {
      const data = await settingsCache.ensure()
      defaultAgent.value = data.defaultAgent
      autoCheckEnv.value = data.autoCheckEnv
      proxyUrl.value = data.proxyUrl || ''
      error.value = null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load settings'
    }
  }

  async function save(partial: {
    defaultAgent?: string
    autoCheckEnv?: boolean
    proxyUrl?: string
  }): Promise<void> {
    try {
      await window.api.store.setSettings(partial)
      settingsCache.invalidate()
      await load()
      error.value = null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to save settings'
      throw e
    }
  }

  return { defaultAgent, autoCheckEnv, proxyUrl, loading, fetching, error, load, save }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/stores/skills.ts src/renderer/src/stores/settings.ts
git commit -m "refactor(stores): update install params and add proxyUrl to settings store

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: SettingsView Proxy Selector

**Files:**

- Modify: `src/renderer/src/views/SettingsView.vue`

- [ ] **Step 1: Add imports and proxy options**

Replace the `<script setup>` section (keep all existing imports, add `NInput` and `NProgress`):

```typescript
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NCard,
  NForm,
  NFormItem,
  NSelect,
  NSwitch,
  NButton,
  NSpace,
  NIcon,
  NInput,
  NProgress,
  useMessage
} from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { useSettingsStore } from '../stores/settings'
import { useSkillsStore } from '../stores/skills'
import { useConfirm } from '../composables/useConfirm'
import { AGENTS } from '../constants/agents'

const settingsStore = useSettingsStore()
const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdateAll } = useConfirm()

const agentOptions = AGENTS.map((a) => ({ label: a.name, value: a.agentFlag }))

const CUSTOM_PROXY_VALUE = '__custom__'

const proxyOptions = [
  { label: '不使用代理', value: '' },
  { label: 'gh-proxy.org', value: 'https://gh-proxy.org' },
  { label: 'hk.gh-proxy.org', value: 'https://hk.gh-proxy.org' },
  { label: 'cdn.gh-proxy.org', value: 'https://cdn.gh-proxy.org' },
  { label: 'edgeone.gh-proxy.org', value: 'https://edgeone.gh-proxy.org' },
  { label: '自定义...', value: CUSTOM_PROXY_VALUE }
]

const selectedProxy = ref('')
const customProxyUrl = ref('')

onMounted(() => {
  settingsStore.load().then(() => {
    const stored = settingsStore.proxyUrl
    const preset = proxyOptions.find((o) => o.value === stored)
    if (preset && stored !== CUSTOM_PROXY_VALUE) {
      selectedProxy.value = stored
      customProxyUrl.value = ''
    } else if (stored && stored.startsWith('https://')) {
      selectedProxy.value = CUSTOM_PROXY_VALUE
      customProxyUrl.value = stored
    } else {
      selectedProxy.value = ''
      customProxyUrl.value = ''
    }
  })
})

const showCustomInput = computed(() => selectedProxy.value === CUSTOM_PROXY_VALUE)

const effectiveProxyUrl = computed(() => {
  if (selectedProxy.value === CUSTOM_PROXY_VALUE) {
    return customProxyUrl.value.trim()
  }
  return selectedProxy.value
})

async function handleSave(): Promise<void> {
  await settingsStore.save({
    defaultAgent: settingsStore.defaultAgent,
    autoCheckEnv: settingsStore.autoCheckEnv,
    proxyUrl: effectiveProxyUrl.value
  })
  message.success('设置已保存')
}

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
    } else {
      message.error('更新失败: ' + (result.stderr || '未知错误'))
    }
  } catch {
    message.error('更新失败')
  }
}
</script>
```

- [ ] **Step 2: Update template**

Replace the `<template>` section:

```vue
<template>
  <div class="settings-page">
    <NCard title="设置" class="settings-card">
      <NForm label-placement="left" label-width="140" class="settings-form">
        <NFormItem label="默认安装目标">
          <NSelect v-model:value="settingsStore.defaultAgent" :options="agentOptions" filterable />
        </NFormItem>
        <NFormItem label="启动时检查环境">
          <NSwitch v-model:value="settingsStore.autoCheckEnv" />
        </NFormItem>
        <NFormItem label="GitHub 代理">
          <NSelect v-model:value="selectedProxy" :options="proxyOptions" />
          <NInput
            v-if="showCustomInput"
            v-model:value="customProxyUrl"
            placeholder="https://your-proxy.com"
            style="margin-top: var(--space-sm)"
          />
        </NFormItem>
        <NFormItem label="技能管理">
          <NButton
            round
            :loading="skillsStore.updatingAll"
            :disabled="skillsStore.installedSkills.length === 0"
            @click="handleUpdateAll"
          >
            <template #icon>
              <NIcon :size="14"><RefreshOutline /></NIcon>
            </template>
            全部更新 ({{ skillsStore.installedSkills.length }})
          </NButton>
        </NFormItem>
      </NForm>
      <NSpace justify="end" style="margin-top: var(--space-lg)">
        <NButton type="primary" round @click="handleSave">保存</NButton>
      </NSpace>
    </NCard>
  </div>
</template>
```

Keep the existing `<style scoped>` section unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/views/SettingsView.vue
git commit -m "feat(settings): add GitHub proxy selector with presets and custom input

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: SkillInstallDialog Progress Indicator

**Files:**

- Modify: `src/renderer/src/components/skills/SkillInstallDialog.vue`

- [ ] **Step 1: Replace entire file**

```vue
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import {
  NModal,
  NCard,
  NSteps,
  NStep,
  NCheckbox,
  NButton,
  NInput,
  NSpace,
  NText,
  NTag,
  NIcon,
  NProgress,
  NScrollbar,
  useMessage
} from 'naive-ui'
import { DownloadOutline, CloseOutline, CheckmarkCircle, CloseCircle } from '@vicons/ionicons5'
import { AGENTS, getCommonAgents } from '../../constants/agents'
import { useSkillsStore } from '../../stores/skills'

const props = defineProps<{ show: boolean; source: string }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'complete'): void
}>()
const skillsStore = useSkillsStore()
const message = useMessage()

const currentStep = ref(1)
const isGlobal = ref(false)
const selectedAgents = ref<string[]>([])
const filterText = ref('')
const installing = ref(false)
const installStatus = ref<'idle' | 'installing' | 'success' | 'failed'>('idle')
const commandOutput = ref('')

const commonAgents = getCommonAgents()

const filteredAgents = computed(() => {
  const text = filterText.value.toLowerCase()
  if (!text) return AGENTS
  return AGENTS.filter(
    (a) => a.name.toLowerCase().includes(text) || a.agentFlag.toLowerCase().includes(text)
  )
})

const allFilteredSelected = computed(
  () =>
    filteredAgents.value.length > 0 &&
    filteredAgents.value.every((a) => selectedAgents.value.includes(a.agentFlag))
)

function toggleCommonAgent(agentFlag: string): void {
  if (isGlobal.value) return
  const idx = selectedAgents.value.indexOf(agentFlag)
  if (idx >= 0) {
    selectedAgents.value.splice(idx, 1)
  } else {
    selectedAgents.value.push(agentFlag)
  }
}

function toggleSelectAll(): void {
  const flags = filteredAgents.value.map((a) => a.agentFlag)
  if (allFilteredSelected.value) {
    selectedAgents.value = selectedAgents.value.filter((s) => !flags.includes(s))
  } else {
    selectedAgents.value = [...new Set([...selectedAgents.value, ...flags])]
  }
}

function toggleGlobal(val: boolean): void {
  isGlobal.value = val
  if (val) selectedAgents.value = []
}

const canGoNext = computed(() => {
  if (isGlobal.value) return true
  return selectedAgents.value.length > 0
})

function goNext(): void {
  if (!canGoNext.value) {
    message.warning('请选择至少一个安装目标')
    return
  }
  currentStep.value = 2
}

function goBack(): void {
  if (installing.value) return
  currentStep.value = 1
}

let removeOutputListener: (() => void) | null = null

async function handleInstall(): Promise<void> {
  installing.value = true
  installStatus.value = 'installing'
  commandOutput.value = ''

  removeOutputListener = window.api.skills.onInstallOutput((text) => {
    commandOutput.value += text
  })

  try {
    const result = await skillsStore.installStreaming(
      props.source,
      selectedAgents.value,
      isGlobal.value
    )
    if (result.success) {
      installStatus.value = 'success'
      setTimeout(() => {
        emit('update:show', false)
        emit('complete')
      }, 1500)
    } else {
      installStatus.value = 'failed'
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    commandOutput.value += errMsg
    installStatus.value = 'failed'
    message.error('安装失败: ' + errMsg)
  } finally {
    installing.value = false
    if (removeOutputListener) {
      removeOutputListener()
      removeOutputListener = null
    }
  }
}

async function handleCancelInstall(): Promise<void> {
  await window.api.skills.cancelInstall()
  commandOutput.value += '\n安装已取消'
  installStatus.value = 'failed'
  installing.value = false
  if (removeOutputListener) {
    removeOutputListener()
    removeOutputListener = null
  }
}

function handleClose(): void {
  if (installing.value) return
  emit('update:show', false)
  if (installStatus.value === 'success') emit('complete')
}

function handleRetry(): void {
  installStatus.value = 'idle'
  commandOutput.value = ''
}

function resetState(): void {
  currentStep.value = 1
  isGlobal.value = false
  selectedAgents.value = []
  filterText.value = ''
  installing.value = false
  installStatus.value = 'idle'
  commandOutput.value = ''
}

onUnmounted(() => {
  if (removeOutputListener) {
    removeOutputListener()
    removeOutputListener = null
  }
})

const failedLogLines = computed(() => {
  if (!commandOutput.value) return []
  return commandOutput.value.split('\n').slice(-30)
})
</script>

<template>
  <NModal
    :show="show"
    :mask-closable="!installing"
    :on-after-leave="resetState"
    @update:show="handleClose"
  >
    <NCard title="安装技能" style="width: 620px">
      <NText
        >安装: <strong>{{ source }}</strong></NText
      >

      <NSteps :current="currentStep" style="margin-top: var(--space-md)" size="small">
        <NStep title="选择目标" />
        <NStep title="确认安装" />
      </NSteps>

      <div v-if="currentStep === 1" style="margin-top: var(--space-md)">
        <NCheckbox :checked="isGlobal" @update:checked="toggleGlobal">
          全局安装（不指定 agent）
        </NCheckbox>

        <div v-if="!isGlobal" class="agent-section">
          <NText depth="3" class="section-label">常用 Agent</NText>
          <NSpace :size="8" :wrap="true" class="common-agents">
            <NButton
              v-for="agent in commonAgents"
              :key="agent.agentFlag"
              :type="selectedAgents.includes(agent.agentFlag) ? 'primary' : 'default'"
              size="small"
              round
              @click="toggleCommonAgent(agent.agentFlag)"
            >
              {{ agent.name }}
            </NButton>
          </NSpace>

          <NText depth="3" class="section-label">筛选 Agent</NText>
          <NInput
            v-model:value="filterText"
            placeholder="搜索 agent..."
            clearable
            size="small"
            class="filter-input"
          />

          <NCheckbox
            :checked="allFilteredSelected"
            :indeterminate="
              selectedAgents.some((s) => filteredAgents.some((a) => a.agentFlag === s)) &&
              !allFilteredSelected
            "
            class="select-all-checkbox"
            @update:checked="toggleSelectAll"
          >
            全选当前筛选
          </NCheckbox>
          <div class="agent-list-scroll">
            <NSpace vertical :size="4">
              <NCheckbox
                v-for="agent in filteredAgents"
                :key="agent.agentFlag"
                :checked="selectedAgents.includes(agent.agentFlag)"
                @update:checked="() => toggleCommonAgent(agent.agentFlag)"
              >
                {{ agent.name }}
              </NCheckbox>
            </NSpace>
          </div>

          <NText depth="3" class="selected-count">
            已选: {{ selectedAgents.length }} 个 agent
          </NText>
        </div>
      </div>

      <div v-if="currentStep === 2" style="margin-top: var(--space-md)">
        <div class="confirm-row">
          <NText depth="3">安装模式: </NText>
          <NText>{{ isGlobal ? '全局安装' : '指定 Agent' }}</NText>
        </div>
        <div v-if="!isGlobal && selectedAgents.length > 0" class="confirm-row">
          <NText depth="3">选中 Agent: </NText>
          <NSpace :size="4" :wrap="true" inline style="display: inline-flex">
            <NTag v-for="flag in selectedAgents" :key="flag" size="small" round type="info">
              {{ AGENTS.find((a) => a.agentFlag === flag)?.name || flag }}
            </NTag>
          </NSpace>
        </div>

        <!-- Installing state -->
        <div v-if="installStatus === 'installing'" class="install-progress">
          <NProgress type="line" :percentage="100" :show-indicator="false" status="processing" />
          <NText>正在安装中，请稍候...</NText>
        </div>

        <!-- Success state -->
        <div v-else-if="installStatus === 'success'" class="install-result install-result--success">
          <NIcon :size="48" color="#18a058"><CheckmarkCircle /></NIcon>
          <NText type="success">安装成功</NText>
        </div>

        <!-- Failed state -->
        <div v-else-if="installStatus === 'failed'" class="install-result install-result--failed">
          <NIcon :size="48" color="#d03050"><CloseCircle /></NIcon>
          <NText type="error">安装失败</NText>
          <div v-if="commandOutput" class="failed-log">
            <NScrollbar style="max-height: 200px">
              <pre class="terminal-content">{{ failedLogLines.join('\n') }}</pre>
            </NScrollbar>
          </div>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton v-if="currentStep === 1" @click="handleClose">取消</NButton>
          <NButton
            v-if="currentStep === 2 && installStatus === 'idle'"
            :disabled="installing"
            @click="goBack"
          >
            上一步
          </NButton>
          <NButton v-if="currentStep === 1" type="primary" :disabled="!canGoNext" @click="goNext">
            下一步
          </NButton>
          <NButton
            v-if="currentStep === 2 && installStatus === 'idle' && !installing"
            type="primary"
            @click="handleInstall"
          >
            <template #icon>
              <NIcon :size="16"><DownloadOutline /></NIcon>
            </template>
            确认安装
          </NButton>
          <NButton
            v-if="installStatus === 'installing'"
            type="warning"
            @click="handleCancelInstall"
          >
            <template #icon>
              <NIcon :size="16"><CloseOutline /></NIcon>
            </template>
            取消安装
          </NButton>
          <NButton v-if="installStatus === 'failed'" type="primary" @click="handleRetry">
            重试
          </NButton>
          <NButton
            v-if="installStatus === 'failed' || installStatus === 'success'"
            @click="handleClose"
          >
            关闭
          </NButton>
        </NSpace>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.agent-section {
  margin-top: var(--space-md);
}

.section-label {
  font-size: 13px;
  margin-bottom: var(--space-sm);
  display: block;
  color: var(--color-muted);
}

.common-agents {
  margin-bottom: var(--space-md);
}

.filter-input {
  margin-bottom: var(--space-sm);
}

.select-all-checkbox {
  margin-bottom: var(--space-sm);
}

.agent-list-scroll {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  background: var(--color-surface);
}

.selected-count {
  font-size: 12px;
  margin-top: var(--space-sm);
  display: block;
  color: var(--color-muted);
}

.confirm-row {
  margin-bottom: var(--space-md);
}

.install-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) 0;
}

.install-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) 0;
}

.install-result--success {
  color: #18a058;
}

.install-result--failed {
  color: #d03050;
}

.failed-log {
  width: 100%;
  margin-top: var(--space-md);
  background: #1e1e1e;
  border-radius: var(--radius-md);
  padding: var(--space-xs);
}

.terminal-content {
  color: #d4d4d4;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  padding: var(--space-sm) var(--space-md);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/skills/SkillInstallDialog.vue
git commit -m "feat(install): replace terminal output with progress indicator

- Add indeterminate progress bar with 'installing' status
- Show success/failed states with icons
- Failed state displays last 30 lines of raw output
- Prop renamed from packageRef to source

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Update Caller Sites

**Files:**

- Modify: `src/renderer/src/components/skills/SearchResultCard.vue:8-10`
- Modify: `src/renderer/src/views/SkillsSearch.vue:11-22,62-66`
- Modify: `src/renderer/src/views/SkillDetail.vue:17,56-60,108-112`

- [ ] **Step 1: Update SearchResultCard**

In `src/renderer/src/components/skills/SearchResultCard.vue`, change the emit and click handler:

```typescript
const props = defineProps<{ result: SkillSearchResult }>()
const emit = defineEmits<{ install: [source: string] }>()
```

```vue
        <NButton size="small" round @click="emit('install', result.source)">
```

Remove the unused `toPackageRef` and `packageRef` declarations (lines 5 and 10).

- [ ] **Step 2: Update SkillsSearch**

In `src/renderer/src/views/SkillsSearch.vue`:

```typescript
const selectedSource = ref('')

function handleInstall(source: string): void {
  selectedSource.value = source
  showInstallDialog.value = true
}

function handleInstallComplete(): void {
  showInstallDialog.value = false
  selectedSource.value = ''
}
```

```vue
<SkillInstallDialog
  v-model:show="showInstallDialog"
  :source="selectedSource"
  @complete="handleInstallComplete"
/>
```

- [ ] **Step 3: Update SkillDetail**

In `src/renderer/src/views/SkillDetail.vue`:

```typescript
import { computed } from 'vue'

const packageRef = decodeURIComponent(route.params.packageRef as string)
const source = computed(() => packageRef.replace('@', '/'))
```

Update the dialog prop:

```vue
<SkillInstallDialog
  v-model:show="showInstallDialog"
  :source="source"
  @complete="operationOutput = ''"
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/skills/SearchResultCard.vue src/renderer/src/views/SkillsSearch.vue src/renderer/src/views/SkillDetail.vue
git commit -m "refactor(ui): pass source instead of packageRef to install dialog

- SearchResultCard emits result.source directly
- SkillsSearch tracks selectedSource
- SkillDetail computes source from packageRef

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**

- [x] 代理设置数据模型 (`AppSettings.proxyUrl`) → Task 1
- [x] 代理设置 UI (SettingsView.vue 选择器) → Task 5
- [x] 安装进度指示器 (indeterminate progress + states) → Task 6
- [x] URL 构造逻辑 (`buildGitUrl` + `buildInstallArgs`) → Task 2
- [x] 参数链路改造 (`packageRef` → `source`) → Tasks 2, 3, 4, 7
- [x] 边界情况处理 (自定义代理输入、失败日志展示) → Tasks 5, 6

**2. Placeholder scan:**

- [x] 无 TBD/TODO
- [x] 无 "add appropriate error handling" 类模糊描述
- [x] 每个代码步骤包含完整代码

**3. Type consistency:**

- [x] `source: string` 在 NpxService、IPC、preload、skills store、SkillInstallDialog 中一致
- [x] `proxyUrl?: string` 在 types、StoreService、settings store、SettingsView 中一致
- [x] `AppSettings` 扩展在所有引用处一致

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-05-11-install-proxy-settings.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review

Which approach do you prefer?
