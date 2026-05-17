# 压缩包安装技能 UX 改进 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 改进压缩包安装技能的 UX — 添加拖拽支持、水平两栏布局、SKILL.md 名称提取、默认全选。

**Architecture:** 后端在 LocalSkillInstaller 中解析 SKILL.md frontmatter 提取真实技能名；前端将 ArchiveInstaller 改为拖拽区域 + 点击选择，LocalInstallPanel 改为水平两栏 grid 布局并默认全选。无新 IPC channel，无新依赖。

**Tech Stack:** Vue 3 SFC + TypeScript + Naive UI + Electron renderer drag events + Node.js fs

**注意：本项目无测试基础设施，所有验证通过 `npm run dev` 手动测试。**

---

## File Structure

| 文件                                                       | 职责                                      | 操作 |
| ---------------------------------------------------------- | ----------------------------------------- | ---- |
| `src/main/services/LocalSkillInstaller.ts`                 | SKILL.md frontmatter 解析，提取真实技能名 | 修改 |
| `src/renderer/src/components/skills/ArchiveInstaller.vue`  | 拖拽区域 + 点击选择，替代旧按钮           | 重写 |
| `src/renderer/src/components/skills/LocalInstallPanel.vue` | 水平两栏 grid 布局 + 默认全选             | 修改 |

---

### Task 1: SKILL.md 名称提取（后端）

**Files:**

- Modify: `src/main/services/LocalSkillInstaller.ts:36-49`（`scanDir` 方法）

**Context:** 当前 `scanDir()` 在发现 `SKILL.md` 后，直接用 `path.basename(currentPath)` 作为技能名。解压到临时目录后，目录名类似 `skills-archive-xxx/find-skills-0.1.0/find-skills/`，显示为 `find-skills` 是正确的（取最内层目录名），但如果压缩包结构不同，名称就会出错。改为从 SKILL.md frontmatter 的 `name` 字段提取，确保名称正确。

- [ ] **Step 1: 添加 `extractSkillName` 私有方法**

在 `LocalSkillInstaller.ts` 中，`scanDir` 方法之前添加新方法：

```typescript
/**
 * 从 SKILL.md frontmatter 提取技能名。
 * 解析 `---` 之间的 YAML，查找 `name:` 字段。
 * 若解析失败或无 name 字段，回退到目录名。
 */
private extractSkillName(skillMdPath: string, fallbackName: string): string {
  try {
    const content = fs.readFileSync(skillMdPath, 'utf-8')
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return fallbackName
    const nameMatch = frontmatterMatch[1].match(/^name:\s*['"]?(.+?)['"]?\s*$/m)
    return nameMatch ? nameMatch[1].trim() : fallbackName
  } catch {
    return fallbackName
  }
}
```

- [ ] **Step 2: 修改 `scanDir` 使用 `extractSkillName`**

将 `scanDir` 中发现 SKILL.md 后的逻辑从：

```typescript
results.push({
  name: path.basename(currentPath),
  path: currentPath,
  relativePath: path.relative(basePath, currentPath)
})
```

改为：

```typescript
const skillMdPath = path.join(currentPath, 'SKILL.md')
results.push({
  name: this.extractSkillName(skillMdPath, path.basename(currentPath)),
  path: currentPath,
  relativePath: path.relative(basePath, currentPath)
})
```

注意：需要将 `await fs.promises.access(path.join(currentPath, 'SKILL.md'))` 的路径提取为变量，以便复用。

完整改动后的 `scanDir` 方法：

```typescript
private async scanDir(
  currentPath: string,
  basePath: string,
  depth: number,
  maxDepth: number,
  results: ScannedSkill[]
): Promise<void> {
  if (depth > maxDepth) return

  const skillMdPath = path.join(currentPath, 'SKILL.md')
  try {
    await fs.promises.access(skillMdPath)
    results.push({
      name: this.extractSkillName(skillMdPath, path.basename(currentPath)),
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
```

- [ ] **Step 3: 验证**

Run: `npm run typecheck`
Expected: 无类型错误

Run: `npm run dev`
手动测试：选择一个压缩包（如 `find-skills-0.1.0.zip`），确认扫描结果显示的技能名来自 SKILL.md 的 `name` 字段，而非目录名。

- [ ] **Step 4: Commit**

```bash
git add src/main/services/LocalSkillInstaller.ts
git commit -m "feat: extract skill name from SKILL.md frontmatter"
```

---

### Task 2: 拖拽区域（ArchiveInstaller.vue）

**Files:**

- Modify: `src/renderer/src/components/skills/ArchiveInstaller.vue`

**Context:** 当前只有"选择压缩包"按钮，需要添加拖拽区域。拖拽文件通过 `e.dataTransfer.files[0].path` 获取本地路径，直接传给已有的 `skills:extract-archive` IPC channel。无需新 IPC。

- [ ] **Step 1: 重写 ArchiveInstaller.vue**

完全替换 `ArchiveInstaller.vue` 的内容：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { NText, NIcon, useMessage } from 'naive-ui'
import { ArchiveOutline } from '@vicons/ionicons5'
import type { ScannedSkill } from '../../../../shared/types'
import LocalInstallPanel from './LocalInstallPanel.vue'

const emit = defineEmits<{
  installComplete: []
}>()

const message = useMessage()
const selectedFile = ref('')
const extracting = ref(false)
const scannedSkills = ref<ScannedSkill[]>([])
const error = ref<string | null>(null)
const isDragging = ref(false)

/** 处理拖拽进入 */
function handleDragEnter(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

/** 处理拖拽离开 */
function handleDragLeave(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false
}

/** 处理拖拽悬停 */
function handleDragOver(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
}

/** 处理拖拽释放 */
async function handleDrop(e: DragEvent): Promise<void> {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false

  const file = e.dataTransfer?.files[0]
  if (!file) return

  const filePath = (file as File & { path: string }).path
  if (!filePath) {
    message.error('无法获取文件路径')
    return
  }

  const ext = filePath.slice(filePath.lastIndexOf('.'))
  if (!['.zip', '.gz', '.tgz'].includes(ext) && !filePath.endsWith('.tar.gz')) {
    message.error('不支持的文件格式，仅支持 .zip .tar.gz .tgz')
    return
  }

  selectedFile.value = filePath
  await extractArchive()
}

/** 点击拖拽区域，触发文件选择对话框 */
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

/** 解压并扫描压缩包 */
async function extractArchive(): Promise<void> {
  if (!selectedFile.value) return
  extracting.value = true
  error.value = null
  scannedSkills.value = []
  try {
    const result = await window.api.skills.extractArchive(selectedFile.value)
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    scannedSkills.value = result.data
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
        <NIcon :size="28" :color="isDragging ? '#1456f0' : '#9ca3af'">
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
      :loading="extracting"
      :error="error"
      @install-complete="emit('installComplete')"
    />
  </div>
</template>

<style scoped>
.archive-installer {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.drop-zone {
  border: 2px dashed var(--color-hairline);
  border-radius: var(--radius-xl);
  padding: var(--space-xl) var(--space-lg);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-base);
  background: var(--color-canvas);
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

- [ ] **Step 2: 禁用 Electron 默认拖拽行为**

确认 `src/main/index.ts` 的 webPreferences 中 `webSecurity` 未阻止 `file://` 路径访问。Electron renderer 中 `File.path` 属性在非沙箱模式下可用。

如果渲染进程使用了 `nodeIntegration: false`（当前项目配置），拖拽获取的 `file.path` 应该仍然可用，因为 preload 通过 `contextBridge` 暴露了 API，而拖拽事件是在 renderer 中直接处理的。

- [ ] **Step 3: 验证**

Run: `npm run typecheck`
Expected: 无类型错误

Run: `npm run dev`
手动测试：

1. 拖拽一个 `.zip` 文件到虚线框区域 → 应高亮并自动解压扫描
2. 点击虚线框 → 应弹出文件选择对话框
3. 拖拽非压缩文件 → 应显示错误提示

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/skills/ArchiveInstaller.vue
git commit -m "feat: add drag-drop zone for archive import"
```

---

### Task 3: 水平两栏布局 + 默认全选（LocalInstallPanel.vue）

**Files:**

- Modify: `src/renderer/src/components/skills/LocalInstallPanel.vue`

**Context:** 当前 LocalInstallPanel 是垂直堆叠布局，技能列表和安装目标上下排列。改为水平两栏 grid，并将技能和全局安装默认全选。

- [ ] **Step 1: 修改默认选中逻辑**

在 `LocalInstallPanel.vue` 中，将 `selectedSkills` 和 `isGlobal` 的初始化改为全选：

将：

```typescript
const selectedSkills = ref<string[]>([])
const selectedAgents = ref<string[]>([])
const isGlobal = ref(false)
```

改为：

```typescript
const selectedSkills = ref<string[]>([])
const selectedAgents = ref<string[]>([])
const isGlobal = ref(true)
```

将 watch 中的重置逻辑也改为默认全选：

```typescript
watch(
  () => props.skills,
  () => {
    selectedSkills.value = props.skills.map((s) => s.path)
    selectedAgents.value = []
    isGlobal.value = true
    installing.value = false
    installResult.value = null
  },
  { deep: true }
)
```

- [ ] **Step 2: 修改模板为水平两栏 grid**

将 `<template>` 中 `.panel-content` 内的两个 `.panel-section` 从垂直堆叠改为水平 grid：

```vue
<div v-else-if="skills.length > 0" class="panel-content">
  <div class="panel-grid">
    <div class="panel-section">
      <NText depth="3" class="section-title">扫描到的技能</NText>
      <SkillScanResult v-model:model-value="selectedSkills" :skills="skills" />
    </div>

    <div class="panel-section">
      <NText depth="3" class="section-title">安装目标</NText>
      <AgentSelector v-model:model-value="selectedAgents" v-model:is-global="isGlobal" />
    </div>
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
```

- [ ] **Step 3: 更新 CSS 为 grid 两栏**

替换 `<style scoped>` 内容：

```css
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
  background: var(--color-error-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-error);
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

@media (max-width: 640px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }
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
```

- [ ] **Step 4: 验证**

Run: `npm run typecheck`
Expected: 无类型错误

Run: `npm run dev`
手动测试：

1. 拖入或选择一个压缩包
2. 确认扫描到的技能和安装目标左右并排显示
3. 确认技能默认全选、全局安装默认选中
4. 确认点击安装按钮可正常安装
5. 缩小窗口宽度到 640px 以下，确认自动回退到垂直堆叠

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/skills/LocalInstallPanel.vue
git commit -m "feat: horizontal two-column layout with default select all"
```

---

### Task 4: 全流程验证

- [ ] **Step 1: 完整流程测试**

Run: `npm run dev`

完整流程：

1. 打开压缩包安装页面
2. 拖拽一个包含多个技能的 `.zip` 文件到拖拽区域
3. 确认技能名来自 SKILL.md（而非临时目录名）
4. 确认所有技能默认选中
5. 确认全局安装默认选中
6. 确认左右两栏布局正常
7. 点击"安装选中技能"
8. 确认安装成功

再测试：

1. 点击拖拽区域触发文件选择对话框
2. 拖拽一个非压缩文件 → 应显示错误提示
3. 窗口缩小时确认回退到垂直布局

- [ ] **Step 2: 最终 lint 和 typecheck**

Run: `npm run typecheck && npm run lint`
Expected: 无错误

- [ ] **Step 3: Commit（如有 lint 修复）**

```bash
git add -A
git commit -m "chore: lint fixes for archive installer UX"
```
