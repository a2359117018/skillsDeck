<script setup lang="ts">
import { computed } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  type GlobalThemeOverrides
} from 'naive-ui'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppLoading from './components/common/AppLoading.vue'
import { useSkillsStore } from './stores/skills'

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'

const skillsStore = useSkillsStore()
const showGlobalLoading = computed(() => skillsStore.fetching)

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0a0a0a',
    primaryColorHover: '#2a2a2a',
    primaryColorPressed: '#000000',
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif",
    borderRadius: '9999px',
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
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '8px'
      }
    }
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
            <Transition name="fade" mode="out-in">
              <router-view />
            </Transition>
          </main>
          <AppLoading :show="showGlobalLoading" />
        </div>
        <div v-else-if="windowType === 'env'">
          <router-view />
        </div>
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
</style>
