<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import {
  CubeOutline,
  SearchOutline,
  GitMergeOutline,
  SettingsOutline,
  RocketOutline
} from '@vicons/ionicons5'
import { useTaskStore } from '../../stores/tasks'

const router = useRouter()
const route = useRoute()
const taskStore = useTaskStore()

interface NavItem {
  key: string
  icon: typeof CubeOutline
  label: string
}

const navItems: NavItem[] = [
  { key: 'search', icon: SearchOutline, label: '搜索技能' },
  { key: 'installed', icon: CubeOutline, label: '已安装' },
  { key: 'agent-view', icon: GitMergeOutline, label: 'AI 工具' },
  { key: 'settings', icon: SettingsOutline, label: '设置' }
]

const dividers = new Set(['installed', 'agent-view'])

const activeKey = computed(() => route.name as string)

let unsubscribe: (() => void) | undefined

onMounted(async () => {
  unsubscribe = taskStore.subscribe()
  await taskStore.sync()
})

onUnmounted(() => {
  unsubscribe?.()
})

function navigate(key: string): void {
  router.push({ name: key })
}

const emit = defineEmits<{
  'open-tasks': []
}>()
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
          <NIcon :size="22">
            <component :is="item.icon" />
          </NIcon>
          <span class="sidebar-label">{{ item.label }}</span>
        </button>
      </template>
    </nav>

    <div class="sidebar-footer">
      <button
        class="sidebar-item task-indicator"
        :class="{ 'has-active': taskStore.hasActiveTasks }"
        title="后台任务"
        @click="emit('open-tasks')"
      >
        <div class="task-icon-wrap">
          <NIcon :size="22">
            <RocketOutline />
          </NIcon>
          <span v-if="taskStore.hasActiveTasks" class="task-dot"></span>
        </div>
        <span class="sidebar-label">任务</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  height: 100vh;
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-md) 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  width: 100%;
}

.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-top: var(--space-sm);
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
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
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
  background: rgba(255, 255, 255, 0.05);
}

.sidebar-item.active {
  color: var(--sidebar-icon-active-color);
  background: rgba(255, 255, 255, 0.10);
}

.sidebar-label {
  font-size: 11px;
  line-height: 1.2;
  color: inherit;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}

/* Task indicator */
.task-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-brand-coral);
  border: 1.5px solid var(--sidebar-bg);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.85);
  }
}

.task-indicator:hover {
  color: var(--sidebar-icon-hover-color);
}

.task-indicator.has-active {
  color: var(--sidebar-icon-active-color);
}
</style>
