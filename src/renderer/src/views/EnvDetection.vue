<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NButton, NSpace, NText, NSpin, NProgress } from 'naive-ui'
import { useEnvStore } from '../stores/env'

const envStore = useEnvStore()
const downloading = ref(false)
const downloadProgress = ref(0)

onMounted(() => envStore.check())

function closeWindow(): void {
  window.close()
}

async function handleInstallNode(): Promise<void> {
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
    <NCard title="环境检测" class="env-card">
      <NSpin :show="envStore.checking">
        <NSpace vertical :size="20" class="env-checks">
          <div class="env-check-item">
            <div
              class="env-check-icon"
              :class="{
                success: envStore.status?.nodeInstalled,
                error: !envStore.status?.nodeInstalled
              }"
            >
              <svg
                v-if="envStore.status?.nodeInstalled"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M16.6666 5.00001L7.49998 14.1667L3.33331 10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <NText class="env-check-text">Node.js {{ envStore.status?.nodeVersion || '' }}</NText>
          </div>

          <div class="env-check-item">
            <div
              class="env-check-icon"
              :class="{
                success: envStore.status?.npxInstalled,
                error: !envStore.status?.npxInstalled
              }"
            >
              <svg
                v-if="envStore.status?.npxInstalled"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M16.6666 5.00001L7.49998 14.1667L3.33331 10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <NText class="env-check-text">npx</NText>
          </div>

          <div class="env-check-item">
            <div
              class="env-check-icon"
              :class="{
                success: envStore.status?.skillsInstalled,
                error: !envStore.status?.skillsInstalled
              }"
            >
              <svg
                v-if="envStore.status?.skillsInstalled"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M16.6666 5.00001L7.49998 14.1667L3.33331 10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <NText class="env-check-text">npx skills</NText>
          </div>
        </NSpace>
      </NSpin>

      <div v-if="!envStore.status?.nodeInstalled" style="margin-top: var(--space-lg)">
        <NProgress v-if="downloading" :percentage="downloadProgress" indicator-placement="inside" />
        <NButton v-else type="primary" round :loading="downloading" @click="handleInstallNode">
          下载并安装 Node.js
        </NButton>
      </div>

      <NSpace justify="end" style="margin-top: var(--space-lg)">
        <NButton @click="closeWindow">跳过</NButton>
        <NButton :loading="envStore.checking" @click="envStore.check()">重新检测</NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.env-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
}

.env-card {
  width: 100%;
  max-width: 480px;
  border-radius: var(--radius-xxl);
  position: relative;
  overflow: hidden;
}

.env-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--color-brand-coral),
    var(--color-brand-blue),
    var(--color-brand-purple),
    var(--color-brand-magenta)
  );
}

.env-checks {
  padding: var(--space-md) 0;
}

.env-check-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.env-check-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition: all var(--transition-base);
}

.env-check-icon.success {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.env-check-icon.error {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.env-check-text {
  font-size: var(--text-body-md);
  color: var(--color-ink);
  font-weight: var(--weight-medium);
}
</style>
