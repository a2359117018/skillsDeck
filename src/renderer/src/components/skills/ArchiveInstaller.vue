<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { NText, NIcon, useMessage } from 'naive-ui'
import { ArchiveOutline } from '@vicons/ionicons5'
import LocalInstallPanel from './LocalInstallPanel.vue'
import { useSkillInstall } from '@renderer/composables/useSkillInstall'
import type { ScannedSkill } from '../../../../shared/types'

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
const scannedSkills = ref<ScannedSkill[]>([])
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
