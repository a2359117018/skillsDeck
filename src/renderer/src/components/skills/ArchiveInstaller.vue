<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { NText, NIcon, NButton, NSpin, useNotification } from 'naive-ui'
import ArchiveOutline from '@vicons/ionicons5/ArchiveOutline'
import SkillScanResult from './SkillScanResult.vue'
import AgentSelector from './AgentSelector.vue'
import { useSkillInstall } from '@renderer/composables/useSkillInstall'
import type { ScannedSkill } from '../../../../shared/types'

const emit = defineEmits<{
  installComplete: []
}>()

const notification = useNotification()

const {
  selectedSkills,
  selectedAgents,
  isGlobal,
  installing,
  canInstall,
  setSkills,
  setTempDir,
  install,
  cleanup
} = useSkillInstall()

const selectedFile = ref('')
const extracting = ref(false)
const scannedSkills = ref<ScannedSkill[]>([])
const error = ref<string | null>(null)
const isDragging = ref(false)

const hasScannedSkills = computed(() => scannedSkills.value.length > 0)

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
    notification.warning({
      title: '不支持的文件格式',
      content: '仅支持 .zip .tar.gz .tgz 格式',
      duration: 5000
    })
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
    notification.error({
      title: '选择文件失败',
      content: error.value,
      duration: 0
    })
  }
}

async function extractArchive(): Promise<void> {
  if (!selectedFile.value) return

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
      notification.info({
        title: '未发现技能文件',
        content: '该压缩包中没有有效的技能文件',
        duration: 5000
      })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    notification.error({
      title: '解压或扫描失败',
      content: error.value,
      duration: 0
    })
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

defineExpose({ cleanup })

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div class="archive-installer">
    <div class="archive-columns">
      <!-- Left column -->
      <div class="column-left">
        <!-- Input card: matches GitHubInstaller's input-card structure -->
        <div class="input-card">
          <div class="input-card-header">
            <!-- 装饰性图标，对屏幕阅读器隐藏 -->
            <NIcon :size="16" color="var(--color-ink)" aria-hidden="true">
              <ArchiveOutline />
            </NIcon>
            <NText class="input-card-title">从压缩包导入技能</NText>
          </div>

          <div
            :class="['drop-zone', { active: isDragging }]"
            role="button"
            tabindex="0"
            aria-label="选择或拖拽压缩包文件"
            @dragenter="handleDragEnter"
            @dragleave="handleDragLeave"
            @dragover="handleDragOver"
            @drop="handleDrop"
            @click="handleClickSelect"
            @keydown.enter="handleClickSelect"
            @keydown.space.prevent="handleClickSelect"
          >
            <div class="drop-zone-content">
              <NIcon :size="20" :color="isDragging ? DRAG_ACTIVE_COLOR : DRAG_DEFAULT_COLOR">
                <ArchiveOutline />
              </NIcon>
              <NText :depth="isDragging ? 1 : 3" style="font-weight: 500">
                {{ isDragging ? '松开鼠标以导入文件' : '拖拽或点击选择压缩包' }}
              </NText>
            </div>
            <NText v-if="selectedFile" depth="3" class="selected-file">
              {{ selectedFile }}
            </NText>
          </div>

          <!-- Inline extracting indicator (matches GitHub's inline-progress) -->
          <div v-if="extracting" class="inline-progress">
            <div class="inline-progress-footer">
              <NText depth="3" class="inline-progress-hint">
                <NSpin :size="14" style="margin-right: var(--space-xs)" />
                正在解压并扫描文件...
              </NText>
              <NButton size="tiny" round @click="extracting = false">取消</NButton>
            </div>
          </div>
        </div>

        <!-- Step 1 -->
        <div class="step-header">
          <span class="step-number">1</span>
          <h3 class="step-title">选择技能</h3>
          <span v-if="hasScannedSkills" class="step-count">
            {{ selectedSkills.length }} / {{ scannedSkills.length }}
          </span>
        </div>

        <!-- Skill list area -->
        <div class="skill-list-area">
          <SkillScanResult
            :skills="scannedSkills"
            :model-value="selectedSkills"
            @update:model-value="selectedSkills = $event"
          />
        </div>
      </div>

      <!-- Right column -->
      <div class="column-right">
        <div class="step-header">
          <span class="step-number">2</span>
          <h3 class="step-title">选择安装目标</h3>
        </div>

        <div class="agent-area">
          <AgentSelector
            :model-value="selectedAgents"
            :is-global="isGlobal"
            @update:model-value="selectedAgents = $event"
            @update:is-global="isGlobal = $event"
          />
        </div>

        <!-- Compact action bar (matches GitHubInstaller) -->
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
  </div>
</template>

<style scoped>
.archive-installer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.archive-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  grid-template-rows: minmax(0, 1fr);
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
  padding-bottom: var(--space-lg);
}

/* --- Input card (matches GitHubInstaller) --- */
.input-card {
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  flex-shrink: 0;
  min-height: 120px;
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

/* --- Drop zone (inside input-card) --- */
.drop-zone {
  border: 2px dashed var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  text-align: center;
  cursor: pointer;
  transition:
    border-color var(--transition-base),
    background var(--transition-base);
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xxs);
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
  align-items: center;
  gap: var(--space-xs);
}

.selected-file {
  display: block;
  font-size: var(--text-micro);
  word-break: break-all;
}

/* --- Step header (shared) --- */
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
  max-height: 420px;
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
  padding-bottom: 2em;
}

.agent-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* --- Action bar (matches GitHubInstaller) --- */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) var(--space-sm);
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

/* --- Inline progress (matches GitHubInstaller) --- */
.inline-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxs);
}

.inline-progress-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.inline-progress-hint {
  font-size: var(--text-micro);
  display: flex;
  align-items: center;
}
</style>
