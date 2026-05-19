<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { NText, NIcon, NButton, NSpin, useNotification } from 'naive-ui'
import { ArchiveOutline } from '@vicons/ionicons5'
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

isGlobal.value = false

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
    isGlobal.value = false
    setTempDir(result.data.tempDir)
    if (result.data.skills.length === 0) {
      notification.info({
        title: '未扫描到技能文件',
        content: '未在压缩包中发现有效的技能文件',
        duration: 5000
      })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    notification.error({
      title: '解压扫描失败',
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
    <!-- Main two-column layout (always visible) -->
    <div class="archive-columns">
      <!-- Left column: drag zone + skill list -->
      <div class="column-left">
        <div
          :class="['drop-zone', { active: isDragging }]"
          role="button"
          tabindex="0"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
          @click="handleClickSelect"
          @keydown.enter="handleClickSelect"
          @keydown.space.prevent="handleClickSelect"
        >
          <div class="drop-zone-content">
            <NIcon :size="24" :color="isDragging ? DRAG_ACTIVE_COLOR : DRAG_DEFAULT_COLOR">
              <ArchiveOutline />
            </NIcon>
            <div class="drop-zone-text">
              <NText :depth="isDragging ? 1 : 3" style="font-weight: 500">
                {{ isDragging ? '释放以导入' : '拖拽或点击选择压缩包' }}
              </NText>
            </div>
          </div>
          <NText v-if="selectedFile" depth="3" class="selected-file">
            {{ selectedFile }}
          </NText>
        </div>

        <!-- Loading indicator inside left column -->
        <div v-if="extracting" class="archive-loading">
          <NSpin size="large" />
          <NText depth="3">正在解压扫描...</NText>
        </div>

        <div class="step-header">
          <span class="step-number">1</span>
          <span class="step-title">选择技能</span>
          <span v-if="hasScannedSkills" class="step-count">
            {{ selectedSkills.length }} / {{ scannedSkills.length }}
          </span>
        </div>

        <div class="skill-list-area">
          <SkillScanResult
            :skills="scannedSkills"
            :model-value="selectedSkills"
            @update:model-value="selectedSkills = $event"
          />
        </div>
      </div>

      <!-- Right column: agent selector + install button -->
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

        <div class="column-actions">
          <NButton
            type="primary"
            :disabled="!canInstall || installing"
            :loading="installing"
            round
            block
            @click="handleInstall"
          >
            安装选中技能 ({{ selectedSkills.length }})
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
  gap: var(--space-lg);
  height: 100%;
}

.archive-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) 0;
  flex-shrink: 0;
}

.archive-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

.drop-zone {
  border: 2px dashed var(--color-hairline);
  border-radius: var(--radius-xl);
  padding: var(--space-md) var(--space-lg);
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
  gap: var(--space-xxs);
}

.drop-zone-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selected-file {
  display: block;
  margin-top: var(--space-xs);
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

.column-actions {
  flex-shrink: 0;
}
</style>
