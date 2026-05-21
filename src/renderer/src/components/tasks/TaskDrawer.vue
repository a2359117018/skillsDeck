<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { NDrawer, NDrawerContent, NButton, NIcon, NEmpty } from 'naive-ui'
import { TrashOutline } from '@vicons/ionicons5'
import TaskItem from './TaskItem.vue'
import { useTaskStore } from '../../stores/tasks'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const taskStore = useTaskStore()
const windowWidth = ref(1200)

function handleResize(): void {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  windowWidth.value = window.innerWidth
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const drawerWidth = computed(() => Math.min(480, windowWidth.value * 0.4))

/** 按时间倒序排列的任务列表 */
const sortedTasks = computed(() => [...taskStore.tasks].sort((a, b) => b.createdAt - a.createdAt))

const activeCount = computed(() => taskStore.activeTasks.length)

/** 取消指定任务 */
function handleCancel(taskId: string): void {
  taskStore.cancel(taskId)
}

/** 清除已完成的任务（从列表中移除 success/error/cancelled） */
function clearCompleted(): void {
  taskStore.tasks
    .filter((t) => t.status !== 'running' && t.status !== 'pending')
    .forEach((t) => {
      const idx = taskStore.tasks.indexOf(t)
      if (idx >= 0) taskStore.tasks.splice(idx, 1)
    })
}

/** 是否存在已完成可清除的任务 */
const hasCompletedTasks = computed(() =>
  taskStore.tasks.some((t) => t.status !== 'running' && t.status !== 'pending')
)
</script>

<template>
  <NDrawer
    :show="show"
    :width="drawerWidth"
    placement="right"
    :mask-closable="true"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent :native-scrollbar="false" class="task-drawer">
      <template #header>
        <div class="drawer-header">
          <span class="drawer-title">后台任务</span>
          <span v-if="activeCount > 0" class="drawer-badge">{{ activeCount }}</span>
          <NButton
            v-if="hasCompletedTasks"
            size="tiny"
            quaternary
            class="drawer-clear-btn"
            @click="clearCompleted"
          >
            <template #icon>
              <NIcon :size="14"><TrashOutline /></NIcon>
            </template>
            清除已完成任务
          </NButton>
        </div>
      </template>

      <div v-if="sortedTasks.length === 0" class="task-empty">
        <NEmpty description="暂无后台任务" />
      </div>

      <div v-else class="task-list">
        <TaskItem v-for="task in sortedTasks" :key="task.id" :task="task" @cancel="handleCancel" />
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.drawer-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-ink);
}

.drawer-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: var(--color-brand-blue);
  color: var(--color-canvas);
  font-size: 0.6875rem;
  font-weight: 600;
}

.drawer-clear-btn {
  margin-left: auto;
  color: var(--color-muted);
}

.task-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xxxl) 0;
}

.task-list {
  display: flex;
  flex-direction: column;
}
</style>
