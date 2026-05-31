<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NIcon, NText } from 'naive-ui'
import RefreshOutline from '@vicons/ionicons5/RefreshOutline'
import { useNotify } from '../../composables/useNotify'
import { APP_NAME } from '../../../../shared/constants'

const props = defineProps<{
  appVersion: string
}>()

const emit = defineEmits<{
  (e: 'check'): void
  (e: 'install'): void
}>()

const notify = useNotify()
const updateChecking = ref(false)
const updateDownloading = ref(false)
const updateDownloaded = ref(false)

function handleCheckUpdate(): void {
  updateChecking.value = true
  updateDownloaded.value = false
  updateDownloading.value = false

  const cleanups: (() => void)[] = []
  let settled = false

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

function handleInstallUpdate(): void {
  emit('install')
}
</script>

<template>
  <div class="about-row">
    <NText class="about-version">{{ APP_NAME }} v{{ props.appVersion }}</NText>
    <NButton v-if="updateDownloaded" type="primary" round @click="handleInstallUpdate">
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
</template>

<style scoped>
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
