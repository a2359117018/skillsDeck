<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NButton, NSpace, NText, NSpin, NProgress } from 'naive-ui'
import { useEnvStore } from '../stores/env'

const envStore = useEnvStore()
const downloading = ref(false)
const downloadProgress = ref(0)

onMounted(() => envStore.check())

function closeWindow() {
  window.close()
}

async function handleInstallNode() {
  downloading.value = true
  const cleanup = window.api.env.onDownloadProgress((percent) => {
    downloadProgress.value = percent
  })
  try {
    await window.api.env.installNode()
    await envStore.check()
  } finally {
    downloading.value = false
    cleanup()
  }
}
</script>

<template>
  <div class="env-page">
    <NCard title="环境检测">
      <NSpin :show="envStore.checking">
        <NSpace vertical size="large">
          <NText :type="envStore.status?.nodeInstalled ? 'success' : 'error'">
            {{ envStore.status?.nodeInstalled ? '✓' : '✗' }} Node.js {{ envStore.status?.nodeVersion || '' }}
          </NText>
          <NText :type="envStore.status?.npxInstalled ? 'success' : 'error'">
            {{ envStore.status?.npxInstalled ? '✓' : '✗' }} npx
          </NText>
          <NText :type="envStore.status?.skillsInstalled ? 'success' : 'error'">
            {{ envStore.status?.skillsInstalled ? '✓' : '✗' }} npx skills
          </NText>
        </NSpace>
      </NSpin>

      <div v-if="!envStore.status?.nodeInstalled" style="margin-top: 16px">
        <NProgress v-if="downloading" :percentage="downloadProgress" indicator-placement="inside" />
        <NButton v-else type="primary" :loading="downloading" @click="handleInstallNode">
          下载并安装 Node.js
        </NButton>
      </div>

      <NSpace justify="end" style="margin-top: 16px">
        <NButton @click="closeWindow">跳过</NButton>
        <NButton :loading="envStore.checking" @click="envStore.check()">重新检测</NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.env-page {
  padding: 24px;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
