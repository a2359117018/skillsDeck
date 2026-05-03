<script setup lang="ts">
import { computed } from 'vue'
import { NLayout, NLayoutSider, NMenu, NMessageProvider, NConfigProvider } from 'naive-ui'
import { useRouter, useRoute } from 'vue-router'
import type { MenuOption } from 'naive-ui'

const router = useRouter()
const route = useRoute()

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'

const menuOptions: MenuOption[] = [
  { label: '技能', key: 'installed' },
  { label: '搜索', key: 'search' },
  { label: 'Agent 视图', key: 'agent-view' },
  { type: 'divider', key: 'd1' },
  { label: '设置', key: 'settings' }
]

function handleMenuUpdate(key: string): void {
  router.push({ name: key })
}

const activeKey = computed(() => route.name as string)
</script>

<template>
  <NConfigProvider>
    <NMessageProvider>
      <div v-if="windowType === 'main'" class="app-shell">
        <NLayout has-sider>
          <NLayoutSider bordered :width="180" :collapsed-width="0" collapse-mode="width">
            <div class="sidebar-header" style="padding: 16px; font-weight: 600; font-size: 14px">
              NPX Skills
            </div>
            <NMenu :options="menuOptions" :value="activeKey" @update:value="handleMenuUpdate" />
          </NLayoutSider>
          <NLayout>
            <div style="padding: 24px; overflow-y: auto; height: 100vh">
              <router-view />
            </div>
          </NLayout>
        </NLayout>
      </div>
      <div v-else-if="windowType === 'env'">
        <router-view />
      </div>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.app-shell {
  height: 100vh;
}
.sidebar-header {
  border-bottom: 1px solid var(--n-border-color);
}
</style>
