<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import { CubeOutline, SearchOutline, GitMergeOutline, SettingsOutline } from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()

interface NavItem {
  key: string
  icon: typeof CubeOutline
  label: string
}

const navItems: NavItem[] = [
  { key: 'search', icon: SearchOutline, label: '搜索技能' },
  { key: 'installed', icon: CubeOutline, label: '已安装' },
  { key: 'agent-view', icon: GitMergeOutline, label: 'Agent 管理' },
  { key: 'settings', icon: SettingsOutline, label: '设置' }
]

const dividers = new Set(['installed', 'agent-view'])

const activeKey = computed(() => route.name as string)

function navigate(key: string): void {
  router.push({ name: key })
}
</script>

<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <template v-for="item in navItems" :key="item.key">
        <div v-if="dividers.has(item.key)" class="sidebar-divider"></div>
        <button
          class="sidebar-item"
          :class="{ active: activeKey === item.key }"
          :title="item.label"
          @click="navigate(item.key)"
        >
          <div class="active-bar"></div>
          <NIcon :size="24">
            <component :is="item.icon" />
          </NIcon>
        </button>
      </template>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  height: 100vh;
  background: linear-gradient(180deg, var(--sidebar-bg-start) 0%, var(--sidebar-bg-end) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-md) 0;
  position: relative;
  overflow: hidden;
}

.sidebar::after {
  content: '';
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(20, 86, 240, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  width: 100%;
}

.sidebar-divider {
  width: 24px;
  height: 1px;
  background: var(--sidebar-divider-color);
  margin: var(--space-xs) 0;
}

.sidebar-item {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-lg);
  color: var(--sidebar-icon-color);
  transition:
    color var(--transition-base),
    background var(--transition-base);
}

.sidebar-item:hover {
  color: var(--sidebar-icon-hover-color);
  background: rgba(255, 255, 255, 0.06);
}

.sidebar-item.active {
  color: var(--sidebar-icon-active-color);
  background: rgba(255, 255, 255, 0.08);
}

.active-bar {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 20px;
  border-radius: 0 3px 3px 0;
  background: var(--sidebar-active-bar-color);
  transition: transform var(--transition-base);
}

.sidebar-item.active .active-bar {
  transform: translateY(-50%) scaleY(1);
}
</style>
