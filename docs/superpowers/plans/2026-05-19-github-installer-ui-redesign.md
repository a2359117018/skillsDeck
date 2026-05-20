# GitHub Installer UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor GitHubInstaller.vue to always-visible two-column layout with GitHub-branded input card, progress dialog, compact action bar, and unified notification.

**Architecture:** Replace the conditional single-column layout with a persistent 1fr 1fr grid (matching ArchiveInstaller). Add a NModal progress dialog for download/parse states. Use SkillScanResult component for skill list. Remove inline result overlay in favor of useSkillInstall's existing notifications.

**Tech Stack:** Vue 3.5 + Naive UI 2.44 + TypeScript 5.9

---

## File Structure

| File                                                     | Action                | Responsibility                                    |
| -------------------------------------------------------- | --------------------- | ------------------------------------------------- |
| `src/shared/types.ts`                                    | Modify                | Add `parsedUrl` field to `GitHubParseResult`      |
| `src/main/services/GitHubSkillInstaller.ts`              | Modify                | Return `ParsedGitHubUrl` from `extractAndScan`    |
| `src/main/ipc/skills.ipc.ts`                             | Modify                | Pass parsed URL info into `extractAndScan` result |
| `src/renderer/src/components/skills/GitHubInstaller.vue` | Modify (full rewrite) | New two-column layout + progress dialog           |
| `src/renderer/src/assets/tokens.css`                     | No change             | All tokens already exist                          |

---

### Task 1: Extend GitHubParseResult with parsed URL info

**Files:**

- Modify: `src/shared/types.ts:115-118`

The renderer needs `owner`, `repo`, `branch` to display the repo info label. Currently `GitHubParseResult` only has `skills` and `tempDir`. We add the parsed URL info.

- [ ] **Step 1: Add parsedUrl field to GitHubParseResult**

In `src/shared/types.ts`, change the `GitHubParseResult` interface:

```typescript
export interface GitHubParseResult {
  skills: ScannedSkill[]
  tempDir: string
  parsedUrl: ParsedGitHubUrl
}
```

- [ ] **Step 2: Update extractAndScan to accept and return parsedUrl**

In `src/main/services/GitHubSkillInstaller.ts`, modify the `extractAndScan` method signature and return. Find the method at ~line 219:

Change the signature from:

```typescript
  async extractAndScan(
    zipPath: string,
    subPath?: string,
    repo?: string,
    branch?: string
  ): Promise<GitHubParseResult> {
```

To:

```typescript
  async extractAndScan(
    zipPath: string,
    subPath?: string,
    repo?: string,
    branch?: string,
    parsedUrl?: ParsedGitHubUrl
  ): Promise<GitHubParseResult> {
```

Find the return statement near the end of `extractAndScan` (the one returning `{ skills, tempDir }`):

```typescript
return {
  skills: scanned,
  tempDir: path.dirname(zipPath)
}
```

Change to:

```typescript
return {
  skills: scanned,
  tempDir: path.dirname(zipPath),
  parsedUrl: parsedUrl ?? {
    owner: '',
    repo: repo ?? '',
    branch: branch ?? 'main',
    subPath: subPath ?? ''
  }
}
```

- [ ] **Step 3: Pass parsed URL through the IPC handler**

In `src/main/ipc/skills.ipc.ts`, find the `skills:parse-github` handler (~line 128). Locate the `extractAndScan` call:

```typescript
const result = await githubSkillInstaller.extractAndScan(
  zipPath,
  parsed.subPath,
  parsed.repo,
  parsed.branch
)
```

Change to:

```typescript
const result = await githubSkillInstaller.extractAndScan(
  zipPath,
  parsed.subPath,
  parsed.repo,
  parsed.branch,
  parsed
)
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS (no type errors)

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/main/services/GitHubSkillInstaller.ts src/main/ipc/skills.ipc.ts
git commit -m "feat: include parsedUrl in GitHubParseResult for repo info display"
```

---

### Task 2: Rewrite GitHubInstaller.vue

**Files:**

- Rewrite: `src/renderer/src/components/skills/GitHubInstaller.vue` (entire file)

This is the main task. The component is completely rewritten to match the approved design.

- [ ] **Step 1: Write the new script section**

Replace the entire `<script setup lang="ts">` block with:

```typescript
import { ref, computed, onUnmounted } from 'vue'
import { NInput, NButton, NText, NModal, NProgress, useNotification } from 'naive-ui'
import type { GitHubParseResult, ParsedGitHubUrl } from '../../../../shared/types'
import SkillScanResult from './SkillScanResult.vue'
import AgentSelector from './AgentSelector.vue'
import { useSkillInstall } from '@renderer/composables/useSkillInstall'

const emit = defineEmits<{
  installComplete: []
}>()

const notification = useNotification()

const {
  selectedSkills,
  selectedAgents,
  isGlobal,
  installing,
  hasContent,
  canInstall,
  setSkills,
  setTempDir,
  install,
  cleanup
} = useSkillInstall()

const url = ref('')
const parsing = ref(false)
const downloadProgress = ref(0)
const showDialog = ref(false)
const scanResult = ref<GitHubParseResult | null>(null)
const parsedUrl = ref<ParsedGitHubUrl | null>(null)

let removeProgressListener: (() => void) | null = null

const skills = computed(() => scanResult.value?.skills ?? [])

const isParsed = computed(() => scanResult.value !== null)

const repoLabel = computed(() => {
  if (!parsedUrl.value) return ''
  const { owner, repo, branch } = parsedUrl.value
  const base = `${owner}/${repo}`
  return branch === 'main' ? base : `${base} · 分支: ${branch}`
})

async function handleParse(): Promise<void> {
  if (!url.value.trim()) return

  await cleanup()

  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  parsing.value = true
  downloadProgress.value = 0
  showDialog.value = true
  scanResult.value = null
  parsedUrl.value = null

  removeProgressListener = window.api.skills.onGitHubDownloadProgress((percent) => {
    downloadProgress.value = percent
  })

  try {
    const result = await window.api.skills.parseGitHub(url.value.trim())
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    scanResult.value = result.data
    parsedUrl.value = result.data.parsedUrl
    setSkills(result.data.skills)
    setTempDir(result.data.tempDir)
    if (result.data.skills.length === 0) {
      notification.info({
        title: '未扫描到技能文件',
        content: '未在仓库中发现有效的技能文件',
        duration: 5000
      })
    }
  } catch (e) {
    notification.error({
      title: '解析失败',
      content: e instanceof Error ? e.message : String(e),
      duration: 0
    })
  } finally {
    parsing.value = false
    showDialog.value = false
    if (removeProgressListener) {
      removeProgressListener()
      removeProgressListener = null
    }
  }
}

function handleCancel(): void {
  window.api.skills.cancelGitHubDownload()
  parsing.value = false
  showDialog.value = false
}

function handleReparse(): void {
  scanResult.value = null
  parsedUrl.value = null
  cleanup()
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
```

- [ ] **Step 2: Write the new template section**

Replace the entire `<template>` block with:

```html
<div class="github-installer">
  <div class="github-columns">
    <!-- Left column -->
    <div class="column-left">
      <!-- GitHub input card -->
      <div class="input-card">
        <div class="input-card-header">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="var(--color-ink)"
            class="github-icon"
          >
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          <NText class="input-card-title">从 GitHub 安装技能</NText>
        </div>
        <div class="input-row">
          <NInput
            v-model:value="url"
            placeholder="https://github.com/owner/repo"
            clearable
            :disabled="parsing || isParsed"
            @keyup.enter="handleParse"
          />
          <NButton
            v-if="!isParsed"
            type="primary"
            :disabled="parsing || !url.trim()"
            @click="handleParse"
          >
            解析
          </NButton>
          <NButton v-else @click="handleReparse"> 重新解析 </NButton>
        </div>
        <NText v-if="repoLabel" depth="3" class="repo-label">{{ repoLabel }}</NText>
      </div>

      <!-- Step 1 -->
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">选择技能</span>
        <span v-if="skills.length > 0" class="step-count">
          {{ selectedSkills.length }} / {{ skills.length }}
        </span>
      </div>

      <!-- Skill list area -->
      <div class="skill-list-area">
        <SkillScanResult
          :skills="skills"
          :model-value="selectedSkills"
          @update:model-value="selectedSkills = $event"
        />
      </div>
    </div>

    <!-- Right column -->
    <div class="column-right">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">选择目标</span>
      </div>

      <div class="agent-area">
        <AgentSelector
          :model-value="selectedAgents"
          :is-global="isGlobal"
          @update:model-value="selectedAgents = $event"
          @update:is-global="isGlobal = $event"
        />
      </div>

      <!-- Compact action bar -->
      <div class="action-bar">
        <span class="action-bar-count">
          已选 <span class="action-bar-num">{{ selectedSkills.length }}</span> 个技能
        </span>
        <NButton
          type="primary"
          size="small"
          :disabled="!canInstall || installing"
          :loading="installing"
          round
          @click="handleInstall"
        >
          安装
        </NButton>
      </div>
    </div>
  </div>

  <!-- Progress dialog -->
  <NModal v-model:show="showDialog" :mask-closable="false" :close-on-esc="false">
    <div class="progress-dialog">
      <NText strong class="progress-dialog-title">正在解析仓库</NText>
      <NProgress
        type="line"
        :percentage="downloadProgress"
        :show-indicator="true"
        :height="8"
        status="default"
      />
      <NText depth="3" class="progress-dialog-hint">
        {{ downloadProgress < 100 ? '正在下载...' : '正在扫描技能...' }}
      </NText>
      <NButton @click="handleCancel">取消</NButton>
    </div>
  </NModal>
</div>
```

- [ ] **Step 3: Write the new style section**

Replace the entire `<style scoped>` block with:

```css
.github-installer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.github-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  flex: 1;
  min-height: 0;
}

/* --- Left column --- */
.column-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 0;
  overflow-y: auto;
  padding-bottom: var(--space-lg);
}

/* --- Input card --- */
.input-card {
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.input-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.input-card-title {
  font-size: var(--text-micro);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.input-row {
  display: flex;
  gap: var(--space-xs);
}

.input-row .n-input {
  flex: 1;
}

.repo-label {
  font-size: var(--text-micro);
}

/* --- Step header --- */
.step-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.step-number {
  background: var(--color-brand-blue);
  color: var(--color-canvas);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-micro);
  font-weight: var(--weight-semibold);
}

.step-title {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.step-count {
  font-size: var(--text-micro);
  color: var(--color-muted);
}

/* --- Skill list area --- */
.skill-list-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  background: var(--color-canvas);
}

/* --- Right column --- */
.column-right {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 2em;
}

.agent-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* --- Action bar --- */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.action-bar-count {
  font-size: var(--text-micro);
  color: var(--color-muted);
}

.action-bar-num {
  color: var(--color-ink);
  font-weight: var(--weight-semibold);
}

/* --- Progress dialog --- */
.progress-dialog {
  min-width: 360px;
  max-width: 440px;
  padding: var(--space-lg);
  background: var(--color-canvas);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.progress-dialog-title {
  font-size: var(--text-body-sm);
}

.progress-dialog-hint {
  font-size: var(--text-micro);
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Verify dev server renders without errors**

Run: `npm run dev`
Expected: App opens, navigate to "GitHub链接" tab, see two-column layout with GitHub input card on left and agent selector on right. No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/skills/GitHubInstaller.vue
git commit -m "feat: redesign GitHub installer with two-column layout, progress dialog, and compact action bar"
```

---

### Task 3: Manual verification of full flow

This project has no test infrastructure. Manual verification in dev mode.

- [ ] **Step 1: Start dev server and test empty state**

Run: `npm run dev`

Verify:

- "GitHub链接" tab shows two-column layout
- Left: GitHub input card with icon + title + URL input + "解析" button
- Left: Step "1 选择技能" + empty skill list area
- Right: Step "2 选择目标" + AgentSelector + action bar "已选 0 个技能" + disabled "安装" button

- [ ] **Step 2: Test parse flow with a real GitHub URL**

Enter a valid GitHub repo URL (e.g. `https://github.com/anthropics/anthropic-cookbook`), click "解析".

Verify:

- Progress dialog appears with download progress bar
- "取消" button works to dismiss and cancel
- On success: dialog closes, left column shows repo label + skill list with checkboxes
- Right column action bar updates count when skills are selected
- "安装" button enables when skills and targets are selected

- [ ] **Step 3: Test install result uses notification**

Select skills and agents, click "安装".

Verify:

- No inline result overlay appears
- Notification appears in top-right corner (success, partial fail, or full fail)
- Action bar resets appropriately

- [ ] **Step 4: Test "重新解析" button**

After a successful parse, click "重新解析".

Verify:

- Skill list clears, repo label disappears
- URL input becomes editable again
- Input card returns to empty state

- [ ] **Step 5: Test navigation guard still works**

With skills parsed but not installed, try navigating away.

Verify:

- Confirmation dialog appears ("当前有未完成的安装操作...")

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -u
git commit -m "fix: address GitHub installer UI verification findings"
```

---

## Self-Review

**Spec coverage:**

- Always-visible two-column layout → Task 2
- GitHub-branded input card with icon + title → Task 2
- Repo info label (owner/repo · branch) → Task 1 (data) + Task 2 (display)
- Progress dialog (NModal) → Task 2
- Compact action bar with count + install button → Task 2
- SkillScanResult reuse → Task 2
- Notification unified (no overlay) → Task 2
- Format hint removed → Task 2
- Result overlay removed → Task 2

**Placeholder scan:** No TBD, TODO, or vague steps found.

**Type consistency:** `GitHubParseResult.parsedUrl` of type `ParsedGitHubUrl` is added in Task 1 and consumed in Task 2's `parsedUrl` ref and `repoLabel` computed. `NModal`, `NProgress` imported in Task 2. `useNotification` added for error/info notifications.
