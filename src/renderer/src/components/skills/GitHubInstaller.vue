<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { NInput, NButton, NText, NProgress, useNotification } from 'naive-ui'
import type { GitHubParseResult, ParsedGitHubUrl } from '../../../../shared/types'
import SkillScanResult from './SkillScanResult.vue'
import AgentSelector from './AgentSelector.vue'
import LocalInstallerLayout from './LocalInstallerLayout.vue'
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
  canInstall,
  setSkills,
  setTempDir,
  install,
  cleanup
} = useSkillInstall()

const url = ref('')
const parsing = ref(false)
const downloadProgress = ref(0)
const scanResult = ref<GitHubParseResult | null>(null)
const parsedUrl = ref<ParsedGitHubUrl | null>(null)

let removeProgressListener: (() => void) | null = null

const skills = computed(() => scanResult.value?.skills ?? [])

const isParsed = computed(() => scanResult.value !== null)

async function handleParse(): Promise<void> {
  if (!url.value.trim()) return

  await cleanup()

  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  parsing.value = true
  downloadProgress.value = 0
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
    if (removeProgressListener) {
      removeProgressListener()
      removeProgressListener = null
    }
  }
}

function handleCancel(): void {
  window.api.skills.cancelGitHubDownload()
  parsing.value = false
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

defineExpose({ cleanup })

onUnmounted(() => {
  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  cleanup()
})
</script>

<template>
  <LocalInstallerLayout
    :skill-count="skills.length"
    :selected-count="selectedSkills.length"
    :installing="installing"
    :can-install="canInstall"
    @install="handleInstall"
  >
    <template #input>
      <div class="input-card-header">
        <!-- 装饰性 GitHub 图标，对屏幕阅读器隐藏 -->
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="var(--color-ink)"
          class="github-icon"
          aria-hidden="true"
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
          round
          :disabled="parsing || !url.trim()"
          @click="handleParse"
        >
          分析仓库
        </NButton>
        <NButton v-else round @click="handleReparse"> 重新分析 </NButton>
      </div>
      <!-- Inline download progress -->
      <div v-if="parsing" class="inline-progress">
        <NProgress
          type="line"
          :percentage="downloadProgress"
          :show-indicator="true"
          :height="6"
          status="default"
        />
        <div class="inline-progress-footer">
          <NText depth="3" class="inline-progress-hint">
            {{ downloadProgress < 100 ? '正在下载...' : '正在扫描技能...' }}
          </NText>
          <NButton size="tiny" round @click="handleCancel">取消</NButton>
        </div>
      </div>
    </template>

    <template #skill-list>
      <SkillScanResult
        :skills="skills"
        :model-value="selectedSkills"
        @update:model-value="selectedSkills = $event"
      />
    </template>

    <template #agent-selector>
      <AgentSelector
        :model-value="selectedAgents"
        :is-global="isGlobal"
        @update:model-value="selectedAgents = $event"
        @update:is-global="isGlobal = $event"
      />
    </template>
  </LocalInstallerLayout>
</template>

<style scoped>
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

.input-row :deep(.n-input) {
  flex: 1;
}

.github-icon {
  flex-shrink: 0;
}
</style>
