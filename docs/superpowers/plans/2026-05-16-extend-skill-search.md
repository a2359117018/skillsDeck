# Extend Skill Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub URL and local archive installation channels to the SkillsSearch page, alongside the existing search install flow, with agent selection, multi-skill preview, and proxy support.

**Architecture:** Three new main-process services (`LocalSkillInstaller`, `GitHubSkillInstaller`, `ArchiveSkillInstaller`) handle download/extract/scan/copy logic. Five new IPC channels wire them to the renderer. Three new shared Vue components (`AgentSelector`, `SkillScanResult`, `LocalInstallPanel`) are composed into two tab installers (`GitHubInstaller`, `ArchiveInstaller`). `SkillsSearch.vue` is refactored into `NTabs` with three panes.

**Tech Stack:** Electron 39, Vue 3.5, TypeScript 5.9, Pinia 3, Naive UI 2.44, decompress 4.2.1

---

## File Structure Map

| File                                                       | Action | Responsibility                                                                                                                                  |
| ---------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/types.ts`                                      | Modify | Add `ScannedSkill`, `LocalInstallResult`, `ParsedGitHubUrl` interfaces                                                                          |
| `src/main/services/LocalSkillInstaller.ts`                 | Create | Scan `SKILL.md` up to depth 2; copy skill dirs to agent global paths; temp cleanup                                                              |
| `src/main/services/GitHubSkillInstaller.ts`                | Create | Parse GitHub URL; download zipball via fetch with proxy/abort/progress; extract and scan                                                        |
| `src/main/services/ArchiveSkillInstaller.ts`               | Create | Validate archive format; decompress and scan                                                                                                    |
| `src/main/ipc/skills.ipc.ts`                               | Modify | Add handlers: `skills:parse-github`, `skills:select-archive`, `skills:extract-archive`, `skills:install-local`, `skills:cancel-github-download` |
| `src/preload/index.ts`                                     | Modify | Expose new IPC methods on `window.api.skills`                                                                                                   |
| `src/preload/index.d.ts`                                   | Modify | Type declarations for new IPC methods                                                                                                           |
| `src/renderer/src/components/skills/AgentSelector.vue`     | Create | Extracted agent multi-select with filter, common agents, select-all                                                                             |
| `src/renderer/src/components/skills/SkillScanResult.vue`   | Create | Checkable list of scanned skills with name and relative path                                                                                    |
| `src/renderer/src/components/skills/LocalInstallPanel.vue` | Create | Compose `SkillScanResult` + `AgentSelector` + install button with progress                                                                      |
| `src/renderer/src/components/skills/GitHubInstaller.vue`   | Create | URL input, parse button, download progress, embed `LocalInstallPanel`                                                                           |
| `src/renderer/src/components/skills/ArchiveInstaller.vue`  | Create | File picker button, embed `LocalInstallPanel`                                                                                                   |
| `src/renderer/src/views/SkillsSearch.vue`                  | Modify | Wrap existing search in `NTabs` with three `NTabPane`s                                                                                          |

---

### Task 1: Add Shared Types

**Files:**

- Modify: `src/shared/types.ts`

- [ ] **Step 1: Append new interfaces to `src/shared/types.ts`**

  Add after `formatInstalls` function (end of file):

  ```typescript
  export interface ScannedSkill {
    name: string
    path: string
    relativePath: string
  }

  export interface LocalInstallResult {
    success: string[]
    failed: { name: string; error: string }[]
  }

  export interface ParsedGitHubUrl {
    owner: string
    repo: string
    branch: string
    subPath: string
  }
  ```

- [ ] **Step 2: Verify types compile**

  Run: `npm run typecheck`
  Expected: PASS (no errors from new types)

- [ ] **Step 3: Commit**

  ```bash
  git add src/shared/types.ts
  git commit -m "feat: add shared types for local/github/archive skill install"
  ```

---

### Task 2: LocalSkillInstaller Service

**Files:**

- Create: `src/main/services/LocalSkillInstaller.ts`

- [ ] **Step 1: Create `src/main/services/LocalSkillInstaller.ts`**

  ```typescript
  import fs from 'fs'
  import path from 'path'
  import os from 'os'
  import type { ScannedSkill, LocalInstallResult } from '../../shared/types'
  import agentsData from '../../shared/agents.json'

  interface AgentDef {
    name: string
    agentFlag: string
    globalPath: string
  }

  const agents: AgentDef[] = agentsData as AgentDef[]

  export class LocalSkillInstaller {
    private expandPath(p: string): string {
      if (p.startsWith('~')) {
        return path.join(os.homedir(), p.slice(2))
      }
      return path.resolve(p)
    }

    async scanSkills(dir: string, maxDepth = 2): Promise<ScannedSkill[]> {
      const results: ScannedSkill[] = []
      const basePath = path.resolve(dir)
      await this.scanDir(basePath, basePath, 0, maxDepth, results)
      return results
    }

    private async scanDir(
      currentPath: string,
      basePath: string,
      depth: number,
      maxDepth: number,
      results: ScannedSkill[]
    ): Promise<void> {
      if (depth > maxDepth) return

      try {
        await fs.promises.access(path.join(currentPath, 'SKILL.md'))
        results.push({
          name: path.basename(currentPath),
          path: currentPath,
          relativePath: path.relative(basePath, currentPath)
        })
        return
      } catch {
        // SKILL.md not found, continue scanning subdirectories
      }

      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await this.scanDir(
              path.join(currentPath, entry.name),
              basePath,
              depth + 1,
              maxDepth,
              results
            )
          }
        }
      } catch {
        // directory not readable, skip
      }
    }

    async installSkills(skillDirs: string[], agentFlags: string[]): Promise<LocalInstallResult> {
      const result: LocalInstallResult = { success: [], failed: [] }

      for (const skillDir of skillDirs) {
        const skillName = path.basename(skillDir)
        let allSucceeded = true
        let firstError = ''

        for (const agentFlag of agentFlags) {
          const agent = agents.find((a) => a.agentFlag === agentFlag)
          if (!agent) continue

          const targetDir = path.join(this.expandPath(agent.globalPath), skillName)
          try {
            await fs.promises.cp(skillDir, targetDir, { recursive: true, force: true })
          } catch (e) {
            allSucceeded = false
            firstError = e instanceof Error ? e.message : String(e)
            break
          }
        }

        if (allSucceeded) {
          result.success.push(skillName)
        } else {
          result.failed.push({ name: skillName, error: firstError })
        }
      }

      return result
    }

    async cleanupTempDir(dir: string): Promise<void> {
      try {
        await fs.promises.rm(dir, { recursive: true, force: true })
      } catch {
        // ignore cleanup errors
      }
    }
  }

  export const localSkillInstaller = new LocalSkillInstaller()
  ```

- [ ] **Step 2: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**

  ```bash
  git add src/main/services/LocalSkillInstaller.ts
  git commit -m "feat: add LocalSkillInstaller service for scan and copy"
  ```

---

### Task 3: GitHubSkillInstaller Service

**Files:**

- Create: `src/main/services/GitHubSkillInstaller.ts`

- [ ] **Step 1: Create `src/main/services/GitHubSkillInstaller.ts`**

  ```typescript
  import fs from 'fs'
  import path from 'path'
  import os from 'os'
  import decompress from 'decompress'
  import type { ScannedSkill, ParsedGitHubUrl } from '../../shared/types'
  import { getSettings } from './StoreService'
  import { localSkillInstaller } from './LocalSkillInstaller'

  export class GitHubSkillInstaller {
    private abortController: AbortController | null = null

    parseUrl(url: string): ParsedGitHubUrl | null {
      const clean = url.trim().replace(/\.git$/, '')

      const patterns = [
        /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/,
        /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/
      ]

      for (const pattern of patterns) {
        const match = clean.match(pattern)
        if (match) {
          return {
            owner: match[1],
            repo: match[2],
            branch: match[3] || 'main',
            subPath: match[4] || ''
          }
        }
      }

      return null
    }

    private buildZipballUrl(owner: string, repo: string, branch: string): string {
      const proxyUrl = getSettings().proxyUrl
      const base = `https://github.com/${owner}/${repo}/archive/${branch}.zip`
      if (proxyUrl) {
        return `${proxyUrl}/${base}`
      }
      return base
    }

    async downloadZipball(
      owner: string,
      repo: string,
      branch: string,
      onProgress?: (percent: number) => void
    ): Promise<string> {
      const zipUrl = this.buildZipballUrl(owner, repo, branch)
      const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'skills-github-'))
      const zipPath = path.join(tempDir, 'download.zip')

      this.abortController = new AbortController()
      const timeout = setTimeout(() => {
        this.abortController?.abort()
      }, 30000)

      try {
        const response = await fetch(zipUrl, {
          signal: this.abortController.signal,
          headers: { Accept: 'application/zip' }
        })

        if (!response.ok) {
          throw new Error(`下载失败: ${response.status} ${response.statusText}`)
        }

        const totalLength = Number(response.headers.get('content-length')) || 0
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('无法读取响应体')
        }

        const chunks: Uint8Array[] = []
        let receivedLength = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          receivedLength += value.length
          if (totalLength > 0 && onProgress) {
            onProgress(Math.round((receivedLength / totalLength) * 100))
          }
        }

        const allChunks = new Uint8Array(receivedLength)
        let position = 0
        for (const chunk of chunks) {
          allChunks.set(chunk, position)
          position += chunk.length
        }

        await fs.promises.writeFile(zipPath, allChunks)
        return zipPath
      } catch (e) {
        await localSkillInstaller.cleanupTempDir(tempDir)
        if (e instanceof Error && e.name === 'AbortError') {
          throw new Error('下载已取消或超时')
        }
        throw e
      } finally {
        clearTimeout(timeout)
        this.abortController = null
      }
    }

    async extractAndScan(zipPath: string, subPath?: string): Promise<ScannedSkill[]> {
      const extractDir = path.join(path.dirname(zipPath), 'extracted')
      await decompress(zipPath, extractDir)

      // zipball extracts to a single subdirectory like "repo-branch/"
      const entries = await fs.promises.readdir(extractDir, { withFileTypes: true })
      const subDir = entries.find((e) => e.isDirectory())
      let scanDir = subDir ? path.join(extractDir, subDir.name) : extractDir

      if (subPath) {
        scanDir = path.join(scanDir, subPath)
      }

      return localSkillInstaller.scanSkills(scanDir)
    }

    cancelDownload(): void {
      this.abortController?.abort()
    }
  }

  export const githubSkillInstaller = new GitHubSkillInstaller()
  ```

- [ ] **Step 2: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**

  ```bash
  git add src/main/services/GitHubSkillInstaller.ts
  git commit -m "feat: add GitHubSkillInstaller service for URL parse, zipball download, and scan"
  ```

---

### Task 4: ArchiveSkillInstaller Service

**Files:**

- Create: `src/main/services/ArchiveSkillInstaller.ts`

- [ ] **Step 1: Create `src/main/services/ArchiveSkillInstaller.ts`**

  ```typescript
  import fs from 'fs'
  import path from 'path'
  import os from 'os'
  import decompress from 'decompress'
  import type { ScannedSkill } from '../../shared/types'
  import { localSkillInstaller } from './LocalSkillInstaller'

  const SUPPORTED_EXTENSIONS = ['.zip', '.tar.gz', '.tgz']

  export class ArchiveSkillInstaller {
    private getExtension(filePath: string): string {
      if (filePath.endsWith('.tar.gz')) return '.tar.gz'
      if (filePath.endsWith('.tgz')) return '.tgz'
      if (filePath.endsWith('.zip')) return '.zip'
      return ''
    }

    validate(filePath: string): { valid: boolean; error?: string } {
      const ext = this.getExtension(filePath)
      if (!ext) {
        return {
          valid: false,
          error: `不支持的格式，仅支持: ${SUPPORTED_EXTENSIONS.join(', ')}`
        }
      }
      return { valid: true }
    }

    async extractAndScan(filePath: string): Promise<ScannedSkill[]> {
      const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'skills-archive-'))
      try {
        await decompress(filePath, tempDir)
        return localSkillInstaller.scanSkills(tempDir)
      } catch (e) {
        await localSkillInstaller.cleanupTempDir(tempDir)
        throw e
      }
    }
  }

  export const archiveSkillInstaller = new ArchiveSkillInstaller()
  ```

- [ ] **Step 2: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**

  ```bash
  git add src/main/services/ArchiveSkillInstaller.ts
  git commit -m "feat: add ArchiveSkillInstaller service for archive extract and scan"
  ```

---

### Task 5: IPC Handlers

**Files:**

- Modify: `src/main/ipc/skills.ipc.ts`

- [ ] **Step 1: Add imports at top of `src/main/ipc/skills.ipc.ts`**

  Add after existing imports (before `function serializeError`):

  ```typescript
  import { dialog } from 'electron'
  import { githubSkillInstaller } from '../services/GitHubSkillInstaller'
  import { archiveSkillInstaller } from '../services/ArchiveSkillInstaller'
  import { localSkillInstaller } from '../services/LocalSkillInstaller'
  import type { ScannedSkill } from '../../shared/types'
  ```

- [ ] **Step 2: Add handlers inside `registerSkillsIpc` function** (before the closing brace)

  Add after `skills:remove` handler, before `function hasPendingTask`:

  ```typescript
  ipcMain.handle('skills:parse-github', async (_, url: string) => {
    const mainWindow = getMainWindow()
    try {
      const parsed = githubSkillInstaller.parseUrl(url)
      if (!parsed) {
        return {
          ok: false,
          error: {
            code: 'UNKNOWN' as const,
            command: '',
            stderr: '',
            exitCode: null,
            message: '无效的 GitHub URL，请检查格式'
          }
        }
      }

      const onProgress = (percent: number): void => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('skills:github-download-progress', percent)
        }
      }

      const zipPath = await githubSkillInstaller.downloadZipball(
        parsed.owner,
        parsed.repo,
        parsed.branch,
        onProgress
      )
      const skills = await githubSkillInstaller.extractAndScan(zipPath, parsed.subPath)
      await localSkillInstaller.cleanupTempDir(path.dirname(zipPath))
      return { ok: true, data: skills }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

  ipcMain.handle('skills:select-archive', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: '压缩文件', extensions: ['zip', 'tar.gz', 'tgz'] }]
      })
      if (result.canceled || result.filePaths.length === 0) {
        return {
          ok: false,
          error: {
            code: 'UNKNOWN' as const,
            command: '',
            stderr: '',
            exitCode: null,
            message: '未选择文件'
          }
        }
      }
      return { ok: true, data: result.filePaths[0] }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

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
      const skills = await archiveSkillInstaller.extractAndScan(filePath)
      return { ok: true, data: skills }
    } catch (e) {
      return { ok: false, error: serializeError(e) }
    }
  })

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

  ipcMain.handle('skills:cancel-github-download', () => {
    githubSkillInstaller.cancelDownload()
  })
  ```

  Also add `path` import at the top of the file if not present:

  ```typescript
  import path from 'path'
  ```

- [ ] **Step 3: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 4: Commit**

  ```bash
  git add src/main/ipc/skills.ipc.ts
  git commit -m "feat: add IPC handlers for github/archive/local skill install"
  ```

---

### Task 6: Preload API Exposure

**Files:**

- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Update `src/preload/index.ts`**

  Add to `skills` object (after `updateAllBackground`, before `agents`):

  ```typescript
    parseGitHub: (url: string): Promise<unknown> =>
      ipcRenderer.invoke('skills:parse-github', url),
    selectArchive: (): Promise<unknown> => ipcRenderer.invoke('skills:select-archive'),
    extractArchive: (filePath: string): Promise<unknown> =>
      ipcRenderer.invoke('skills:extract-archive', filePath),
    installLocal: (opts: {
      skillDirs: string[]
      agents: string[]
    }): Promise<unknown> => ipcRenderer.invoke('skills:install-local', opts),
    cancelGitHubDownload: (): Promise<void> =>
      ipcRenderer.invoke('skills:cancel-github-download'),
    onGitHubDownloadProgress: (callback: (percent: number) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, percent: number): void =>
        callback(percent)
      ipcRenderer.on('skills:github-download-progress', listener)
      return () => ipcRenderer.removeListener('skills:github-download-progress', listener)
    },
  ```

- [ ] **Step 2: Update `src/preload/index.d.ts`**

  Add to `skills` interface (after `updateAllBackground`, before `agents`):

  ```typescript
    parseGitHub: (url: string) => Promise<IpcResult<ScannedSkill[]>>
    selectArchive: () => Promise<IpcResult<string>>
    extractArchive: (filePath: string) => Promise<IpcResult<ScannedSkill[]>>
    installLocal: (opts: {
      skillDirs: string[]
      agents: string[]
    }) => Promise<IpcResult<LocalInstallResult>>
    cancelGitHubDownload: () => Promise<void>
    onGitHubDownloadProgress: (callback: (percent: number) => void) => () => void
  ```

  Also add `ScannedSkill` and `LocalInstallResult` to the import from `../shared/types`:

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
    LocalInstallResult
  } from '../shared/types'
  ```

- [ ] **Step 3: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 4: Commit**

  ```bash
  git add src/preload/index.ts src/preload/index.d.ts
  git commit -m "feat: expose new skill install IPC methods in preload"
  ```

---

### Task 7: AgentSelector Component

**Files:**

- Create: `src/renderer/src/components/skills/AgentSelector.vue`

- [ ] **Step 1: Create `src/renderer/src/components/skills/AgentSelector.vue`**

  ```vue
  <script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { NCheckbox, NButton, NInput, NSpace, NText } from 'naive-ui'
  import { AGENTS, getCommonAgents } from '../../constants/agents'
  import { useSettingsStore } from '../../stores/settings'

  const props = defineProps<{
    modelValue: string[]
    isGlobal: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string[]]
    'update:isGlobal': [value: boolean]
  }>()

  const settingsStore = useSettingsStore()
  const filterText = ref('')

  watch(
    () => props.isGlobal,
    (global) => {
      if (global) emit('update:modelValue', [])
    }
  )

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
      filteredAgents.value.every((a) => props.modelValue.includes(a.agentFlag))
  )

  function toggleAgent(agentFlag: string): void {
    if (props.isGlobal) return
    const current = [...props.modelValue]
    const idx = current.indexOf(agentFlag)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(agentFlag)
    }
    emit('update:modelValue', current)
  }

  function toggleSelectAll(): void {
    const flags = filteredAgents.value.map((a) => a.agentFlag)
    if (allFilteredSelected.value) {
      emit(
        'update:modelValue',
        props.modelValue.filter((s) => !flags.includes(s))
      )
    } else {
      emit('update:modelValue', [...new Set([...props.modelValue, ...flags])])
    }
  }

  function toggleGlobal(val: boolean): void {
    emit('update:isGlobal', val)
  }

  const canConfirm = computed(() => {
    if (props.isGlobal) return true
    return props.modelValue.length > 0
  })

  defineExpose({ canConfirm })
  </script>

  <template>
    <div class="agent-selector">
      <NCheckbox :checked="isGlobal" @update:checked="toggleGlobal">
        全局安装（不指定 agent）
      </NCheckbox>

      <div v-if="!isGlobal" class="agent-section">
        <NText depth="3" class="section-label">常用 Agent</NText>
        <NSpace :size="8" :wrap="true" class="common-agents">
          <NButton
            v-for="agent in commonAgents"
            :key="agent.agentFlag"
            :type="modelValue.includes(agent.agentFlag) ? 'primary' : 'default'"
            size="small"
            round
            @click="toggleAgent(agent.agentFlag)"
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
            modelValue.some((s) => filteredAgents.some((a) => a.agentFlag === s)) &&
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
              :checked="modelValue.includes(agent.agentFlag)"
              @update:checked="() => toggleAgent(agent.agentFlag)"
            >
              {{ agent.name }}
            </NCheckbox>
          </NSpace>
        </div>

        <NText depth="3" class="selected-count"> 已选: {{ modelValue.length }} 个 agent </NText>
      </div>
    </div>
  </template>

  <style scoped>
  .agent-selector {
    width: 100%;
  }

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
  </style>
  ```

- [ ] **Step 2: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**

  ```bash
  git add src/renderer/src/components/skills/AgentSelector.vue
  git commit -m "feat: add AgentSelector shared component"
  ```

---

### Task 8: SkillScanResult Component

**Files:**

- Create: `src/renderer/src/components/skills/SkillScanResult.vue`

- [ ] **Step 1: Create `src/renderer/src/components/skills/SkillScanResult.vue`**

  ```vue
  <script setup lang="ts">
  import { computed } from 'vue'
  import { NCheckbox, NSpace, NText, NEmpty } from 'naive-ui'
  import type { ScannedSkill } from '../../../../shared/types'

  const props = defineProps<{
    skills: ScannedSkill[]
    modelValue: string[]
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string[]]
  }>()

  const allSelected = computed(
    () => props.skills.length > 0 && props.skills.every((s) => props.modelValue.includes(s.path))
  )

  const someSelected = computed(
    () => props.skills.some((s) => props.modelValue.includes(s.path)) && !allSelected.value
  )

  function toggleAll(): void {
    if (allSelected.value) {
      emit('update:modelValue', [])
    } else {
      emit(
        'update:modelValue',
        props.skills.map((s) => s.path)
      )
    }
  }

  function toggleSkill(path: string): void {
    const current = [...props.modelValue]
    const idx = current.indexOf(path)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(path)
    }
    emit('update:modelValue', current)
  }
  </script>

  <template>
    <div class="scan-result">
      <div v-if="skills.length > 0" class="scan-header">
        <NCheckbox :checked="allSelected" :indeterminate="someSelected" @update:checked="toggleAll">
          全选 ({{ modelValue.length }} / {{ skills.length }})
        </NCheckbox>
      </div>
      <div v-if="skills.length > 0" class="scan-list">
        <NSpace vertical :size="8">
          <div v-for="skill in skills" :key="skill.path" class="scan-item">
            <NCheckbox
              :checked="modelValue.includes(skill.path)"
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
      <NEmpty v-else description="未扫描到技能" />
    </div>
  </template>

  <style scoped>
  .scan-result {
    width: 100%;
  }

  .scan-header {
    margin-bottom: var(--space-sm);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-hairline);
  }

  .scan-list {
    max-height: 240px;
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
  </style>
  ```

- [ ] **Step 2: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**

  ```bash
  git add src/renderer/src/components/skills/SkillScanResult.vue
  git commit -m "feat: add SkillScanResult shared component"
  ```

---

### Task 9: LocalInstallPanel Component

**Files:**

- Create: `src/renderer/src/components/skills/LocalInstallPanel.vue`

- [ ] **Step 1: Create `src/renderer/src/components/skills/LocalInstallPanel.vue`**

  ```vue
  <script setup lang="ts">
  import { ref, computed } from 'vue'
  import { NButton, NSpace, NText, NSpin, useMessage } from 'naive-ui'
  import type { ScannedSkill, LocalInstallResult } from '../../../../shared/types'
  import SkillScanResult from './SkillScanResult.vue'
  import AgentSelector from './AgentSelector.vue'

  const props = defineProps<{
    skills: ScannedSkill[]
    loading?: boolean
    error?: string | null
  }>()

  const emit = defineEmits<{
    install: [payload: { skillDirs: string[]; agents: string[]; isGlobal: boolean }]
  }>()

  const message = useMessage()
  const selectedSkills = ref<string[]>([])
  const selectedAgents = ref<string[]>([])
  const isGlobal = ref(false)
  const installing = ref(false)
  const installResult = ref<LocalInstallResult | null>(null)

  const canInstall = computed(() => {
    if (selectedSkills.value.length === 0) return false
    if (isGlobal.value) return true
    return selectedAgents.value.length > 0
  })

  async function handleInstall(): Promise<void> {
    if (!canInstall.value) {
      message.warning('请选择要安装的技能和目标 agent')
      return
    }
    installing.value = true
    installResult.value = null
    try {
      const agents = isGlobal.value ? [] : selectedAgents.value
      emit('install', {
        skillDirs: selectedSkills.value,
        agents,
        isGlobal: isGlobal.value
      })
    } finally {
      installing.value = false
    }
  }

  function showInstallResult(result: LocalInstallResult): void {
    installResult.value = result
    if (result.failed.length > 0) {
      message.error(`安装完成：${result.success.length} 个成功，${result.failed.length} 个失败`)
    } else {
      message.success(`成功安装 ${result.success.length} 个技能`)
    }
  }

  defineExpose({ showInstallResult })
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
        <div class="panel-section">
          <NText depth="3" class="section-title">扫描到的技能</NText>
          <SkillScanResult v-model:modelValue="selectedSkills" :skills="skills" />
        </div>

        <div class="panel-section">
          <NText depth="3" class="section-title">安装目标</NText>
          <AgentSelector v-model:modelValue="selectedAgents" v-model:isGlobal="isGlobal" />
        </div>

        <div class="panel-actions">
          <NButton
            type="primary"
            :disabled="!canInstall || installing"
            :loading="installing"
            @click="handleInstall"
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
    background: #fef2f2;
    border-radius: var(--radius-md);
    border: 1px solid #fecaca;
  }

  .panel-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .panel-section {
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

  .panel-actions {
    display: flex;
    justify-content: flex-end;
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

- [ ] **Step 2: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**

  ```bash
  git add src/renderer/src/components/skills/LocalInstallPanel.vue
  git commit -m "feat: add LocalInstallPanel shared component"
  ```

---

### Task 10: GitHubInstaller Component

**Files:**

- Create: `src/renderer/src/components/skills/GitHubInstaller.vue`

- [ ] **Step 1: Create `src/renderer/src/components/skills/GitHubInstaller.vue`**

  ```vue
  <script setup lang="ts">
  import { ref, onUnmounted } from 'vue'
  import { NInput, NButton, NProgress, NText, useMessage } from 'naive-ui'
  import type { ScannedSkill, LocalInstallResult } from '../../../../shared/types'
  import LocalInstallPanel from './LocalInstallPanel.vue'

  const emit = defineEmits<{
    installComplete: []
  }>()

  const message = useMessage()
  const url = ref('')
  const parsing = ref(false)
  const downloadProgress = ref(0)
  const showProgress = ref(false)
  const scannedSkills = ref<ScannedSkill[]>([])
  const error = ref<string | null>(null)
  const panelRef = ref<InstanceType<typeof LocalInstallPanel> | null>(null)
  let removeProgressListener: (() => void) | null = null

  onUnmounted(() => {
    if (removeProgressListener) {
      removeProgressListener()
      removeProgressListener = null
    }
  })

  async function handleParse(): Promise<void> {
    if (!url.value.trim()) {
      message.warning('请输入 GitHub 仓库链接')
      return
    }
    parsing.value = true
    error.value = null
    scannedSkills.value = []
    downloadProgress.value = 0
    showProgress.value = true

    removeProgressListener = window.api.skills.onGitHubDownloadProgress((percent) => {
      downloadProgress.value = percent
    })

    try {
      const result = await window.api.skills.parseGitHub(url.value.trim())
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      scannedSkills.value = result.data as ScannedSkill[]
      if (scannedSkills.value.length === 0) {
        message.info('未在仓库中扫描到技能文件')
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      message.error('解析失败: ' + error.value)
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

  async function handleInstall(payload: {
    skillDirs: string[]
    agents: string[]
    isGlobal: boolean
  }): Promise<void> {
    try {
      const result = await window.api.skills.installLocal({
        skillDirs: payload.skillDirs,
        agents: payload.isGlobal ? [] : payload.agents
      })
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      const data = result.data as LocalInstallResult
      panelRef.value?.showInstallResult(data)
      emit('installComplete')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      message.error('安装失败: ' + msg)
    }
  }
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

      <LocalInstallPanel
        ref="panelRef"
        :skills="scannedSkills"
        :loading="parsing"
        :error="error"
        @install="handleInstall"
      />
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

  .progress-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  </style>
  ```

- [ ] **Step 2: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**

  ```bash
  git add src/renderer/src/components/skills/GitHubInstaller.vue
  git commit -m "feat: add GitHubInstaller component"
  ```

---

### Task 11: ArchiveInstaller Component

**Files:**

- Create: `src/renderer/src/components/skills/ArchiveInstaller.vue`

- [ ] **Step 1: Create `src/renderer/src/components/skills/ArchiveInstaller.vue`**

  ```vue
  <script setup lang="ts">
  import { ref } from 'vue'
  import { NButton, NText, useMessage } from 'naive-ui'
  import { ArchiveOutline } from '@vicons/ionicons5'
  import { NIcon } from 'naive-ui'
  import type { ScannedSkill, LocalInstallResult } from '../../../../shared/types'
  import LocalInstallPanel from './LocalInstallPanel.vue'

  const emit = defineEmits<{
    installComplete: []
  }>()

  const message = useMessage()
  const selectedFile = ref('')
  const extracting = ref(false)
  const scannedSkills = ref<ScannedSkill[]>([])
  const error = ref<string | null>(null)
  const panelRef = ref<InstanceType<typeof LocalInstallPanel> | null>(null)

  async function handleSelectFile(): Promise<void> {
    try {
      const result = await window.api.skills.selectArchive()
      if (!result.ok) {
        if (result.error.message === '未选择文件') return
        throw new Error(result.error.message)
      }
      selectedFile.value = result.data as string
      await handleExtract()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      message.error('选择文件失败: ' + error.value)
    }
  }

  async function handleExtract(): Promise<void> {
    if (!selectedFile.value) return
    extracting.value = true
    error.value = null
    scannedSkills.value = []
    try {
      const result = await window.api.skills.extractArchive(selectedFile.value)
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      scannedSkills.value = result.data as ScannedSkill[]
      if (scannedSkills.value.length === 0) {
        message.info('未在压缩包中扫描到技能文件')
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      message.error('解压扫描失败: ' + error.value)
    } finally {
      extracting.value = false
    }
  }

  async function handleInstall(payload: {
    skillDirs: string[]
    agents: string[]
    isGlobal: boolean
  }): Promise<void> {
    try {
      const result = await window.api.skills.installLocal({
        skillDirs: payload.skillDirs,
        agents: payload.isGlobal ? [] : payload.agents
      })
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      const data = result.data as LocalInstallResult
      panelRef.value?.showInstallResult(data)
      emit('installComplete')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      message.error('安装失败: ' + msg)
    }
  }
  </script>

  <template>
    <div class="archive-installer">
      <div class="file-select-row">
        <NButton @click="handleSelectFile">
          <template #icon>
            <NIcon :size="18"><ArchiveOutline /></NIcon>
          </template>
          选择压缩包
        </NButton>
        <NText v-if="selectedFile" depth="3" class="file-name">
          {{ selectedFile }}
        </NText>
      </div>

      <LocalInstallPanel
        ref="panelRef"
        :skills="scannedSkills"
        :loading="extracting"
        :error="error"
        @install="handleInstall"
      />
    </div>
  </template>

  <style scoped>
  .archive-installer {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .file-select-row {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .file-name {
    font-size: 13px;
    word-break: break-all;
  }
  </style>
  ```

- [ ] **Step 2: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**

  ```bash
  git add src/renderer/src/components/skills/ArchiveInstaller.vue
  git commit -m "feat: add ArchiveInstaller component"
  ```

---

### Task 12: SkillsSearch Page Refactor

**Files:**

- Modify: `src/renderer/src/views/SkillsSearch.vue`

- [ ] **Step 1: Replace `src/renderer/src/views/SkillsSearch.vue` content**

  ```vue
  <script setup lang="ts">
  import { ref } from 'vue'
  import { NSpin, NEmpty, NText, NTabs, NTabPane } from 'naive-ui'
  import { useSkillsStore } from '@renderer/stores/skills'
  import SkillSearchBar from '@renderer/components/skills/SkillSearchBar.vue'
  import SearchResultCard from '@renderer/components/skills/SearchResultCard.vue'
  import SkillInstallDialog from '@renderer/components/skills/SkillInstallDialog.vue'
  import GitHubInstaller from '@renderer/components/skills/GitHubInstaller.vue'
  import ArchiveInstaller from '@renderer/components/skills/ArchiveInstaller.vue'

  const skillsStore = useSkillsStore()
  const showInstallDialog = ref(false)
  const selectedSource = ref('')
  const hasSearched = ref(false)

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
  </script>

  <template>
    <div class="search-page">
      <NTabs type="line" animated>
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
            <GitHubInstaller @install-complete="handleLocalInstallComplete" />
          </div>
        </NTabPane>

        <NTabPane name="archive" tab="压缩包">
          <div class="tab-content">
            <ArchiveInstaller @install-complete="handleLocalInstallComplete" />
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

  .tab-content {
    padding-top: var(--space-md);
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
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-md);
  }

  .search-empty {
    margin-top: var(--space-xxxl);
  }
  </style>
  ```

- [ ] **Step 2: Verify compilation**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**

  ```bash
  git add src/renderer/src/views/SkillsSearch.vue
  git commit -m "feat: refactor SkillsSearch with NTabs for search/github/archive"
  ```

---

### Task 13: Integration Verification

**Files:**

- (no new files, verification only)

- [ ] **Step 1: Run full typecheck**

  Run: `npm run typecheck`
  Expected: PASS (main + renderer + preload)

- [ ] **Step 2: Run linter**

  Run: `npm run lint`
  Expected: PASS or auto-fixable warnings only

- [ ] **Step 3: Run formatter**

  Run: `npm run format`
  Expected: files reformatted, no errors

- [ ] **Step 4: Dev smoke test**

  Run: `npm run dev`
  Expected: app starts, search tab works, can switch to GitHub/archive tabs

- [ ] **Step 5: Final commit**

  ```bash
  git add .
  git commit -m "chore: format and lint after extend-skill-search implementation"
  ```

---

## Self-Review Checklist

### 1. Spec Coverage

| Design.md Requirement      | Implementing Task                                                 |
| -------------------------- | ----------------------------------------------------------------- |
| 扫描深度限制为 2           | Task 2 Step 1 (`maxDepth = 2`)                                    |
| 文件复制而非符号链接       | Task 2 Step 1 (`fs.promises.cp`)                                  |
| 临时文件安装后立即清理     | Task 2 Step 1 (`cleanupTempDir`); Task 3 Step 1 (finally cleanup) |
| zipball 下载 + 代理        | Task 3 Step 1 (`buildZipballUrl` with proxy)                      |
| AbortController + 30s 超时 | Task 3 Step 1 (`abortController`, `setTimeout(..., 30000)`)       |
| 下载进度 IPC 流            | Task 5 Step 2 (`skills:github-download-progress`)                 |
| 压缩包格式验证             | Task 4 Step 1 (`validate` method)                                 |
| 不复用 SkillInstallDialog  | Task 9-11 (独立组件)                                              |
| NTabs + NTabPane           | Task 12 Step 1                                                    |
| 搜索安装完全保留           | Task 12 (第一个 tab 不变)                                         |
| 安装后刷新技能列表         | Task 12 (`handleLocalInstallComplete` → `fetchInstalled`)         |

**No gaps found.**

### 2. Placeholder Scan

- No "TBD", "TODO", "implement later", "fill in details" found
- No vague "add error handling" steps — each step shows exact code
- No "Similar to Task N" shortcuts — each component is fully defined
- All file paths are exact

### 3. Type Consistency

| Type / Method              | First Definition              | Later Usage                    | Status |
| -------------------------- | ----------------------------- | ------------------------------ | ------ |
| `ScannedSkill`             | Task 1 (`shared/types.ts`)    | Tasks 2, 3, 4, 6, 8, 10, 11    | OK     |
| `LocalInstallResult`       | Task 1 (`shared/types.ts`)    | Tasks 2, 6, 9, 10, 11          | OK     |
| `ParsedGitHubUrl`          | Task 1 (`shared/types.ts`)    | Task 3                         | OK     |
| `parseGitHub(url)`         | Task 6 (`preload/index.d.ts`) | Task 10 (GitHubInstaller.vue)  | OK     |
| `installLocal(opts)`       | Task 6 (`preload/index.d.ts`) | Tasks 10, 11                   | OK     |
| `selectArchive()`          | Task 6 (`preload/index.d.ts`) | Task 11 (ArchiveInstaller.vue) | OK     |
| `extractArchive(path)`     | Task 6 (`preload/index.d.ts`) | Task 11 (ArchiveInstaller.vue) | OK     |
| `onGitHubDownloadProgress` | Task 6 (`preload/index.d.ts`) | Task 10 (GitHubInstaller.vue)  | OK     |

**No type inconsistencies found.**

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-16-extend-skill-search.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. Each task produces a focused, reviewable change.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

Which approach would you prefer?
