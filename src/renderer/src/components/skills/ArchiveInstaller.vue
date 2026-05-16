<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NText, useMessage, NIcon } from 'naive-ui'
import { ArchiveOutline } from '@vicons/ionicons5'
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
