<script setup lang="ts">
import { ref } from 'vue'
import { NText, NIcon, useMessage } from 'naive-ui'
import { ArchiveOutline } from '@vicons/ionicons5'
import type { ScannedSkill } from '../../../../shared/types'
import LocalInstallPanel from './LocalInstallPanel.vue'

/** 压缩包安装组件 - 支持拖拽导入和点击选择 */
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
  const dropZone = e.currentTarget as HTMLElement
  const related = e.relatedTarget as Node | null
  if (related && dropZone.contains(related)) return
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

  const filePath = window.api.getPathForFile(file)

  const supportedExt = ['.zip', '.tar.gz', '.tgz']
  if (!supportedExt.some((ext) => filePath.endsWith(ext))) {
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
