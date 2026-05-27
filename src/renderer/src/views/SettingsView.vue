<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import type { VNodeChild, Component } from 'vue'
import {
  NCard,
  NForm,
  NFormItem,
  NSelect,
  NSwitch,
  NButton,
  NIcon,
  NInput,
  NText,
  NProgress,
  NAlert,
  useDialog,
  type SelectOption
} from 'naive-ui'
import RefreshOutline from '@vicons/ionicons5/RefreshOutline'
import SettingsOutline from '@vicons/ionicons5/SettingsOutline'
import LinkOutline from '@vicons/ionicons5/LinkOutline'
import UnlinkOutline from '@vicons/ionicons5/UnlinkOutline'
import PencilOutline from '@vicons/ionicons5/PencilOutline'
import CheckmarkCircleOutline from '@vicons/ionicons5/CheckmarkCircleOutline'
import CheckmarkOutline from '@vicons/ionicons5/CheckmarkOutline'
import CloseOutline from '@vicons/ionicons5/CloseOutline'
import { useSettingsStore } from '../stores/settings'
import { useEnvStore } from '../stores/env'
import { useTaskStore } from '../stores/tasks'
import { useConfirm } from '../composables/useConfirm'
import { useNotify } from '../composables/useNotify'

interface ProxyOption extends SelectOption {
  icon?: Component
}

const settingsStore = useSettingsStore()
const envStore = useEnvStore()
const taskStore = useTaskStore()
const notify = useNotify()
const dialog = useDialog()
const { confirmUpdateEnv } = useConfirm()

const envDownloading = ref(false)
const envDownloadProgress = ref(0)

const isLoaded = ref(false)
const originalSettings = ref<{
  autoCheckEnv: boolean
  proxyUrl: string
  npmRegistry: string
  closeAction: 'ask' | 'tray' | 'quit'
}>({
  autoCheckEnv: true,
  proxyUrl: '',
  npmRegistry: '',
  closeAction: 'ask'
})

const CUSTOM_PROXY_VALUE = '__custom__'

const proxyOptions = [
  { label: '不使用代理', value: '', icon: UnlinkOutline },
  { label: 'gh-proxy.org', value: 'https://gh-proxy.org', icon: LinkOutline },
  { label: 'hk.gh-proxy.org', value: 'https://hk.gh-proxy.org', icon: LinkOutline },
  { label: 'cdn.gh-proxy.org', value: 'https://cdn.gh-proxy.org', icon: LinkOutline },
  { label: 'edgeone.gh-proxy.org', value: 'https://edgeone.gh-proxy.org', icon: LinkOutline },
  { label: '自定义...', value: CUSTOM_PROXY_VALUE, icon: PencilOutline }
]

const selectedProxy = ref('')
const customProxyUrl = ref('')

const CUSTOM_REGISTRY_VALUE = '__custom_registry__'

const registryOptions = [
  { label: '不使用镜像', value: '', icon: UnlinkOutline },
  { label: '淘宝 (npmmirror.com)', value: 'https://registry.npmmirror.com/', icon: LinkOutline },
  {
    label: '清华大学 (tuna.tsinghua.edu.cn)',
    value: 'https://mirrors.tuna.tsinghua.edu.cn/npm/',
    icon: LinkOutline
  },
  {
    label: '腾讯云 (tencent.com)',
    value: 'https://mirrors.cloud.tencent.com/npm/',
    icon: LinkOutline
  },
  { label: '自定义...', value: CUSTOM_REGISTRY_VALUE, icon: PencilOutline }
]

const closeActionOptions = [
  { label: '每次询问', value: 'ask' },
  { label: '最小化到系统托盘', value: 'tray' },
  { label: '退出应用', value: 'quit' }
]

const selectedRegistry = ref('')
const customRegistryUrl = ref('')

onMounted(() => {
  envStore.check()
  taskStore.sync()
  settingsStore.load().then(() => {
    const stored = settingsStore.proxyUrl
    const preset = proxyOptions.find((o) => o.value === stored)
    if (preset && stored !== CUSTOM_PROXY_VALUE) {
      selectedProxy.value = stored
      customProxyUrl.value = ''
    } else if (stored && stored.startsWith('https://')) {
      selectedProxy.value = CUSTOM_PROXY_VALUE
      customProxyUrl.value = stored
    } else {
      selectedProxy.value = ''
      customProxyUrl.value = ''
    }

    const storedRegistry = settingsStore.npmRegistry
    const registryPreset = registryOptions.find((o) => o.value === storedRegistry)
    if (registryPreset && storedRegistry !== CUSTOM_REGISTRY_VALUE) {
      selectedRegistry.value = storedRegistry
      customRegistryUrl.value = ''
    } else if (storedRegistry && storedRegistry.startsWith('https://')) {
      selectedRegistry.value = CUSTOM_REGISTRY_VALUE
      customRegistryUrl.value = storedRegistry
    } else {
      selectedRegistry.value = ''
      customRegistryUrl.value = ''
    }

    originalSettings.value = {
      autoCheckEnv: settingsStore.autoCheckEnv,
      proxyUrl: effectiveProxyUrl.value,
      npmRegistry: effectiveRegistryUrl.value,
      closeAction: settingsStore.closeAction
    }
    isLoaded.value = true

    window.api.app.getVersion().then((v) => {
      appVersion.value = v
    })
  })
})

const showCustomInput = computed(() => selectedProxy.value === CUSTOM_PROXY_VALUE)

const showCustomRegistryInput = computed(() => selectedRegistry.value === CUSTOM_REGISTRY_VALUE)

const effectiveRegistryUrl = computed(() => {
  if (selectedRegistry.value === CUSTOM_REGISTRY_VALUE) {
    return customRegistryUrl.value.trim()
  }
  return selectedRegistry.value
})

const activeRegistryDisplay = computed(() => {
  if (selectedRegistry.value === CUSTOM_REGISTRY_VALUE) {
    return customRegistryUrl.value.trim() || '未填写'
  }
  if (selectedRegistry.value === '') {
    return '官方源'
  }
  const preset = registryOptions.find((o) => o.value === selectedRegistry.value)
  return preset?.label || selectedRegistry.value
})

const effectiveProxyUrl = computed(() => {
  if (selectedProxy.value === CUSTOM_PROXY_VALUE) {
    return customProxyUrl.value.trim()
  }
  return selectedProxy.value
})

const activeProxyDisplay = computed(() => {
  if (selectedProxy.value === CUSTOM_PROXY_VALUE) {
    return customProxyUrl.value.trim() || '未设置'
  }
  if (selectedProxy.value === '') {
    return '不使用代理'
  }
  const preset = proxyOptions.find((o) => o.value === selectedProxy.value)
  return preset?.label || selectedProxy.value
})

function renderProxyIcon(option: ProxyOption, size: number): VNodeChild {
  const IconComp = option.icon || LinkOutline
  return h(NIcon, { size, color: 'var(--color-stone)' }, { default: () => h(IconComp) })
}

function renderProxyLabel(option: SelectOption): VNodeChild {
  const opt = option as ProxyOption
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
    renderProxyIcon(opt, 16),
    h('span', null, opt.label as string)
  ])
}

function renderProxyTag(props: { option: SelectOption; handleClose: () => void }): VNodeChild {
  const opt = props.option as ProxyOption
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
    renderProxyIcon(opt, 14),
    h('span', null, opt.label as string)
  ])
}

const hasUnsavedChanges = computed(() => {
  if (!isLoaded.value) return false
  return (
    settingsStore.autoCheckEnv !== originalSettings.value.autoCheckEnv ||
    effectiveProxyUrl.value !== originalSettings.value.proxyUrl ||
    effectiveRegistryUrl.value !== originalSettings.value.npmRegistry ||
    settingsStore.closeAction !== originalSettings.value.closeAction
  )
})

async function handleSave(): Promise<void> {
  if (
    showCustomInput.value &&
    customProxyUrl.value &&
    !customProxyUrl.value.trim().startsWith('https://')
  ) {
    notify.warning('自定义代理地址必须以 https:// 开头')
    return
  }
  if (
    showCustomRegistryInput.value &&
    customRegistryUrl.value &&
    !customRegistryUrl.value.trim().startsWith('https://')
  ) {
    notify.warning('自定义镜像地址必须以 https:// 开头')
    return
  }
  await settingsStore.save({
    autoCheckEnv: settingsStore.autoCheckEnv,
    proxyUrl: effectiveProxyUrl.value,
    npmRegistry: effectiveRegistryUrl.value,
    closeAction: settingsStore.closeAction
  })
  originalSettings.value = {
    autoCheckEnv: settingsStore.autoCheckEnv,
    proxyUrl: effectiveProxyUrl.value,
    npmRegistry: effectiveRegistryUrl.value,
    closeAction: settingsStore.closeAction
  }
  notify.success('设置已保存')
}

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

const skillsInstalling = ref(false)

const appVersion = ref('')
const updateChecking = ref(false)
const updateDownloading = ref(false)
const updateDownloaded = ref(false)

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

function handleCheckUpdate(): void {
  updateChecking.value = true
  updateDownloaded.value = false
  updateDownloading.value = false

  const cleanups: (() => void)[] = []
  let settled = false

  /** Remove all updater listeners. Safe to call multiple times. */
  function removeAll(): void {
    if (settled) return
    settled = true
    for (const fn of cleanups) fn()
  }

  cleanups.push(
    window.api.updater.onUpdateAvailable(() => {
      updateChecking.value = false
      updateDownloading.value = true
    })
  )

  cleanups.push(
    window.api.updater.onUpdateNotAvailable(() => {
      updateChecking.value = false
      notify.info('已是最新版本')
      removeAll()
    })
  )

  cleanups.push(
    window.api.updater.onDownloadProgress(() => {
      // download progress updates don't end the cycle
    })
  )

  cleanups.push(
    window.api.updater.onUpdateDownloaded(() => {
      updateDownloading.value = false
      updateDownloaded.value = true
      updateChecking.value = false
      notify.success('更新已下载，点击安装')
      removeAll()
    })
  )

  cleanups.push(
    window.api.updater.onError((message) => {
      updateChecking.value = false
      updateDownloading.value = false
      notify.error(`检查更新失败: ${message}`)
      removeAll()
    })
  )

  window.api.updater.check().catch(() => {
    updateChecking.value = false
    removeAll()
  })
}

async function handleInstallUpdate(): Promise<void> {
  await window.api.updater.installUpdate()
}

</script>

<template>
  <main class="settings-page">
    <!-- Page Header -->
    <div class="page-header">
      <NIcon :size="28" color="var(--color-ink)">
        <SettingsOutline />
      </NIcon>
      <div class="page-header-text">
        <h1 class="page-title">设置</h1>
        <NText depth="3" class="page-desc">调整应用设置、配置网络代理并管理技能更新</NText>
      </div>
    </div>

    <NCard class="settings-card">
      <NAlert v-if="hasUnsavedChanges" type="warning" :show-icon="false" class="unsaved-banner">
        您有未保存的更改
      </NAlert>

      <!-- 通用设置 -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-title">通用设置</span>
          <span class="section-line" />
        </div>
        <NForm label-placement="left" label-width="140" class="settings-form">
          <NFormItem label="启动时检查运行环境">
            <NSwitch v-model:value="settingsStore.autoCheckEnv" />
          </NFormItem>
          <NFormItem label="关闭时">
            <NSelect
              v-model:value="settingsStore.closeAction"
              :options="closeActionOptions"
              class="settings-select"
            />
          </NFormItem>
        </NForm>
      </div>

      <!-- 网络设置 -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-title">网络设置</span>
          <span class="section-line" />
        </div>
        <NForm label-placement="left" label-width="140" class="settings-form">
          <NFormItem label="GitHub 下载代理">
            <div class="proxy-field">
              <NSelect
                v-model:value="selectedProxy"
                :options="proxyOptions"
                :render-label="renderProxyLabel"
                :render-tag="renderProxyTag"
                class="settings-select"
              />
              <Transition name="expand">
                <div v-if="showCustomInput" class="custom-input-wrapper">
                  <NInput
                    v-model:value="customProxyUrl"
                    placeholder="https://your-proxy.com"
                    class="custom-proxy-input"
                  >
                    <template #prefix>
                      <NIcon :size="16" color="var(--color-muted)">
                        <PencilOutline />
                      </NIcon>
                    </template>
                  </NInput>
                </div>
              </Transition>
              <div class="proxy-active">
                <NIcon :size="14" color="var(--color-muted)">
                  <CheckmarkCircleOutline />
                </NIcon>
                <NText depth="3" class="proxy-active-text">
                  当前使用：{{ activeProxyDisplay }}
                </NText>
              </div>
            </div>
          </NFormItem>
          <NFormItem label="npm 镜像源">
            <div class="proxy-field">
              <NSelect
                v-model:value="selectedRegistry"
                :options="registryOptions"
                :render-label="renderProxyLabel"
                :render-tag="renderProxyTag"
                class="settings-select"
              />
              <Transition name="expand">
                <div v-if="showCustomRegistryInput" class="custom-input-wrapper">
                  <NInput
                    v-model:value="customRegistryUrl"
                    placeholder="https://your-mirror.com/npm/"
                    class="custom-proxy-input"
                  >
                    <template #prefix>
                      <NIcon :size="16" color="var(--color-muted)">
                        <PencilOutline />
                      </NIcon>
                    </template>
                  </NInput>
                </div>
              </Transition>
              <div class="proxy-active">
                <NIcon :size="14" color="var(--color-muted)">
                  <CheckmarkCircleOutline />
                </NIcon>
                <NText depth="3" class="proxy-active-text">
                  当前使用：{{ activeRegistryDisplay }}
                </NText>
              </div>
            </div>
          </NFormItem>
        </NForm>
      </div>

      <!-- 运行环境 -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-title">运行环境</span>
          <span class="section-line" />
        </div>
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
                  <component
                    :is="envStore.status?.nodeInstalled ? CheckmarkOutline : CloseOutline"
                  />
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
                  <component
                    :is="envStore.status?.npmInstalled ? CheckmarkOutline : CloseOutline"
                  />
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
                  <component
                    :is="envStore.status?.skillsInstalled ? CheckmarkOutline : CloseOutline"
                  />
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
      </div>

      <!-- 关于 -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-title">关于</span>
          <span class="section-line" />
        </div>
        <div class="about-row">
          <NText class="about-version">SkillDeck v{{ appVersion }}</NText>
          <NButton
            v-if="updateDownloaded"
            type="primary"
            round
            @click="handleInstallUpdate"
          >
            安装更新
          </NButton>
          <NButton
            v-else
            round
            :loading="updateChecking || updateDownloading"
            :disabled="updateChecking || updateDownloading"
            @click="handleCheckUpdate"
          >
            <template #icon>
              <NIcon :size="14"><RefreshOutline /></NIcon>
            </template>
            {{ updateDownloading ? '下载中...' : '检查更新' }}
          </NButton>
        </div>
      </div>
    </NCard>

    <!-- Floating Save Button -->
    <div class="settings-fab">
      <NButton type="primary" round size="large" @click="handleSave">
        <template #icon>
          <NIcon :size="18"><CheckmarkOutline /></NIcon>
        </template>
        保存设置
      </NButton>
    </div>
  </main>
</template>

<style scoped>
.settings-page {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-xl);
  width: 100%;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.page-header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  font-size: var(--text-heading-lg);
  font-weight: var(--weight-bold);
  margin: 0;
  color: var(--color-ink);
  line-height: var(--leading-tight);
}

.page-desc {
  font-size: var(--text-body-sm);
  color: var(--color-stone);
}

/* Card */
.settings-card {
  border-radius: var(--radius-xl);
  /* 移除静止阴影，仅保留 hover 状态（遵循阴影-at-rest 原则） */
  box-shadow: var(--shadow-0);
  transition: box-shadow var(--transition-base);
}


.settings-card :deep(.n-card__content) {
  padding: var(--space-xl);
}

/* Section */
.settings-section + .settings-section {
  margin-top: var(--space-xxl);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.section-title {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-stone);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.section-line {
  flex: 1;
  height: 1px;
  background: var(--color-hairline);
}

/* Form */
.settings-form :deep(.n-form-item-label) {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink);
}

.settings-form :deep(.n-form-item) {
  margin-bottom: var(--space-md);
}

.settings-form :deep(.n-form-item:last-child) {
  margin-bottom: 0;
}

.settings-select {
  width: 100%;
}

/* Proxy Field */
.proxy-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
}

.custom-input-wrapper {
  display: grid;
  grid-template-rows: 1fr;
}

.custom-input-wrapper > * {
  overflow: hidden;
}

.custom-proxy-input :deep(.n-input__input) {
  padding-left: var(--space-xs);
}

.proxy-active {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.proxy-active-text {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

/* Floating Action Button */
.settings-fab {
  position: fixed;
  bottom: var(--space-xl);
  right: var(--space-xl);
  z-index: 100;
}

.settings-fab :deep(.n-button) {
  box-shadow: var(--shadow-3);
  transition: box-shadow var(--transition-base);
}

.settings-fab :deep(.n-button:hover) {
  box-shadow: var(--shadow-4);
}

.settings-fab :deep(.n-button:active) {
  transform: translateY(0);
}

/* Expand Transition — grid-template-rows avoids layout thrash from max-height */
.expand-enter-active,
.expand-leave-active {
  transition:
    grid-template-rows var(--transition-base),
    opacity var(--transition-base);
}

.expand-enter-from,
.expand-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  grid-template-rows: 1fr;
  opacity: 1;
}

/* Environment Checks */
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

.unsaved-banner {
  margin-bottom: var(--space-lg);
}

.unsaved-banner :deep(.n-alert-body) {
  padding: 10px 16px;
}

/* Environment checks wrapper with warning styling when missing */
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

/* About section */
.about-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.about-version {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  color: var(--color-stone);
}
</style>
