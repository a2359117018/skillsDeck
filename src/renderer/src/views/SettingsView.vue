<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NCard, NAlert, NButton, NIcon } from 'naive-ui'
import SettingsOutline from '@vicons/ionicons5/SettingsOutline'
import CheckmarkOutline from '@vicons/ionicons5/CheckmarkOutline'
import { useSettingsStore } from '../stores/settings'
import { useNotify } from '../composables/useNotify'
import GeneralSettings from '../components/settings/GeneralSettings.vue'
import NetworkSettings from '../components/settings/NetworkSettings.vue'
import EnvSettings from '../components/settings/EnvSettings.vue'
import UpdaterSettings from '../components/settings/UpdaterSettings.vue'

const settingsStore = useSettingsStore()
const notify = useNotify()

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

const appVersion = ref('')

onMounted(() => {
  settingsStore.load().then(() => {
    originalSettings.value = {
      autoCheckEnv: settingsStore.autoCheckEnv,
      proxyUrl: settingsStore.proxyUrl,
      npmRegistry: settingsStore.npmRegistry,
      closeAction: settingsStore.closeAction
    }
    isLoaded.value = true

    window.api.app.getVersion().then((v) => {
      appVersion.value = v
    })
  })
})

const hasUnsavedChanges = computed(() => {
  if (!isLoaded.value) return false
  return (
    settingsStore.autoCheckEnv !== originalSettings.value.autoCheckEnv ||
    settingsStore.proxyUrl !== originalSettings.value.proxyUrl ||
    settingsStore.npmRegistry !== originalSettings.value.npmRegistry ||
    settingsStore.closeAction !== originalSettings.value.closeAction
  )
})

async function handleSave(): Promise<void> {
  const proxy = settingsStore.proxyUrl.trim()
  const registry = settingsStore.npmRegistry.trim()
  if (proxy && !proxy.startsWith('https://')) {
    notify.warning('自定义代理地址必须以 https:// 开头')
    return
  }
  if (registry && !registry.startsWith('https://')) {
    notify.warning('自定义镜像地址必须以 https:// 开头')
    return
  }
  await settingsStore.save({
    autoCheckEnv: settingsStore.autoCheckEnv,
    proxyUrl: proxy,
    npmRegistry: registry,
    closeAction: settingsStore.closeAction
  })
  originalSettings.value = {
    autoCheckEnv: settingsStore.autoCheckEnv,
    proxyUrl: proxy,
    npmRegistry: registry,
    closeAction: settingsStore.closeAction
  }
  notify.success('设置已保存')
}

function handleCheckUpdate(): void {
  // UpdaterSettings handles its own check state; this is just a pass-through
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
        <p class="page-desc">调整应用设置、配置网络代理并管理技能更新</p>
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
        <GeneralSettings
          v-model:auto-check-env="settingsStore.autoCheckEnv"
          v-model:close-action="settingsStore.closeAction"
        />
      </div>

      <!-- 网络设置 -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-title">网络设置</span>
          <span class="section-line" />
        </div>
        <NetworkSettings
          v-model:proxy-url="settingsStore.proxyUrl"
          v-model:npm-registry="settingsStore.npmRegistry"
        />
      </div>

      <!-- 运行环境 -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-title">运行环境</span>
          <span class="section-line" />
        </div>
        <EnvSettings />
      </div>

      <!-- 关于 -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-title">关于</span>
          <span class="section-line" />
        </div>
        <UpdaterSettings
          :app-version="appVersion"
          @check="handleCheckUpdate"
          @install="handleInstallUpdate"
        />
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

.unsaved-banner {
  margin-bottom: var(--space-lg);
}

.unsaved-banner :deep(.n-alert-body) {
  padding: 10px 16px;
}
</style>
