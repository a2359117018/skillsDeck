# GitHub Installer UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the GitHub installer from a vertical layout to a left-right split layout, add persistent error alerts, preserve state across tab switches, and add robust temp file cleanup.

**Architecture:** GitHubInstaller.vue will be rewritten to inline its own install logic (instead of using LocalInstallPanel), combining SkillScanResult and AgentSelector in a side-by-side layout. A new `skills:cleanup-temp` IPC channel and `GitHubParseResult` return type (containing `tempDir`) enable temp file tracking. App startup scans for orphaned temp dirs.

**Tech Stack:** Electron 39 + Vue 3.5 + Naive UI 2.44 + TypeScript 5.9

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/shared/types.ts` | Modify | Add `GitHubParseResult` type |
| `src/main/services/GitHubSkillInstaller.ts` | Modify | `extractAndScan` returns `GitHubParseResult` with `tempDir` |
| `src/main/ipc/skills.ipc.ts` | Modify | Update `skills:parse-github` handler return type; add `skills:cleanup-temp` handler |
| `src/main/index.ts` | Modify | Add startup temp file cleanup |
| `src/preload/index.ts` | Modify | Add `cleanupTemp` method |
| `src/preload/index.d.ts` | Modify | Add `cleanupTemp` type declaration |
| `src/renderer/src/components/skills/GitHubInstaller.vue` | Rewrite | Left-right split layout, inline install logic, error alert, temp dir tracking |
| `src/renderer/src/views/SkillsSearch.vue` | Modify | Remove `animated` from NTabs |

---

### Task 1: Add `GitHubParseResult` type to shared types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add the new type**

Add at the end of `src/shared/types.ts` (after the `ParsedGitHubUrl` interface):

```typescript
export interface GitHubParseResult {
  skills: ScannedSkill[]
  tempDir: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add GitHubParseResult type for temp dir tracking"
```

---

### Task 2: Update GitHubSkillInstaller to return tempDir

**Files:**
- Modify: `src/main/services/GitHubSkillInstaller.ts`

- [ ] **Step 1: Update import and return type**

In `GitHubSkillInstaller.ts`, change the import from:

```typescript
import type { ScannedSkill, ParsedGitHubUrl } from '../../shared/types'
```

to:

```typescript
import type { ScannedSkill, ParsedGitHubUrl, GitHubParseResult } from '../../shared/types'
```

Change the `extractAndScan` method signature from:

```typescript
  async extractAndScan(
    zipPath: string,
    subPath?: string,
    repo?: string,
    branch?: string
  ): Promise<ScannedSkill[]> {
```

to:

```typescript
  async extractAndScan(
    zipPath: string,
    subPath?: string,
    repo?: string,
    branch?: string
  ): Promise<GitHubParseResult> {
```

And change the return statement at the end from:

```typescript
    return localSkillInstaller.scanSkills(scanDir)
```

to:

```typescript
    const skills = await localSkillInstaller.scanSkills(scanDir)
    return { skills, tempDir: path.dirname(zipPath) }
```

Note: `zipPath` is `path.join(tempDir, 'download.zip')` from `downloadZipball`, so `path.dirname(zipPath)` gives us the `skills-github-*` temp directory root.

- [ ] **Step 2: Commit**

```bash
git add src/main/services/GitHubSkillInstaller.ts
git commit -m "feat: GitHubSkillInstaller.extractAndScan returns tempDir"
```

---

### Task 3: Update IPC handlers — parse-github return type + cleanup-temp

**Files:**
- Modify: `src/main/ipc/skills.ipc.ts`

- [ ] **Step 1: Add import for GitHubParseResult**

In `skills.ipc.ts`, update the import of shared types to include `GitHubParseResult`:

```typescript
import type { CommandErrorInfo, GitHubParseResult } from '../../shared/types'
```

- [ ] **Step 2: Update `skills:parse-github` handler**

The handler currently returns `{ ok: true, data: skills }` where `skills` is `ScannedSkill[]`. Change it to return the full `GitHubParseResult`:

Replace the line:

```typescript
      const skills = await githubSkillInstaller.extractAndScan(
        zipPath,
        parsed.subPath,
        parsed.repo,
        parsed.branch
      )
      return { ok: true, data: skills }
```

with:

```typescript
      const result = await githubSkillInstaller.extractAndScan(
        zipPath,
        parsed.subPath,
        parsed.repo,
        parsed.branch
      )
      return { ok: true, data: result }
```

- [ ] **Step 3: Add `skills:cleanup-temp` handler**

Add a new handler after the `skills:cancel-github-download` handler:

```typescript
  ipcMain.handle('skills:cleanup-temp', async (_, tempDirs: string[]) => {
    const tmpDir = os.tmpdir()
    for (const dir of tempDirs) {
      const resolved = path.resolve(dir)
      if (resolved.startsWith(tmpDir) && path.basename(resolved).startsWith('skills-')) {
        await localSkillInstaller.cleanupTempDir(resolved)
      }
    }
  })
```

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc/skills.ipc.ts
git commit -m "feat: update parse-github IPC to return GitHubParseResult, add cleanup-temp"
```

---

### Task 4: Add app startup temp file cleanup

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Add imports and cleanup function**

Add these imports at the top of `src/main/index.ts`:

```typescript
import fs from 'fs'
import path from 'path'
import os from 'os'
```

Add this function before the `app.whenReady()` call:

```typescript
function cleanupOrphanedTempDirs(): void {
  const tmpDir = os.tmpdir()
  try {
    const entries = fs.readdirSync(tmpDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('skills-')) {
        fs.rmSync(path.join(tmpDir, entry.name), { recursive: true, force: true })
      }
    }
  } catch {
    // ignore cleanup errors
  }
}
```

- [ ] **Step 2: Call cleanup in app.whenReady**

Add `cleanupOrphanedTempDirs()` as the first line inside the `app.whenReady().then(() => {` callback, before `electronApp.setAppUserModelId`:

```typescript
app.whenReady().then(() => {
  cleanupOrphanedTempDirs()
  electronApp.setAppUserModelId('com.npx-skills-ui')
  // ... rest unchanged
```

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: clean orphaned skills-* temp dirs on app startup"
```

---

### Task 5: Update preload — add cleanupTemp and update parseGitHub type

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Update `src/preload/index.ts`**

Add `GitHubParseResult` to the import:

```typescript
import type { ScannedSkill, LocalInstallResult, CommandErrorInfo, GitHubParseResult } from '../shared/types'
```

Change `parseGitHub` return type:

```typescript
    parseGitHub: (url: string): Promise<IpcResult<GitHubParseResult>> =>
      ipcRenderer.invoke('skills:parse-github', url),
```

Add `cleanupTemp` after `cancelGitHubDownload`:

```typescript
    cancelGitHubDownload: (): Promise<void> => ipcRenderer.invoke('skills:cancel-github-download'),
    cleanupTemp: (tempDirs: string[]): Promise<void> =>
      ipcRenderer.invoke('skills:cleanup-temp', tempDirs),
```

- [ ] **Step 2: Update `src/preload/index.d.ts`**

Add `GitHubParseResult` to the import:

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
  GitHubParseResult
} from '../shared/types'
```

Update `parseGitHub` in the `AppApi.skills` interface:

```typescript
    parseGitHub: (url: string) => Promise<IpcResult<GitHubParseResult>>
```

Add `cleanupTemp` after `cancelGitHubDownload`:

```typescript
    cancelGitHubDownload: () => Promise<void>
    cleanupTemp: (tempDirs: string[]) => Promise<void>
```

- [ ] **Step 3: Commit**

```bash
git add src/preload/index.ts src/preload/index.d.ts
git commit -m "feat: add cleanupTemp IPC and update parseGitHub return type in preload"
```

---

### Task 6: Rewrite GitHubInstaller.vue with split layout

This is the largest task. The component will be rewritten to:
- Use left-right split layout (scan results left, agent selector + install button right)
- Inline the install logic from `LocalInstallPanel` (select skills, select agents, install)
- Add persistent `NAlert` error notification
- Track `tempDir` from parse result for cleanup
- Cleanup temp dir on `onUnmounted` and before new parse

**Files:**
- Rewrite: `src/renderer/src/components/skills/GitHubInstaller.vue`

- [ ] **Step 1: Write the new GitHubInstaller.vue**

Replace the entire file with:

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
  NSpin,
  useMessage
} from 'naive-ui'
import type { ScannedSkill, LocalInstallResult, GitHubParseResult } from '../../../../shared/types'
import AgentSelector from './AgentSelector.vue'

const emit = defineEmits<{
  installComplete: []
}>()

const message = useMessage()
const url = ref('')
const parsing = ref(false)
const downloadProgress = ref(0)
const showProgress = ref(false)
const scanResult = ref<GitHubParseResult | null>(null)
const alertError = ref<string | null>(null)

const selectedSkills = ref<string[]>([])
const selectedAgents = ref<string[]>([])
const isGlobal = ref(false)
const installing = ref(false)
const installResult = ref<LocalInstallResult | null>(null)

let removeProgressListener: (() => void) | null = null

const skills = computed(() => scanResult.value?.skills ?? [])

const allSkillsSelected = computed(
  () => skills.value.length > 0 && skills.value.every((s) => selectedSkills.value.includes(s.path))
)

const someSkillsSelected = computed(
  () =>
    skills.value.some((s) => selectedSkills.value.includes(s.path)) && !allSkillsSelected.value
)

const canInstall = computed(() => {
  if (selectedSkills.value.length === 0) return false
  if (isGlobal.value) return true
  return selectedAgents.value.length > 0
})

function clearAlert(): void {
  alertError.value = null
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

async function cleanupPreviousTemp(): Promise<void> {
  if (scanResult.value?.tempDir) {
    try {
      await window.api.skills.cleanupTemp([scanResult.value.tempDir])
    } catch {
      // ignore cleanup errors
    }
    scanResult.value = null
    selectedSkills.value = []
    installResult.value = null
  }
}

async function handleParse(): Promise<void> {
  if (!url.value.trim()) {
    message.warning('请输入 GitHub 仓库链接')
    return
  }

  await cleanupPreviousTemp()

  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  parsing.value = true
  clearAlert()
  downloadProgress.value = 0
  showProgress.value = true
  installResult.value = null

  removeProgressListener = window.api.skills.onGitHubDownloadProgress((percent) => {
    downloadProgress.value = percent
  })

  try {
    const result = await window.api.skills.parseGitHub(url.value.trim())
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    scanResult.value = result.data
    if (result.data.skills.length === 0) {
      message.info('未在仓库中扫描到技能文件')
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
  if (!canInstall.value) {
    message.warning('请选择要安装的技能和目标 agent')
    return
  }
  installing.value = true
  clearAlert()
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
      alertError.value = `安装完成：${result.data.success.length} 个成功，${result.data.failed.length} 个失败`
    } else {
      message.success(`成功安装 ${result.data.success.length} 个技能`)
    }
    emit('installComplete')
  } catch (e) {
    alertError.value = e instanceof Error ? e.message : String(e)
  } finally {
    installing.value = false
  }
}

onUnmounted(async () => {
  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  if (scanResult.value?.tempDir) {
    try {
      await window.api.skills.cleanupTemp([scanResult.value.tempDir])
    } catch {
      // ignore cleanup errors
    }
  }
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

    <NAlert
      v-if="alertError"
      type="error"
      closable
      class="error-alert"
      @close="clearAlert"
    >
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
        </div>

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
}

@media (max-width: 640px) {
  .split-layout {
    grid-template-columns: 1fr;
  }
}

.section-card {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-hairline);
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
  max-height: 240px;
  overflow-y: auto;
  touch-action: pan-y;
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

.install-result {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-hairline);
}

.fail-item {
  margin-top: var(--space-xs);
}
</style>
```

- [ ] **Step 2: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/skills/GitHubInstaller.vue
git commit -m "feat: rewrite GitHubInstaller with split layout, error alert, temp cleanup"
```

---

### Task 7: Remove `animated` from NTabs in SkillsSearch.vue

**Files:**
- Modify: `src/renderer/src/views/SkillsSearch.vue`

- [ ] **Step 1: Remove animated prop**

Change:

```html
    <NTabs type="line" animated>
```

to:

```html
    <NTabs type="line">
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/views/SkillsSearch.vue
git commit -m "fix: remove animated prop from NTabs to preserve tab state"
```

---

### Task 8: Verify full flow and final commit

- [ ] **Step 1: Run dev server**

Run: `npm run dev`

- [ ] **Step 2: Manual test — GitHub parse flow**

1. Navigate to the search page, click "GitHub链接" tab
2. Paste a valid GitHub URL (e.g. `https://github.com/anthropics/claude-code`)
3. Click "解析" — verify download progress shows
4. Verify scanned skills appear in left column, agent selector in right column
5. Verify error alert appears (not toast) when using invalid URL
6. Verify error alert is dismissible via close button

- [ ] **Step 3: Manual test — Tab state persistence**

1. Parse a GitHub URL with scanned results showing
2. Click "搜索安装" tab
3. Click back to "GitHub链接" tab
4. Verify scanned results and selections are preserved

- [ ] **Step 4: Manual test — Temp file cleanup**

1. Parse a GitHub URL
2. Close the app (simulating component unmount)
3. Reopen the app
4. Check that no `skills-github-*` directories remain in temp folder

- [ ] **Step 5: Run build to verify no regressions**

Run: `npm run build`
Expected: Clean build with no errors.
