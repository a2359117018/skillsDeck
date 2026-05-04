<script setup lang="ts">
import { computed } from 'vue'
import {
  NLayout,
  NLayoutSider,
  NMenu,
  NMessageProvider,
  NConfigProvider,
  NDialogProvider
} from 'naive-ui'
import { useRouter, useRoute } from 'vue-router'
import type { MenuOption } from 'naive-ui'
import AppLoading from './components/common/AppLoading.vue'
import { useSkillsStore } from './stores/skills'

const router = useRouter()
const route = useRoute()
const skillsStore = useSkillsStore()

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'

const menuOptions: MenuOption[] = [
  { label: '技能', key: 'installed' },
  { label: '技能搜索', key: 'search' },
  { label: 'Agents', key: 'agent-view' },
  { type: 'divider', key: 'd1' },
  { label: '设置', key: 'settings' }
]

function handleMenuUpdate(key: string): void {
  router.push({ name: key })
}

const activeKey = computed(() => route.name as string)

const showGlobalLoading = computed(() => skillsStore.fetching)
</script>

<template>
  <NConfigProvider>
    <NDialogProvider>
      <NMessageProvider>
        <div v-if="windowType === 'main'" class="app-shell">
          <NLayout has-sider>
            <NLayoutSider bordered :width="180" :collapsed-width="0" collapse-mode="width">
              <div class="sidebar-header" style="padding: 16px; font-weight: 600; font-size: 14px">
                NPX Skills
              </div>
              <NMenu :options="menuOptions" :value="activeKey" @update:value="handleMenuUpdate" />
            </NLayoutSider>
            <NLayout class="content-area">
              <Transition name="fade" mode="out-in">
                <router-view />
              </Transition>
            </NLayout>
          </NLayout>
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
  position: relative;
}
.sidebar-header {
  border-bottom: 1px solid var(--n-border-color);
}
.content-area {
  padding: 24px;
  height: 100%;
  overflow: hidden;
}
</style>
