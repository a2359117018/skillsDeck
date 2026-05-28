<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NIcon, NText, NProgress, useDialog } from 'naive-ui'
import RefreshOutline from '@vicons/ionicons5/RefreshOutline'
import CheckmarkOutline from '@vicons/ionicons5/CheckmarkOutline'
import CloseOutline from '@vicons/ionicons5/CloseOutline'
import { useEnvStore } from '../../stores/env'
import { useNotify } from '../../composables/useNotify'
import { useConfirm } from '../../composables/useConfirm'
import { useTaskStore } from '../../stores/tasks'

const envStore = useEnvStore()
const taskStore = useTaskStore()
const notify = useNotify()
const dialog = useDialog()
const { confirmUpdateEnv } = useConfirm()

const envDownloading = ref(false)
const envDownloadProgress = ref(0)
const skillsInstalling = ref(false)

async function handleInstallNode(): Promise<void> {
  envDownloading.value = true
  envDownloadProgress.value = 0
  const cleanup = window.api.env.onDownloadProgress((percent) => {
    envDownloadProgress.value = percent
  })
  try {
    const result = await window.api.env.installNode()
    if (!result.success) throw new Error(result.error)
    notify.success('Node.js 安装成功')
    await envStore.check()
  } catch (e) {
    if (e instanceof Error && e.message === '下载已取消') {
      notify.info('下载已取消')
    } else {
      notify.error(e instanceof Error ? e.message : 'Node.js 安装失败')
    }
  } finally {
    envDownloading.value = false
    cleanup()
  }
}

async function handleCancelInstallNode(): Promise<void> {
  await window.api.env.cancelInstallNode()
}

async function handleInstallSkills(): Promise<void> {
  skillsInstalling.value = true
  try {
    const result = await window.api.env.installSkills()
    if (!result.success) throw new Error(result.error || '安装失败')
    notify.success('skills CLI 安装成功')
    await envStore.check()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'skills CLI 安装失败')
  } finally {
    skillsInstalling.value = false
  }
}

async function handleEnvRecheck(): Promise<void> {
  try {
    await envStore.check()
    const s = envStore.status
    if (!s?.nodeInstalled) {
      dialog.warning({
        title: '缺少运行环境',
        content: '未检测到 Node.js，需要安装后才能使用技能管理功能。',
        positiveText: '安装 Node.js',
        negativeText: '稍后',
        onPositiveClick: () => handleInstallNode()
      })
    } else if (!s?.skillsInstalled) {
      dialog.info({
        title: '缺少技能管理工具',
        content: '未检测到 skills CLI，需要安装后才能管理技能。',
        positiveText: '安装 skills CLI',
        negativeText: '稍后',
        onPositiveClick: () => handleInstallSkills()
      })
    } else {
      notify.success('环境检测完成，所有组件就绪')
    }
  } catch {
    notify.error('环境检测失败，请重试')
  }
}

async function handleUpdateSkills(): Promise<void> {
  const confirmed = await confirmUpdateEnv('skills', envStore.status?.skillsVersion || '')
  if (!confirmed) return
  taskStore
    .start('update-skills', {
      onSuccess: () => {
        notify.success('skills CLI 已更新')
        envStore.check()
      },
      onError: (err) => {
        notify.error(`skills CLI 更新失败: ${err}`)
      }
    })
    .catch((e) => {
      notify.info(e instanceof Error ? e.message : '启动更新失败')
    })
}
</script>

<template>
  <div
    class="env-checks-wrapper"
    :class="{
      'env-checks-wrapper--missing':
        !envStore.status?.nodeInstalled || !envStore.status?.skillsInstalled
    }"
  >
    <div class="env-checks-header">
      <NButton size="small" round :disabled="envStore.refreshing" @click="handleEnvRecheck">
        <template #icon>
          <NIcon :size="14"><RefreshOutline /></NIcon>
        </template>
        检测环境
      </NButton>
      <NText depth="3" class="env-checks-desc">
        需要 Node.js 和 skills CLI 才能安装和管理技能
      </NText>
    </div>
    <div class="env-checks">
      <div class="env-check-item">
        <div
          class="env-check-icon"
          :class="{
            success: envStore.status?.nodeInstalled,
            error: !envStore.status?.nodeInstalled
          }"
        >
          <NIcon :size="16">
            <component :is="envStore.status?.nodeInstalled ? CheckmarkOutline : CloseOutline" />
          </NIcon>
        </div>
        <div class="env-check-body">
          <NText class="env-check-name">Node.js</NText>
          <NText depth="3" class="env-check-version">{{
            envStore.status?.nodeVersion || '未安装'
          }}</NText>
        </div>
      </div>

      <div class="env-check-item">
        <div
          class="env-check-icon"
          :class="{
            success: envStore.status?.npmInstalled,
            error: !envStore.status?.npmInstalled
          }"
        >
          <NIcon :size="16">
            <component :is="envStore.status?.npmInstalled ? CheckmarkOutline : CloseOutline" />
          </NIcon>
        </div>
        <div class="env-check-body">
          <NText class="env-check-name">npm</NText>
          <NText depth="3" class="env-check-version">{{
            envStore.status?.npmVersion || '未安装'
          }}</NText>
        </div>
      </div>

      <div class="env-check-item">
        <div
          class="env-check-icon"
          :class="{
            success: envStore.status?.skillsInstalled,
            error: !envStore.status?.skillsInstalled
          }"
        >
          <NIcon :size="16">
            <component :is="envStore.status?.skillsInstalled ? CheckmarkOutline : CloseOutline" />
          </NIcon>
        </div>
        <div class="env-check-body">
          <NText class="env-check-name">skills</NText>
          <NText depth="3" class="env-check-version">{{
            envStore.status?.skillsVersion || '未安装'
          }}</NText>
        </div>
        <div v-if="envStore.status?.skillsInstalled" class="env-check-actions">
          <NButton size="tiny" round @click="handleUpdateSkills">
            <template #icon>
              <NIcon :size="12"><RefreshOutline /></NIcon>
            </template>
            更新
          </NButton>
        </div>
      </div>
    </div>

    <div v-if="envDownloading" class="env-actions">
      <div class="env-download-progress">
        <div class="env-progress-header">
          <NText depth="3" class="env-progress-label">正在下载 Node.js</NText>
          <NText depth="3" class="env-progress-percent">{{ envDownloadProgress }}%</NText>
        </div>
        <NProgress
          type="line"
          :percentage="envDownloadProgress"
          indicator-placement="inside"
          :height="8"
          :border-radius="4"
          :fill-border-radius="4"
        />
        <NButton size="small" round @click="handleCancelInstallNode"> 取消下载 </NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.env-checks {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.env-check-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  flex: 1;
  min-width: 140px;
}

.env-check-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition:
    background var(--transition-base),
    color var(--transition-base);
}

.env-check-icon.success {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.env-check-icon.error {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.env-check-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.env-check-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-left: auto;
}

.env-check-name {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink);
}

.env-check-version {
  font-size: var(--text-caption);
}

.env-actions {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.env-download-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.env-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.env-progress-label {
  font-size: var(--text-caption);
}

.env-progress-percent {
  font-size: var(--text-caption);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.env-checks-wrapper {
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.env-checks-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.env-checks-desc {
  font-size: var(--text-body-sm);
}

.env-checks-wrapper--missing {
  background: var(--color-warning-bg);
  border-color: var(--color-warning-border);
}
</style>
