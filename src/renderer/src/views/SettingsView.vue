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
  useMessage,
  type SelectOption
} from 'naive-ui'
import {
  RefreshOutline,
  SettingsOutline,
  LinkOutline,
  UnlinkOutline,
  PencilOutline,
  CheckmarkCircleOutline,
  CheckmarkOutline,
  CloseOutline,
  DownloadOutline
} from '@vicons/ionicons5'
import { useSettingsStore } from '../stores/settings'
import { useSkillsStore } from '../stores/skills'
import { useEnvStore } from '../stores/env'
import { useTaskStore } from '../stores/tasks'
import { useConfirm } from '../composables/useConfirm'
import { AGENTS } from '../constants/agents'

interface ProxyOption extends SelectOption {
  icon?: Component
}

const settingsStore = useSettingsStore()
const skillsStore = useSkillsStore()
const envStore = useEnvStore()
const taskStore = useTaskStore()
const message = useMessage()
const { confirmUpdateAll, confirmUpdateEnv } = useConfirm()

const envDownloading = ref(false)
const envDownloadProgress = ref(0)

const isLoaded = ref(false)
const originalSettings = ref({
  defaultAgent: '',
  autoCheckEnv: true,
  proxyUrl: '',
  npmRegistry: ''
})

const agentOptions = AGENTS.map((a) => ({ label: a.name, value: a.agentFlag }))

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
      defaultAgent: settingsStore.defaultAgent,
      autoCheckEnv: settingsStore.autoCheckEnv,
      proxyUrl: effectiveProxyUrl.value,
      npmRegistry: effectiveRegistryUrl.value
    }
    isLoaded.value = true
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
    settingsStore.defaultAgent !== originalSettings.value.defaultAgent ||
    settingsStore.autoCheckEnv !== originalSettings.value.autoCheckEnv ||
    effectiveProxyUrl.value !== originalSettings.value.proxyUrl ||
    effectiveRegistryUrl.value !== originalSettings.value.npmRegistry
  )
})

async function handleSave(): Promise<void> {
  if (
    showCustomInput.value &&
    customProxyUrl.value &&
    !customProxyUrl.value.trim().startsWith('https://')
  ) {
    message.warning('自定义代理地址必须以 https:// 开头')
    return
  }
  if (
    showCustomRegistryInput.value &&
    customRegistryUrl.value &&
    !customRegistryUrl.value.trim().startsWith('https://')
  ) {
    message.warning('自定义镜像地址必须以 https:// 开头')
    return
  }
  await settingsStore.save({
    defaultAgent: settingsStore.defaultAgent,
    autoCheckEnv: settingsStore.autoCheckEnv,
    proxyUrl: effectiveProxyUrl.value,
    npmRegistry: effectiveRegistryUrl.value
  })
  originalSettings.value = {
    defaultAgent: settingsStore.defaultAgent,
    autoCheckEnv: settingsStore.autoCheckEnv,
    proxyUrl: effectiveProxyUrl.value,
    npmRegistry: effectiveRegistryUrl.value
  }
  message.success('设置已保存')
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
    message.success('Node.js 安装成功')
    await envStore.check()
  } catch (e) {
    if (e instanceof Error && e.message === '下载已取消') {
      message.info('下载已取消')
    } else {
      message.error(e instanceof Error ? e.message : 'Node.js 安装失败')
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

async function handleInstallSkills(): Promise<void> {
  skillsInstalling.value = true
  try {
    const result = await window.api.env.installSkills()
    if (!result.success) throw new Error(result.error || '安装失败')
    message.success('skills CLI 安装成功')
    await envStore.check()
  } catch (e) {
    message.error(e instanceof Error ? e.message : 'skills CLI 安装失败')
  } finally {
    skillsInstalling.value = false
  }
}

async function handleEnvRecheck(): Promise<void> {
  try {
    await envStore.check()
    message.success('环境检测完成')
  } catch {
    message.error('环境检测失败，请重试')
  }
}

async function handleUpdateSkills(): Promise<void> {
  const confirmed = await confirmUpdateEnv('skills', envStore.status?.skillsVersion || '')
  if (!confirmed) return
  taskStore
    .start('update-skills', {
      onSuccess: () => {
        message.success('skills CLI 已更新')
        envStore.check()
      },
      onError: (err) => {
        message.error(`skills CLI 更新失败: ${err}`)
      }
    })
    .catch((e) => {
      message.info(e instanceof Error ? e.message : '启动更新失败')
    })
}

async function handleUpdateAll(): Promise<void> {
  const names = skillsStore.installedSkills.map((s) => s.name)
  if (names.length === 0) {
    message.info('没有可更新的技能')
    return
  }
  const confirmed = await confirmUpdateAll(names)
  if (!confirmed) return
  taskStore
    .start('skill-update-all', {
      global: true,
      onSuccess: () => {
        message.success('全部更新成功')
      },
      onError: (err) => {
        message.error(`更新失败: ${err}`)
      }
    })
    .catch((e) => {
      message.info(e instanceof Error ? e.message : '启动更新失败')
    })
}
</script>

<template>
  <div class="settings-page">
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
          <NFormItem label="默认安装的 AI 工具">
            <NSelect
              v-model:value="settingsStore.defaultAgent"
              :options="agentOptions"
              filterable
              class="settings-select"
            />
          </NFormItem>
          <NFormItem label="启动时检查运行环境">
            <NSwitch v-model:value="settingsStore.autoCheckEnv" />
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
          <NFormItem label="npm 镜像源（加速包下载）">
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

      <!-- 管理操作 -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-title">管理操作</span>
          <span class="section-line" />
        </div>
        <NForm label-placement="left" label-width="140" class="settings-form">
          <NFormItem label="技能维护">
            <NButton
              round
              :disabled="skillsStore.installedSkills.length === 0"
              @click="handleUpdateAll"
            >
              <template #icon>
                <NIcon :size="14"><RefreshOutline /></NIcon>
              </template>
              更新全部技能 ({{ skillsStore.installedSkills.length }})
            </NButton>
          </NFormItem>
        </NForm>
      </div>

      <!-- 运行环境 -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-title">运行环境</span>
          <span class="section-line" />
        </div>
        <NText depth="3" style="display: block; margin-bottom: var(--space-md); font-size: var(--text-body-sm)">
          NPX Skills UI 依赖 Node.js 和 npx skills CLI 来安装、更新和管理技能。
        </NText>
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

        <div class="env-toolbar">
          <div class="env-toolbar-left">
            <NButton
              v-if="!envStore.status?.nodeInstalled && !envDownloading"
              type="primary"
              round
              @click="handleInstallNode"
            >
              <template #icon>
                <NIcon :size="14"><DownloadOutline /></NIcon>
              </template>
              下载并安装 Node.js（运行环境）
            </NButton>
            <NButton
              v-else-if="envStore.status?.nodeInstalled && !envStore.status?.skillsInstalled"
              type="primary"
              round
              :loading="skillsInstalling"
              @click="handleInstallSkills"
            >
              <template #icon>
                <NIcon :size="14"><DownloadOutline /></NIcon>
              </template>
              安装 skills CLI（技能管理工具）
            </NButton>
            <NButton size="small" round :disabled="envStore.refreshing" @click="handleEnvRecheck">
              <template #icon>
                <NIcon :size="14"><RefreshOutline /></NIcon>
              </template>
              重新检测环境
            </NButton>
          </div>
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
  </div>
</template>

<style scoped>
.settings-page {
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
  box-shadow: var(--shadow-3);
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
  max-width: 320px;
}

/* Proxy Field */
.proxy-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
  max-width: 320px;
}

.custom-input-wrapper {
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
  right: 32px;
  z-index: 100;
}

.settings-fab :deep(.n-button) {
  box-shadow: var(--shadow-3);
  transition:
    box-shadow var(--transition-base),
    transform var(--transition-base);
}

.settings-fab :deep(.n-button:hover) {
  box-shadow: var(--shadow-4);
  transform: translateY(-1px);
}

.settings-fab :deep(.n-button:active) {
  transform: translateY(0);
}

/* Expand Transition */
.expand-enter-active,
.expand-leave-active {
  transition: opacity var(--transition-base), max-height var(--transition-base);
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 200px;
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
  transition: background var(--transition-base), color var(--transition-base);
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

.env-toolbar {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-hairline);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
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
</style>
