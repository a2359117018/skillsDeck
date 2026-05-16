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
