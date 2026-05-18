<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import {
  NInput,
  NButton,
  NProgress,
  NText,
  NAlert,
  NCheckbox,
  NSpace,
  NSpin
} from 'naive-ui'
import type { GitHubParseResult } from '../../../../shared/types'
import AgentSelector from './AgentSelector.vue'
import { useSkillInstall } from '@renderer/composables/useSkillInstall'

const emit = defineEmits<{
  installComplete: []
}>()

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
  cleanup,
  resetResult
} = useSkillInstall()

const url = ref('')
const parsing = ref(false)
const downloadProgress = ref(0)
const showProgress = ref(false)
const scanResult = ref<GitHubParseResult | null>(null)
const alertError = ref<string | null>(null)

let removeProgressListener: (() => void) | null = null

const skills = computed(() => scanResult.value?.skills ?? [])

const allSkillsSelected = computed(
  () => skills.value.length > 0 && skills.value.every((s) => selectedSkills.value.includes(s.path))
)

const someSkillsSelected = computed(
  () =>
    skills.value.some((s) => selectedSkills.value.includes(s.path)) && !allSkillsSelected.value
)

function clearAlert(): void {
  alertError.value = null
}

function closeInstallResult(): void {
  resetResult()
}

function toggleAllSkills(): void {
  if (allSkillsSelected.value) {
    selectedSkills.value = []
  } else {
    selectedSkills.value = skills.value.map((s) => s.path)
  }
}

function toggleSkill(path: string): void {
  const current = [...selectedSkills.value]
  const idx = current.indexOf(path)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(path)
  }
  selectedSkills.value = current
}

async function handleParse(): Promise<void> {
  if (!url.value.trim()) {
    return
  }

  // 清理旧的临时目录
  await cleanup()

  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  parsing.value = true
  clearAlert()
  downloadProgress.value = 0
  showProgress.value = true
  resetResult()

  removeProgressListener = window.api.skills.onGitHubDownloadProgress((percent) => {
    downloadProgress.value = percent
  })

  try {
    const result = await window.api.skills.parseGitHub(url.value.trim())
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    scanResult.value = result.data
    setSkills(result.data.skills)
    setTempDir(result.data.tempDir)
    if (result.data.skills.length === 0) {
      alertError.value = '未在仓库中扫描到技能文件'
    }
  } catch (e) {
    alertError.value = e instanceof Error ? e.message : String(e)
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

    <NAlert v-if="alertError" type="error" closable class="error-alert" @close="clearAlert">
      {{ alertError }}
    </NAlert>

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

    <div v-else-if="parsing" class="panel-loading">
      <NSpin size="large" />
      <NText depth="3">正在处理...</NText>
    </div>

    <div v-else-if="skills.length > 0" class="split-layout">
      <div class="split-left">
        <div class="section-card">
          <NText depth="3" class="section-title">扫描到的技能</NText>
          <div class="scan-header">
            <NCheckbox
              :checked="allSkillsSelected"
              :indeterminate="someSkillsSelected"
              @update:checked="toggleAllSkills"
            >
              全选 ({{ selectedSkills.length }} / {{ skills.length }})
            </NCheckbox>
          </div>
          <div class="scan-list">
            <NSpace vertical :size="8">
              <div v-for="skill in skills" :key="skill.path" class="scan-item">
                <NCheckbox
                  :checked="selectedSkills.includes(skill.path)"
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
        </div>
      </div>

      <div class="split-right">
        <div class="section-card">
          <NText depth="3" class="section-title">安装目标</NText>
          <AgentSelector v-model:model-value="selectedAgents" v-model:is-global="isGlobal" />
          <div class="install-actions">
            <NButton
              type="primary"
              :disabled="!canInstall || installing"
              :loading="installing"
              @click="handleInstall"
            >
              安装选中技能
            </NButton>
          </div>
        </div>
      </div>
    </div>

    <!-- 安装结果浮动面板 -->
    <div v-if="installResult" class="result-overlay" @click="closeInstallResult">
      <div class="result-toast" @click.stop>
        <div class="result-header">
          <NText strong>安装结果</NText>
          <NButton text size="tiny" @click="closeInstallResult">关闭</NButton>
        </div>
        <div class="result-body">
          <div v-if="installResult.success.length > 0" class="result-success">
            <NText type="success">成功 ({{ installResult.success.length }}):</NText>
            <div class="result-list">{{ installResult.success.join(', ') }}</div>
          </div>
          <div v-if="installResult.failed.length > 0" class="result-fail">
            <NText type="error">失败 ({{ installResult.failed.length }}):</NText>
            <div v-for="f in installResult.failed" :key="f.name" class="fail-item">
              <NText type="error">{{ f.name }}: {{ f.error }}</NText>
            </div>
          </div>
        </div>
      </div>
    </div>
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

.error-alert {
  border-radius: var(--radius-md);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.panel-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) 0;
}

.split-layout {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: var(--space-lg);
  align-items: stretch;
}

.split-left,
.split-right {
  display: flex;
  flex-direction: column;
}

.section-card {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-hairline);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: var(--space-sm);
  display: block;
}

.scan-header {
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-hairline);
}

.scan-list {
  flex: 1;
  min-height: 0;
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

.install-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-md);
}

.result-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  z-index: 2000;
}

.result-toast {
  min-width: 360px;
  max-width: 480px;
  max-height: 500px;
  overflow-y: auto;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-hairline);
}

.result-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.result-success .result-list {
  margin-top: var(--space-xs);
  font-size: 13px;
  color: var(--color-success);
}

.result-fail {
  margin-top: var(--space-xs);
}

.fail-item {
  margin-top: var(--space-xs);
  font-size: 13px;
}
</style>
