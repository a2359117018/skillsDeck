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
  NSpin,
  useMessage
} from 'naive-ui'
import type { GitHubParseResult, LocalInstallResult } from '../../../../shared/types'
import AgentSelector from './AgentSelector.vue'

const emit = defineEmits<{
  installComplete: []
}>()

const message = useMessage()
const url = ref('')
const parsing = ref(false)
const downloadProgress = ref(0)
const showProgress = ref(false)
const scanResult = ref<GitHubParseResult | null>(null)
const alertError = ref<string | null>(null)

const selectedSkills = ref<string[]>([])
const selectedAgents = ref<string[]>([])
const isGlobal = ref(false)
const installing = ref(false)
const installResult = ref<LocalInstallResult | null>(null)

let removeProgressListener: (() => void) | null = null

const skills = computed(() => scanResult.value?.skills ?? [])

const allSkillsSelected = computed(
  () => skills.value.length > 0 && skills.value.every((s) => selectedSkills.value.includes(s.path))
)

const someSkillsSelected = computed(
  () => skills.value.some((s) => selectedSkills.value.includes(s.path)) && !allSkillsSelected.value
)

const canInstall = computed(() => {
  if (selectedSkills.value.length === 0) return false
  if (isGlobal.value) return true
  return selectedAgents.value.length > 0
})

function clearAlert(): void {
  alertError.value = null
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

async function cleanupPreviousTemp(): Promise<void> {
  if (scanResult.value?.tempDir) {
    try {
      await window.api.skills.cleanupTemp([scanResult.value.tempDir])
    } catch {
      // ignore cleanup errors
    }
    scanResult.value = null
    selectedSkills.value = []
    installResult.value = null
  }
}

async function handleParse(): Promise<void> {
  if (!url.value.trim()) {
    message.warning('请输入 GitHub 仓库链接')
    return
  }

  await cleanupPreviousTemp()

  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  parsing.value = true
  clearAlert()
  downloadProgress.value = 0
  showProgress.value = true
  installResult.value = null

  removeProgressListener = window.api.skills.onGitHubDownloadProgress((percent) => {
    downloadProgress.value = percent
  })

  try {
    const result = await window.api.skills.parseGitHub(url.value.trim())
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    scanResult.value = result.data
    if (result.data.skills.length === 0) {
      message.info('未在仓库中扫描到技能文件')
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
  if (!canInstall.value) {
    message.warning('请选择要安装的技能和目标 agent')
    return
  }
  installing.value = true
  clearAlert()
  installResult.value = null
  try {
    const result = await window.api.skills.installLocal({
      skillDirs: [...selectedSkills.value],
      agents: isGlobal.value ? [] : [...selectedAgents.value]
    })
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    installResult.value = result.data
    // 安装完成后清理临时目录（无论成功或失败，后端已处理文件复制）
    if (scanResult.value?.tempDir) {
      window.api.skills.cleanupTemp([scanResult.value.tempDir]).catch(() => {})
      scanResult.value = { ...scanResult.value, tempDir: '' }
    }
    if (result.data.failed.length > 0) {
      alertError.value = `安装完成：${result.data.success.length} 个成功，${result.data.failed.length} 个失败`
    } else {
      message.success(`成功安装 ${result.data.success.length} 个技能`)
    }
    emit('installComplete')
  } catch (e) {
    alertError.value = e instanceof Error ? e.message : String(e)
  } finally {
    installing.value = false
  }
}

onUnmounted(() => {
  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  if (scanResult.value?.tempDir) {
    window.api.skills.cleanupTemp([scanResult.value.tempDir]).catch(() => {})
  }
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

@media (max-width: 640px) {
  .split-layout {
    grid-template-columns: 1fr;
  }
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
  touch-action: pan-y;
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
