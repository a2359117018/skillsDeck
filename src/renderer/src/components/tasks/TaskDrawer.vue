<script setup lang="ts">
import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { NDrawer, NDrawerContent, NButton, NIcon, NEmpty } from 'naive-ui'
import TrashOutline from '@vicons/ionicons5/TrashOutline'
import TaskItem from './TaskItem.vue'
import { useTaskStore } from '../../stores/tasks'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const taskStore = useTaskStore()

/** 使用 @vueuse/core 的 useWindowSize 替代手动 resize 监听，避免未节流的事件风暴 */
const { width: windowWidth } = useWindowSize()

const drawerWidth = computed(() => Math.min(480, windowWidth.value * 0.4))

/** 按时间倒序排列的任务列表 */
const sortedTasks = computed(() => [...taskStore.tasks].sort((a, b) => b.createdAt - a.createdAt))

const activeCount = computed(() => taskStore.activeTasks.length)

/** 取消指定任务 */
function handleCancel(taskId: string): void {
  taskStore.cancel(taskId)
}

/** 重试失败的任务 */
function handleRetry(taskId: string): void {
  taskStore.retry(taskId)
}

/** 清除已完成的任务，通过调用 store action 而非直接修改数组 */
function clearCompleted(): void {
  taskStore.clearCompleted()
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
            round
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
        <TaskItem
          v-for="task in sortedTasks"
          :key="task.id"
          :task="task"
          @cancel="handleCancel"
          @retry="handleRetry"
        />
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
  font-size: var(--text-body-md);
  font-weight: var(--weight-semibold);
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
  font-size: var(--text-micro);
  font-weight: var(--weight-semibold);
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
