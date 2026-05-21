<script setup lang="ts">
import { computed } from 'vue'
import { NIcon, NButton, NProgress } from 'naive-ui'
import {
  ReloadOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  StopCircleOutline,
  TimeOutline
} from '@vicons/ionicons5'
import type { BackgroundTask } from '../../../../shared/types'

const props = defineProps<{
  task: BackgroundTask
}>()

const emit = defineEmits<{
  cancel: [taskId: string]
}>()

/** 任务类型到中文名称的映射 */
const TASK_LABELS: Record<string, string> = {
  'update-skills': '更新 skills CLI',
  'install-node': '安装 Node.js',
  'install-skills': '安装 skills CLI',
  'skill-update': '更新技能',
  'skill-update-all': '批量更新技能'
}

/** 任务状态配置 */
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof ReloadOutline }
> = {
  pending: { label: '等待中', color: 'var(--color-muted)', icon: TimeOutline },
  running: { label: '运行中', color: 'var(--color-brand-blue)', icon: ReloadOutline },
  success: {
    label: '已完成',
    color: 'var(--color-success-text)',
    icon: CheckmarkCircleOutline
  },
  error: { label: '失败', color: 'var(--color-error)', icon: CloseCircleOutline },
  cancelled: { label: '已取消', color: 'var(--color-muted)', icon: StopCircleOutline }
}

const taskLabel = computed(() => TASK_LABELS[props.task.type] || props.task.type)
const statusConfig = computed(() => STATUS_CONFIG[props.task.status] || STATUS_CONFIG.pending)
const isActive = computed(() => props.task.status === 'running' || props.task.status === 'pending')
const progressValue = computed(() => (props.task.progress >= 0 ? props.task.progress : undefined))

/** 格式化相对时间 */
const relativeTime = computed(() => {
  const diff = Date.now() - props.task.createdAt
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  return `${hours} 小时前`
})
</script>

<template>
  <div class="task-item" :class="'status-' + task.status">
    <div class="task-row">
      <div class="task-icon-wrap">
        <NIcon :size="18" :color="statusConfig.color" :class="{ 'icon-spinning': isActive }">
          <component :is="statusConfig.icon" />
        </NIcon>
      </div>
      <div class="task-content">
        <span class="task-name">{{ taskLabel }}</span>
        <span class="task-time">{{ relativeTime }}</span>
      </div>
      <span class="task-status-badge" :style="{ color: statusConfig.color }">
        {{ statusConfig.label }}
      </span>
      <NButton
        v-if="isActive"
        size="tiny"
        quaternary
        circle
        title="取消任务"
        @click="emit('cancel', task.id)"
      >
        <template #icon>
          <NIcon :size="14"><StopCircleOutline /></NIcon>
        </template>
      </NButton>
    </div>
    <NProgress
      v-if="isActive && progressValue !== undefined"
      :percentage="progressValue"
      :show-indicator="false"
      :height="3"
      :color="'var(--color-brand-blue)'"
      :rail-color="'var(--color-hairline)'"
      class="task-progress"
    />
    <div v-if="task.error" class="task-error">
      {{ task.error }}
    </div>
  </div>
</template>

<style scoped>
.task-item {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-hairline);
  transition: background var(--transition-base);
}

.task-item:last-child {
  border-bottom: none;
}

.task-item:hover {
  background: var(--color-surface);
}

.task-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.task-icon-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.icon-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.task-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-time {
  font-size: 0.75rem;
  color: var(--color-muted);
}

.task-status-badge {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 500;
}

.task-progress {
  margin-top: var(--space-xs);
}

.task-error {
  margin-top: var(--space-xs);
  font-size: 0.75rem;
  color: var(--color-error);
  word-break: break-word;
}
</style>
