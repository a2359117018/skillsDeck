<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NAlert,
  NButton,
  type GlobalThemeOverrides
} from 'naive-ui'
import AppSidebar from './components/layout/AppSidebar.vue'
import { useEnvStore } from './stores/env'

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'
const envStore = useEnvStore()
const router = useRouter()

const isMainWindow = windowType === 'main'

const envOk = computed(() => {
  const s = envStore.status
  return s?.nodeInstalled && s?.npmInstalled && s?.npxInstalled && s?.skillsInstalled
})

const envBannerVisible = computed(
  () => isMainWindow && !envStore.fetching && envStore.status !== null && !envOk.value
)

onMounted(() => {
  if (isMainWindow) {
    envStore.check()
  }
})

function goToSettings(): void {
  router.push({ name: 'settings' })
}

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0a0a0a',
    primaryColorHover: '#2a2a2a',
    primaryColorPressed: '#000000',
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif",
    borderRadius: '8px',
    borderRadiusSmall: '8px'
  },
  Button: {
    borderRadius: '9999px',
    fontWeight: '500'
  },
  Tag: {
    borderRadius: '9999px'
  },
  Input: {
    borderRadius: '8px',
    height: '40px'
  },
  Card: {
    borderRadius: '16px'
  },
  Modal: {
    borderRadius: '20px'
  },
  Dialog: {
    borderRadius: '16px'
  },
  InternalSelectMenu: {
    borderRadius: '8px'
  }
}
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NDialogProvider>
      <NMessageProvider>
        <div v-if="windowType === 'main'" class="app-shell">
          <AppSidebar />
          <main class="content-area">
            <NAlert v-if="envBannerVisible" type="warning" :show-icon="false" class="env-banner">
              <div class="env-banner-inner">
                <span>运行环境不完整，部分功能可能无法使用</span>
                <NButton size="small" round type="warning" @click="goToSettings"> 去安装 </NButton>
              </div>
            </NAlert>
            <router-view v-slot="{ Component }">
              <Transition name="fade" mode="out-in">
                <component :is="Component" />
              </Transition>
            </router-view>
          </main>
        </div>
        <router-view v-else />
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>

<style scoped>
.app-shell {
  height: 100vh;
  display: flex;
  position: relative;
}

.content-area {
  flex: 1;
  height: 100vh;
  overflow: auto;
  background-color: var(--color-canvas);
}

.env-banner :deep(.n-alert-body) {
  padding: 10px 16px;
}

.env-banner-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
