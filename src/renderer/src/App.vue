<script setup lang="ts">
import { onMounted, ref, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider,
  NAlert,
  NButton,
  type GlobalThemeOverrides
} from 'naive-ui'
import AppSidebar from './components/layout/AppSidebar.vue'
import TaskDrawer from './components/tasks/TaskDrawer.vue'
import { useEnvStore } from './stores/env'
import { useSkillsStore } from './stores/skills'

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'
const envStore = useEnvStore()
const skillsStore = useSkillsStore()
const router = useRouter()
const route = useRoute()

const isMainWindow = windowType === 'main'
const taskDrawerVisible = ref(false)

const envOk = computed(() => {
  const s = envStore.status
  return s?.nodeInstalled && s?.npmInstalled && s?.skillsInstalled
})

const envBannerVisible = computed(
  () => isMainWindow && !envStore.fetching && envStore.status !== null && !envOk.value
)

/**
 * Global keyboard shortcut handler.
 * - `/` or `Ctrl/Cmd + K` → focus search input on search page
 * - `Escape` → close modals/drawers (handled by NaiveUI, but we ensure router back if needed)
 */
function handleKeydown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
  const isInputFocused =
    tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable

  // Ctrl/Cmd + K or / (when not in input)
  if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !isInputFocused)) {
    e.preventDefault()
    if (route.name !== 'search') {
      router.push({ name: 'search' })
    }
    skillsStore.triggerFocusSearch()
    return
  }
}

onMounted(() => {
  if (isMainWindow) {
    envStore.check()
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function goToSettings(): void {
  router.push({ name: 'settings' })
}

function openTaskDrawer(): void {
  taskDrawerVisible.value = true
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
      <NNotificationProvider placement="top-right" :max="5">
        <NMessageProvider>
          <div v-if="windowType === 'main'" class="app-shell">
            <a href="#main-content" class="skip-link">跳转到主内容</a>
            <AppSidebar @open-tasks="openTaskDrawer" />
            <main id="main-content" class="content-area">
              <NAlert v-if="envBannerVisible" type="warning" :show-icon="false" class="env-banner">
                <div class="env-banner-inner">
                  <span>缺少必要的运行组件，部分功能可能无法使用</span>
                  <NButton size="small" round type="warning" @click="goToSettings">
                    前往设置
                  </NButton>
                </div>
              </NAlert>
              <div class="page-wrapper">
                <router-view v-slot="{ Component }">
                  <Transition name="fade">
                    <component :is="Component" />
                  </Transition>
                </router-view>
              </div>
            </main>
            <TaskDrawer v-model:show="taskDrawerVisible" />
          </div>
          <router-view v-else />
        </NMessageProvider>
      </NNotificationProvider>
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
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
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

.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  z-index: 10000;
  background: var(--color-canvas);
  color: var(--color-ink);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  text-decoration: none;
  box-shadow: var(--shadow-3);
}

.skip-link:focus {
  left: var(--space-md);
  top: var(--space-md);
}

.page-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
