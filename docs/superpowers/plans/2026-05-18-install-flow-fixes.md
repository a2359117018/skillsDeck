# Install Flow Fixes Implementation Plan

> **Status:** ✅ Completed (2026-05-18) — all tasks implemented, typecheck/lint pass, code reviewed, pushed to origin/main.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix navigation guards, temp folder cleanup, and layout issues in GitHub link and archive skill installation flows by extracting shared logic into a composable.

**Architecture:** Create a `useSkillInstall` composable that manages skill selection, agent selection, install execution, and temp dir lifecycle. Both `GitHubInstaller` and `ArchiveInstaller` use it but keep independent templates. Navigation guard lives in the parent `SkillsSearch.vue` and reads `hasContent` from child components via `defineExpose`.

**Tech Stack:** Vue 3 composables, NaiveUI dialog, Electron IPC

**Design spec:** `docs/superpowers/specs/2026-05-18-install-flow-fixes-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/renderer/src/composables/useSkillInstall.ts` | Shared install state + logic |
| Modify | `src/shared/types.ts` | Add `ArchiveScanResult` type |
| Modify | `src/main/services/ArchiveSkillInstaller.ts` | Return `ArchiveScanResult` (includes tempDir) |
| Modify | `src/main/ipc/skills.ipc.ts` | Remove auto-cleanup from `skills:install-local`; update `skills:extract-archive` return type |
| Modify | `src/preload/index.ts` | Update `extractArchive` return type |
| Modify | `src/preload/index.d.ts` | Update `extractArchive` type declaration |
| Modify | `src/renderer/src/components/skills/LocalInstallPanel.vue` | Convert to controlled component (props/emits, no internal state) |
| Modify | `src/renderer/src/components/skills/GitHubInstaller.vue` | Use composable, add `defineExpose` |
| Modify | `src/renderer/src/components/skills/ArchiveInstaller.vue` | Use composable, add `defineExpose` |
| Modify | `src/renderer/src/views/SkillsSearch.vue` | Add `onBeforeRouteLeave` guard |

---

### Task 1: Backend — ArchiveSkillInstaller returns tempDir + remove auto-cleanup

**Files:**
- Modify: `src/shared/types.ts` (add `ArchiveScanResult`)
- Modify: `src/main/services/ArchiveSkillInstaller.ts` (return `ArchiveScanResult`)
- Modify: `src/main/ipc/skills.ipc.ts` (update handler, remove auto-cleanup)

- [x] **Step 1: Add `ArchiveScanResult` type to shared/types.ts**

Append after the `GitHubParseResult` interface (line 118):

```typescript
export interface ArchiveScanResult {
  skills: ScannedSkill[]
  tempDir: string
}
```

- [x] **Step 2: Update `ArchiveSkillInstaller.extractAndScan` return type**

File: `src/main/services/ArchiveSkillInstaller.ts`

Change the method signature from returning `Promise<ScannedSkill[]>` to `Promise<ArchiveScanResult>`, and change the return statement. Import `ArchiveScanResult` from types:

```typescript
import type { ScannedSkill, ArchiveScanResult } from '../../shared/types'
```

Change the method:

```typescript
async extractAndScan(filePath: string): Promise<ArchiveScanResult> {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'skills-archive-'))
  const resolvedTemp = path.resolve(tempDir)
  try {
    const files = await decompress(filePath, tempDir)
    for (const f of files) {
      if (!path.resolve(tempDir, f.path).startsWith(resolvedTemp + path.sep)) {
        throw new Error('Archive contains entries outside the target directory')
      }
    }
    const skills = await localSkillInstaller.scanSkills(tempDir)
    return { skills, tempDir }
  } catch (e) {
    await localSkillInstaller.cleanupTempDir(tempDir)
    throw e
  }
}
```

- [x] **Step 3: Update `skills:extract-archive` IPC handler**

File: `src/main/ipc/skills.ipc.ts`

The handler at line 198 returns `ScannedSkill[]` from `archiveSkillInstaller.extractAndScan`. It now returns `ArchiveScanResult`. No code change needed in the handler body — it already does `return { ok: true, data: skills }` where `skills` is the result of `extractAndScan`. Just rename the local variable to `result`:

```typescript
ipcMain.handle('skills:extract-archive', async (_, filePath: string) => {
  try {
    const validation = archiveSkillInstaller.validate(filePath)
    if (!validation.valid) {
      return {
        ok: false,
        error: {
          code: 'UNKNOWN' as const,
          command: '',
          stderr: '',
          exitCode: null,
          message: validation.error
        }
      }
    }
    const result = await archiveSkillInstaller.extractAndScan(filePath)
    return { ok: true, data: result }
  } catch (e) {
    return { ok: false, error: serializeError(e) }
  }
})
```

- [x] **Step 4: Remove auto-cleanup from `skills:install-local` IPC handler**

File: `src/main/ipc/skills.ipc.ts`

Replace the `skills:install-local` handler (lines 220-244). Remove the entire block that extracts tempRoots and calls cleanupTempDir:

```typescript
ipcMain.handle(
  'skills:install-local',
  async (_, opts: { skillDirs: string[]; agents: string[] }) => {
    try {
      const result = await localSkillInstaller.installSkills(opts.skillDirs, opts.agents)
      return { ok: true, data: result }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  }
)
```

After this change, the `os` and `path` imports at the top of the file may become unused. Remove `import os from 'os'` if no other handler uses it (check: `os.tmpdir()` is no longer referenced in this file after removing the auto-cleanup). Keep `import path from 'path'` — it's used in `skills:parse-github` error handler.

- [x] **Step 5: Update preload types**

File: `src/preload/index.ts`

Import `ArchiveScanResult`:

```typescript
import type {
  ScannedSkill,
  LocalInstallResult,
  CommandErrorInfo,
  GitHubParseResult,
  ArchiveScanResult
} from '../shared/types'
```

Change `extractArchive` return type:

```typescript
extractArchive: (filePath: string): Promise<IpcResult<ArchiveScanResult>> =>
  ipcRenderer.invoke('skills:extract-archive', filePath),
```

File: `src/preload/index.d.ts`

Import `ArchiveScanResult`:

```typescript
import type {
  EnvStatus,
  AppSettings,
  CommandResult,
  SkillSearchResponse,
  CommandErrorInfo,
  InstalledSkill,
  AgentScanResult,
  BackgroundTask,
  ScannedSkill,
  LocalInstallResult,
  GitHubParseResult,
  ArchiveScanResult
} from '../shared/types'
```

Change the `extractArchive` type in `AppApi`:

```typescript
extractArchive: (filePath: string) => Promise<IpcResult<ArchiveScanResult>>
```

- [x] **Step 6: Commit backend changes**

```bash
git add src/shared/types.ts src/main/services/ArchiveSkillInstaller.ts src/main/ipc/skills.ipc.ts src/preload/index.ts src/preload/index.d.ts
git commit -m "fix: archive installer returns tempDir, remove auto-cleanup from install-local"
```

---

### Task 2: Frontend — Create `useSkillInstall` composable

**Files:**
- Create: `src/renderer/src/composables/useSkillInstall.ts`

- [x] **Step 1: Write the composable**

```typescript
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import type { ScannedSkill, LocalInstallResult } from '../../../shared/types'

/** 技能安装流程共享逻辑 composable */
export function useSkillInstall() {
  const selectedSkills = ref<string[]>([])
  const selectedAgents = ref<string[]>([])
  const isGlobal = ref(true)
  const installing = ref(false)
  const installResult = ref<LocalInstallResult | null>(null)
  const tempDir = ref('')

  const hasContent = computed(() => tempDir.value !== '' || selectedSkills.value.length > 0)

  const canInstall = computed(() => {
    if (selectedSkills.value.length === 0) return false
    if (isGlobal.value) return true
    return selectedAgents.value.length > 0
  })

  const message = useMessage()

  /** 设置扫描到的技能列表，默认全选 */
  function setSkills(skills: ScannedSkill[]): void {
    selectedSkills.value = skills.map((s) => s.path)
    selectedAgents.value = []
    isGlobal.value = true
    installing.value = false
    installResult.value = null
  }

  /** 记录临时目录路径 */
  function setTempDir(dir: string): void {
    tempDir.value = dir
  }

  /** 执行安装（不清理临时目录） */
  async function install(): Promise<LocalInstallResult | null> {
    if (!canInstall.value) {
      message.warning('请选择要安装的技能和目标 agent')
      return null
    }
    installing.value = true
    installResult.value = null
    try {
      const result = await window.api.skills.installLocal({
        skillDirs: [...selectedSkills.value],
        agents: isGlobal.value ? [] : [...selectedAgents.value]
      })
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      installResult.value = result.data
      if (result.data.failed.length > 0) {
        message.error(
          `安装完成：${result.data.success.length} 个成功，${result.data.failed.length} 个失败`
        )
      } else {
        message.success(`成功安装 ${result.data.success.length} 个技能`)
      }
      return result.data
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      message.error('安装失败: ' + msg)
      return null
    } finally {
      installing.value = false
    }
  }

  /** 清理临时目录 */
  async function cleanup(): Promise<void> {
    if (tempDir.value) {
      try {
        await window.api.skills.cleanupTemp([tempDir.value])
      } catch {
        // ignore cleanup errors
      }
      tempDir.value = ''
    }
  }

  /** 清除安装结果 */
  function resetResult(): void {
    installResult.value = null
  }

  return {
    selectedSkills,
    selectedAgents,
    isGlobal,
    installing,
    installResult,
    tempDir,
    hasContent,
    canInstall,
    setSkills,
    setTempDir,
    install,
    cleanup,
    resetResult
  }
}
```

- [x] **Step 2: Commit composable**

```bash
git add src/renderer/src/composables/useSkillInstall.ts
git commit -m "feat: add useSkillInstall composable for shared install logic"
```

---

### Task 3: Frontend — Refactor `LocalInstallPanel` to controlled component

**Files:**
- Modify: `src/renderer/src/components/skills/LocalInstallPanel.vue`

This component currently manages its own state. Refactor it to accept state from the parent (composable) via props and emit events. Also fix the layout: flex column with scrollable content area and fixed bottom button.

- [x] **Step 1: Rewrite LocalInstallPanel.vue**

```vue
<script setup lang="ts">
import { NButton, NText, NSpin } from 'naive-ui'
import type { ScannedSkill, LocalInstallResult } from '../../../../shared/types'
import SkillScanResult from './SkillScanResult.vue'
import AgentSelector from './AgentSelector.vue'

const props = defineProps<{
  skills: ScannedSkill[]
  selectedSkills: string[]
  selectedAgents: string[]
  isGlobal: boolean
  installing: boolean
  installResult: LocalInstallResult | null
  canInstall: boolean
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  'update:selectedSkills': [value: string[]]
  'update:selectedAgents': [value: string[]]
  'update:isGlobal': [value: boolean]
  install: []
}>()
</script>

<template>
  <div class="local-install-panel">
    <div v-if="loading" class="panel-loading">
      <NSpin size="large" />
      <NText depth="3">正在处理...</NText>
    </div>

    <div v-else-if="error" class="panel-error">
      <NText type="error">{{ error }}</NText>
    </div>

    <div v-else-if="skills.length > 0" class="panel-content">
      <div class="panel-grid">
        <div class="panel-section">
          <NText depth="3" class="section-title">扫描到的技能</NText>
          <SkillScanResult
            :skills="skills"
            :model-value="selectedSkills"
            @update:model-value="emit('update:selectedSkills', $event)"
          />
        </div>

        <div class="panel-section">
          <NText depth="3" class="section-title">安装目标</NText>
          <AgentSelector
            :model-value="selectedAgents"
            :is-global="isGlobal"
            @update:model-value="emit('update:selectedAgents', $event)"
            @update:is-global="emit('update:isGlobal', $event)"
          />
        </div>
      </div>

      <div class="panel-actions">
        <NButton
          type="primary"
          :disabled="!canInstall || installing"
          :loading="installing"
          @click="emit('install')"
        >
          安装选中技能
        </NButton>
      </div>

      <div v-if="installResult" class="install-result">
        <NText v-if="installResult.success.length > 0" type="success">
          成功: {{ installResult.success.join(', ') }}
        </NText>
        <div v-if="installResult.failed.length > 0">
          <NText type="error">失败:</NText>
          <div v-for="f in installResult.failed" :key="f.name" class="fail-item">
            <NText type="error">{{ f.name }}: {{ f.error }}</NText>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.local-install-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.panel-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) 0;
}

.panel-error {
  padding: var(--space-md);
  background: var(--color-error-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-error);
}

.panel-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: var(--space-lg);
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  flex: 1;
  min-height: 0;
}

.panel-section {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-hairline);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: var(--space-sm);
  display: block;
  flex-shrink: 0;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.install-result {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-hairline);
  flex-shrink: 0;
}

.fail-item {
  margin-top: var(--space-xs);
}
</style>
```

- [x] **Step 2: Commit LocalInstallPanel refactor**

```bash
git add src/renderer/src/components/skills/LocalInstallPanel.vue
git commit -m "refactor: LocalInstallPanel as controlled component with fixed layout"
```

---

### Task 4: Frontend — Refactor `GitHubInstaller` to use composable

**Files:**
- Modify: `src/renderer/src/components/skills/GitHubInstaller.vue`

- [x] **Step 1: Rewrite GitHubInstaller.vue**

```vue
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import {
  NInput,
  NButton,
  NProgress,
  NText,
  NAlert,
  NCheckbox,
  NSpace,
  NSpin
} from 'naive-ui'
import type { GitHubParseResult } from '../../../../shared/types'
import AgentSelector from './AgentSelector.vue'
import { useSkillInstall } from '@renderer/composables/useSkillInstall'

const emit = defineEmits<{
  installComplete: []
}>()

const {
  selectedSkills,
  selectedAgents,
  isGlobal,
  installing,
  installResult,
  tempDir,
  hasContent,
  canInstall,
  setSkills,
  setTempDir,
  install,
  cleanup,
  resetResult
} = useSkillInstall()

const url = ref('')
const parsing = ref(false)
const downloadProgress = ref(0)
const showProgress = ref(false)
const scanResult = ref<GitHubParseResult | null>(null)
const alertError = ref<string | null>(null)

let removeProgressListener: (() => void) | null = null

const skills = computed(() => scanResult.value?.skills ?? [])

const allSkillsSelected = computed(
  () => skills.value.length > 0 && skills.value.every((s) => selectedSkills.value.includes(s.path))
)

const someSkillsSelected = computed(
  () =>
    skills.value.some((s) => selectedSkills.value.includes(s.path)) && !allSkillsSelected.value
)

function clearAlert(): void {
  alertError.value = null
}

function closeInstallResult(): void {
  resetResult()
}

function toggleAllSkills(): void {
  if (allSkillsSelected.value) {
    selectedSkills.value = []
  } else {
    selectedSkills.value = skills.value.map((s) => s.path)
  }
}

function toggleSkill(path: string): void {
  const current = [...selectedSkills.value]
  const idx = current.indexOf(path)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(path)
  }
  selectedSkills.value = current
}

async function handleParse(): Promise<void> {
  if (!url.value.trim()) {
    return
  }

  // 清理旧的临时目录
  await cleanup()

  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  parsing.value = true
  clearAlert()
  downloadProgress.value = 0
  showProgress.value = true
  resetResult()

  removeProgressListener = window.api.skills.onGitHubDownloadProgress((percent) => {
    downloadProgress.value = percent
  })

  try {
    const result = await window.api.skills.parseGitHub(url.value.trim())
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    scanResult.value = result.data
    setSkills(result.data.skills)
    setTempDir(result.data.tempDir)
    if (result.data.skills.length === 0) {
      alertError.value = '未在仓库中扫描到技能文件'
    }
  } catch (e) {
    alertError.value = e instanceof Error ? e.message : String(e)
  } finally {
    parsing.value = false
    showProgress.value = false
    if (removeProgressListener) {
      removeProgressListener()
      removeProgressListener = null
    }
  }
}

function handleCancel(): void {
  window.api.skills.cancelGitHubDownload()
  parsing.value = false
  showProgress.value = false
}

async function handleInstall(): Promise<void> {
  const result = await install()
  if (result) {
    emit('installComplete')
  }
}

defineExpose({ hasContent, cleanup })

onUnmounted(() => {
  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  cleanup()
})
</script>

<template>
  <div class="github-installer">
    <div class="url-input-row">
      <NInput
        v-model:value="url"
        placeholder="粘贴 GitHub 仓库链接，例如 https://github.com/owner/repo"
        clearable
        :disabled="parsing"
        @keyup.enter="handleParse"
      />
      <NButton
        type="primary"
        :disabled="parsing || !url.trim()"
        :loading="parsing && !showProgress"
        @click="handleParse"
      >
        解析
      </NButton>
      <NButton v-if="parsing && showProgress" @click="handleCancel"> 取消 </NButton>
    </div>

    <NAlert v-if="alertError" type="error" closable class="error-alert" @close="clearAlert">
      {{ alertError }}
    </NAlert>

    <div v-if="showProgress" class="progress-section">
      <NText depth="3">正在下载...</NText>
      <NProgress
        type="line"
        :percentage="downloadProgress"
        :show-indicator="true"
        :height="8"
        status="default"
      />
    </div>

    <div v-else-if="parsing" class="panel-loading">
      <NSpin size="large" />
      <NText depth="3">正在处理...</NText>
    </div>

    <div v-else-if="skills.length > 0" class="split-layout">
      <div class="split-left">
        <div class="section-card">
          <NText depth="3" class="section-title">扫描到的技能</NText>
          <div class="scan-header">
            <NCheckbox
              :checked="allSkillsSelected"
              :indeterminate="someSkillsSelected"
              @update:checked="toggleAllSkills"
            >
              全选 ({{ selectedSkills.length }} / {{ skills.length }})
            </NCheckbox>
          </div>
          <div class="scan-list">
            <NSpace vertical :size="8">
              <div v-for="skill in skills" :key="skill.path" class="scan-item">
                <NCheckbox
                  :checked="selectedSkills.includes(skill.path)"
                  @update:checked="() => toggleSkill(skill.path)"
                >
                  <div class="skill-info">
                    <NText strong>{{ skill.name }}</NText>
                    <NText depth="3" class="skill-path">{{ skill.relativePath }}</NText>
                  </div>
                </NCheckbox>
              </div>
            </NSpace>
          </div>
        </div>
      </div>

      <div class="split-right">
        <div class="section-card">
          <NText depth="3" class="section-title">安装目标</NText>
          <AgentSelector v-model:model-value="selectedAgents" v-model:is-global="isGlobal" />
          <div class="install-actions">
            <NButton
              type="primary"
              :disabled="!canInstall || installing"
              :loading="installing"
              @click="handleInstall"
            >
              安装选中技能
            </NButton>
          </div>
        </div>
      </div>
    </div>

    <!-- 安装结果浮动面板 -->
    <div v-if="installResult" class="result-overlay" @click="closeInstallResult">
      <div class="result-toast" @click.stop>
        <div class="result-header">
          <NText strong>安装结果</NText>
          <NButton text size="tiny" @click="closeInstallResult">关闭</NButton>
        </div>
        <div class="result-body">
          <div v-if="installResult.success.length > 0" class="result-success">
            <NText type="success">成功 ({{ installResult.success.length }}):</NText>
            <div class="result-list">{{ installResult.success.join(', ') }}</div>
          </div>
          <div v-if="installResult.failed.length > 0" class="result-fail">
            <NText type="error">失败 ({{ installResult.failed.length }}):</NText>
            <div v-for="f in installResult.failed" :key="f.name" class="fail-item">
              <NText type="error">{{ f.name }}: {{ f.error }}</NText>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.github-installer {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.url-input-row {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.url-input-row .n-input {
  flex: 1;
}

.error-alert {
  border-radius: var(--radius-md);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.panel-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) 0;
}

.split-layout {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: var(--space-lg);
  align-items: stretch;
}

.split-left,
.split-right {
  display: flex;
  flex-direction: column;
}

.section-card {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-hairline);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: var(--space-sm);
  display: block;
}

.scan-header {
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-hairline);
}

.scan-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.scan-item {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.skill-info {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
}

.skill-path {
  font-size: 12px;
}

.install-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-md);
}

.result-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  z-index: 2000;
}

.result-toast {
  min-width: 360px;
  max-width: 480px;
  max-height: 500px;
  overflow-y: auto;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-hairline);
}

.result-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.result-success .result-list {
  margin-top: var(--space-xs);
  font-size: 13px;
  color: var(--color-success);
}

.result-fail {
  margin-top: var(--space-xs);
}

.fail-item {
  margin-top: var(--space-xs);
  font-size: 13px;
}
</style>
```

- [x] **Step 2: Commit GitHubInstaller refactor**

```bash
git add src/renderer/src/components/skills/GitHubInstaller.vue
git commit -m "refactor: GitHubInstaller uses useSkillInstall composable"
```

---

### Task 5: Frontend — Refactor `ArchiveInstaller` to use composable

**Files:**
- Modify: `src/renderer/src/components/skills/ArchiveInstaller.vue`

- [x] **Step 1: Rewrite ArchiveInstaller.vue**

```vue
<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { NText, NIcon, useMessage } from 'naive-ui'
import { ArchiveOutline } from '@vicons/ionicons5'
import LocalInstallPanel from './LocalInstallPanel.vue'
import { useSkillInstall } from '@renderer/composables/useSkillInstall'

const emit = defineEmits<{
  installComplete: []
}>()

const message = useMessage()

const {
  selectedSkills,
  selectedAgents,
  isGlobal,
  installing,
  installResult,
  hasContent,
  canInstall,
  setSkills,
  setTempDir,
  install,
  cleanup
} = useSkillInstall()

const selectedFile = ref('')
const extracting = ref(false)
const scannedSkills = ref<import('../../../../shared/types').ScannedSkill[]>([])
const error = ref<string | null>(null)
const isDragging = ref(false)

const DRAG_ACTIVE_COLOR = 'var(--color-brand-blue)'
const DRAG_DEFAULT_COLOR = 'var(--color-muted)'

function handleDragEnter(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

function handleDragLeave(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  const dropZone = e.currentTarget as HTMLElement
  const related = e.relatedTarget as Node | null
  if (related && dropZone.contains(related)) return
  isDragging.value = false
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
}

async function handleDrop(e: DragEvent): Promise<void> {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false

  const file = e.dataTransfer?.files[0]
  if (!file) return

  const filePath = window.api.getPathForFile(file)

  const supportedExt = ['.zip', '.tar.gz', '.tgz']
  if (!supportedExt.some((ext) => filePath.endsWith(ext))) {
    message.error('不支持的文件格式，仅支持 .zip .tar.gz .tgz')
    return
  }

  selectedFile.value = filePath
  await extractArchive()
}

async function handleClickSelect(): Promise<void> {
  try {
    const result = await window.api.skills.selectArchive()
    if (!result.ok) {
      if (result.error.message === '未选择文件') return
      throw new Error(result.error.message)
    }
    selectedFile.value = result.data
    await extractArchive()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    message.error('选择文件失败: ' + error.value)
  }
}

async function extractArchive(): Promise<void> {
  if (!selectedFile.value) return

  // 清理旧的临时目录
  await cleanup()

  extracting.value = true
  error.value = null
  scannedSkills.value = []
  try {
    const result = await window.api.skills.extractArchive(selectedFile.value)
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    scannedSkills.value = result.data.skills
    setSkills(result.data.skills)
    setTempDir(result.data.tempDir)
    if (result.data.skills.length === 0) {
      message.info('未在压缩包中扫描到技能文件')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    message.error('解压扫描失败: ' + error.value)
  } finally {
    extracting.value = false
  }
}

async function handleInstall(): Promise<void> {
  const result = await install()
  if (result) {
    emit('installComplete')
  }
}

defineExpose({ hasContent, cleanup })

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div class="archive-installer">
    <div
      :class="['drop-zone', { active: isDragging }]"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @dragover="handleDragOver"
      @drop="handleDrop"
      @click="handleClickSelect"
    >
      <div class="drop-zone-content">
        <NIcon :size="28" :color="isDragging ? DRAG_ACTIVE_COLOR : DRAG_DEFAULT_COLOR">
          <ArchiveOutline />
        </NIcon>
        <div class="drop-zone-text">
          <NText :depth="isDragging ? 1 : 3" style="font-weight: 500">
            {{ isDragging ? '释放以导入' : '拖拽压缩包到此处' }}
          </NText>
          <NText depth="3" class="drop-zone-hint"> 或点击选择文件 · 支持 .zip .tar.gz .tgz </NText>
        </div>
      </div>
      <NText v-if="selectedFile && !extracting" depth="3" class="selected-file">
        {{ selectedFile }}
      </NText>
    </div>

    <LocalInstallPanel
      :skills="scannedSkills"
      :selected-skills="selectedSkills"
      :selected-agents="selectedAgents"
      :is-global="isGlobal"
      :installing="installing"
      :install-result="installResult"
      :can-install="canInstall"
      :loading="extracting"
      :error="error"
      @update:selected-skills="selectedSkills = $event"
      @update:selected-agents="selectedAgents = $event"
      @update:is-global="isGlobal = $event"
      @install="handleInstall"
    />
  </div>
</template>

<style scoped>
.archive-installer {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  height: 100%;
}

.drop-zone {
  border: 2px dashed var(--color-hairline);
  border-radius: var(--radius-xl);
  padding: var(--space-xl) var(--space-lg);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-base);
  background: var(--color-canvas);
  flex-shrink: 0;
}

.drop-zone:hover {
  border-color: var(--color-brand-blue);
  background: var(--color-brand-blue-200);
}

.drop-zone.active {
  border-color: var(--color-brand-blue);
  background: var(--color-brand-blue-200);
  border-style: solid;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.drop-zone-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drop-zone-hint {
  font-size: var(--text-micro);
}

.selected-file {
  display: block;
  margin-top: var(--space-sm);
  font-size: var(--text-micro);
  word-break: break-all;
}
</style>
```

- [x] **Step 2: Commit ArchiveInstaller refactor**

```bash
git add src/renderer/src/components/skills/ArchiveInstaller.vue
git commit -m "refactor: ArchiveInstaller uses useSkillInstall composable"
```

---

### Task 6: Frontend — Add navigation guard to `SkillsSearch.vue`

**Files:**
- Modify: `src/renderer/src/views/SkillsSearch.vue`

- [x] **Step 1: Add navigation guard, template refs, and beforeunload**

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { NSpin, NEmpty, NText, NTabs, NTabPane, useDialog } from 'naive-ui'
import { useSkillsStore } from '@renderer/stores/skills'
import SkillSearchBar from '@renderer/components/skills/SkillSearchBar.vue'
import SearchResultCard from '@renderer/components/skills/SearchResultCard.vue'
import SkillInstallDialog from '@renderer/components/skills/SkillInstallDialog.vue'
import GitHubInstaller from '@renderer/components/skills/GitHubInstaller.vue'
import ArchiveInstaller from '@renderer/components/skills/ArchiveInstaller.vue'

const skillsStore = useSkillsStore()
const dialog = useDialog()
const showInstallDialog = ref(false)
const selectedSource = ref('')
const hasSearched = ref(false)
const activeTab = ref('search')

const gitHubRef = ref<InstanceType<typeof GitHubInstaller> | null>(null)
const archiveRef = ref<InstanceType<typeof ArchiveInstaller> | null>(null)

function handleSearch(keyword: string): void {
  hasSearched.value = true
  skillsStore.search(keyword)
}

function handleInstall(source: string): void {
  selectedSource.value = source
  showInstallDialog.value = true
}

function handleInstallComplete(): void {
  showInstallDialog.value = false
  selectedSource.value = ''
}

function handleLocalInstallComplete(): void {
  skillsStore.fetchInstalled()
}

function checkHasContent(): boolean {
  if (activeTab.value === 'github') {
    return gitHubRef.value?.hasContent ?? false
  }
  if (activeTab.value === 'archive') {
    return archiveRef.value?.hasContent ?? false
  }
  return false
}

async function cleanupActiveTab(): Promise<void> {
  if (activeTab.value === 'github') {
    await gitHubRef.value?.cleanup()
  } else if (activeTab.value === 'archive') {
    await archiveRef.value?.cleanup()
  }
}

onBeforeRouteLeave(() => {
  if (checkHasContent()) {
    return new Promise<boolean>((resolve) => {
      dialog.warning({
        title: '确认离开',
        content: '当前有未完成的安装操作，离开后解析结果将丢失。确定要离开吗？',
        positiveText: '确认离开',
        negativeText: '留在当前页',
        onPositiveClick: () => {
          cleanupActiveTab()
          resolve(true)
        },
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      })
    })
  }
})

function handleBeforeUnload(e: BeforeUnloadEvent): void {
  if (checkHasContent()) {
    e.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="search-page">
    <NTabs v-model:value="activeTab" type="line">
      <NTabPane name="search" tab="搜索安装">
        <div class="tab-content">
          <SkillSearchBar @search="handleSearch" />
          <div class="search-scroll">
            <div v-if="skillsStore.searching" class="search-loading">
              <NSpin size="large" />
            </div>
            <template v-else-if="hasSearched">
              <div class="search-results">
                <div class="search-meta">
                  <NText depth="3" class="search-meta-text">
                    搜索耗时 {{ (skillsStore.searchDuration / 1000).toFixed(1) }} 秒，共
                    {{ skillsStore.searchResults.length }} 个结果
                  </NText>
                </div>
                <div class="search-grid">
                  <SearchResultCard
                    v-for="result in skillsStore.searchResults"
                    :key="result.id"
                    :result="result"
                    @install="handleInstall"
                  />
                </div>
                <NEmpty
                  v-if="skillsStore.searchResults.length === 0"
                  description="无搜索结果"
                  class="search-empty"
                />
              </div>
            </template>
            <NEmpty v-else description="输入关键词搜索技能" class="search-empty" />
          </div>
        </div>
      </NTabPane>

      <NTabPane name="github" tab="GitHub链接">
        <div class="tab-content">
          <GitHubInstaller ref="gitHubRef" @install-complete="handleLocalInstallComplete" />
        </div>
      </NTabPane>

      <NTabPane name="archive" tab="压缩包">
        <div class="tab-content">
          <ArchiveInstaller ref="archiveRef" @install-complete="handleLocalInstallComplete" />
        </div>
      </NTabPane>
    </NTabs>

    <SkillInstallDialog
      v-model:show="showInstallDialog"
      :source="selectedSource"
      @complete="handleInstallComplete"
    />
  </div>
</template>

<style scoped>
.search-page {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 让 NTabs 填满剩余空间 */
.search-page :deep(.n-tabs) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.search-page :deep(.n-tabs-pane-wrapper) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.search-page :deep(.n-tab-pane) {
  height: 100%;
}

.tab-content {
  padding-top: var(--space-md);
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.search-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
}

.search-results {
  padding-bottom: var(--space-xl);
}

.search-meta {
  margin-bottom: var(--space-md);
}

.search-meta-text {
  font-size: var(--text-caption);
  color: var(--color-stone);
}

.search-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

.search-empty {
  margin-top: var(--space-xxxl);
}
</style>
```

- [x] **Step 2: Commit navigation guard**

```bash
git add src/renderer/src/views/SkillsSearch.vue
git commit -m "feat: add navigation guard to prevent losing unsaved install state"
```

---

### Task 7: Manual verification

- [x] **Step 1: Run dev server and verify**

Run: `npm run dev`

Verify each scenario:

1. **GitHub — parse then navigate away**: Enter a GitHub URL, click parse. After skills appear, click another page in sidebar. Confirm the warning dialog appears. Click "留在当前页" — should stay. Click "确认离开" — should navigate and clean up.

2. **GitHub — install one skill at a time**: Parse a GitHub repo with multiple skills. Select one skill, install it. Then select another skill, install it. Both should succeed (temp dir not deleted after first install).

3. **Archive — extract then navigate away**: Drop a zip file, wait for scan. Navigate away — confirm dialog should appear.

4. **Archive — button visibility**: After extracting a zip, the "安装选中技能" button should be visible at the bottom without needing to scroll past the content area.

5. **Window close**: While GitHub is parsed or Archive is extracted, try closing the app window — browser should show native confirmation.

- [x] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: No type errors.

- [x] **Step 3: Run lint**

Run: `npm run lint`

Expected: No lint errors.

- [x] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address typecheck/lint issues from install flow refactor"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: Each spec section (composable, navigation guard, temp cleanup, layout fix, component structure) maps to a task
- [x] **Placeholder scan**: No TBD/TODO/vague steps; all code is complete
- [x] **Type consistency**: `ArchiveScanResult` used consistently across types, service, IPC, preload; `useSkillInstall` return values match component usage; `defineExpose` exposes `hasContent` and `cleanup` which are consumed in SkillsSearch.vue
