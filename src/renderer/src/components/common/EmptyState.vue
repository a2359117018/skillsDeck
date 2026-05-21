<script setup lang="ts">
import { NIcon } from 'naive-ui'

defineProps<{
  /** 图标组件 */
  icon: unknown
  /** 主要说明文字 */
  title: string
  /** 补充说明（可选） */
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <NIcon :size="40" :color="'var(--color-muted)'">
        <component :is="icon" />
      </NIcon>
    </div>
    <div class="empty-title">{{ title }}</div>
    <div v-if="description" class="empty-desc">{{ description }}</div>
    <div v-if="$slots.actions" class="empty-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xxxl) 0;
  text-align: center;
}

.empty-icon {
  margin-bottom: var(--space-md);
}

.empty-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-ink);
  line-height: 1.5;
}

.empty-desc {
  font-size: 0.875rem;
  color: var(--color-stone);
  max-width: 280px;
  line-height: 1.5;
  margin-top: var(--space-xs);
}

.empty-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  flex-wrap: wrap;
  justify-content: center;
}
</style>
