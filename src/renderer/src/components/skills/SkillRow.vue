<script setup lang="ts">
import { NIcon, NButton, NText, NCheckbox } from 'naive-ui'
import FolderOpenOutline from '@vicons/ionicons5/FolderOpenOutline'
import RefreshOutline from '@vicons/ionicons5/RefreshOutline'
import TrashOutline from '@vicons/ionicons5/TrashOutline'
import type { InstalledSkill } from '../../../../shared/types'

const props = defineProps<{
  skill: InstalledSkill
  batchMode?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  update: [name: string]
  remove: [name: string]
  openLocation: [path: string]
  filterAgent: [agentFlag: string]
  toggleSelect: [name: string]
}>()

function handleCardClick(event: MouseEvent): void {
  if (!props.batchMode) return
  const target = event.target as HTMLElement
  if (target.closest('.skill-checkbox')) return
  emit('toggleSelect', props.skill.name)
}
</script>

<template>
  <div
    class="skill-card"
    :class="{ 'skill-card--selected': props.batchMode && props.selected }"
    @click="handleCardClick"
  >
    <div class="skill-card-main">
      <div v-if="props.batchMode" class="skill-checkbox">
        <NCheckbox
          :checked="props.selected"
          aria-label="选择技能"
          @update:checked="emit('toggleSelect', props.skill.name)"
        />
      </div>
      <NText class="skill-name">{{ props.skill.name }}</NText>
      <div v-if="!props.batchMode" class="skill-actions">
        <NButton
          quaternary
          circle
          size="small"
          class="action-btn"
          title="打开位置"
          aria-label="打开位置"
          @click="emit('openLocation', props.skill.agents[0]?.path || '')"
        >
          <template #icon>
            <NIcon :size="16"><FolderOpenOutline /></NIcon>
          </template>
        </NButton>
        <NButton
          quaternary
          circle
          size="small"
          class="action-btn"
          title="更新"
          aria-label="更新"
          @click="emit('update', props.skill.name)"
        >
          <template #icon>
            <NIcon :size="16"><RefreshOutline /></NIcon>
          </template>
        </NButton>
        <NButton
          quaternary
          circle
          size="small"
          type="error"
          class="action-btn action-btn--danger"
          title="删除"
          aria-label="删除"
          @click="emit('remove', props.skill.name)"
        >
          <template #icon>
            <NIcon :size="16"><TrashOutline /></NIcon>
          </template>
        </NButton>
      </div>
    </div>
    <div v-if="props.skill.agents.length > 0" class="skill-agents">
      <!-- 使用 button 替代可点击 NTag，确保键盘可聚焦和可激活 -->
      <button
        v-for="agent in props.skill.agents"
        :key="agent.name"
        type="button"
        class="agent-tag agent-tag--clickable"
        @click="emit('filterAgent', agent.name)"
      >
        {{ agent.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.skill-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-hairline);
  background: var(--color-canvas);
  transition:
    box-shadow var(--transition-base),
    border-color var(--transition-base),
    background var(--transition-base);
}

.skill-card:hover {
  box-shadow: var(--shadow-2);
  border-color: var(--color-muted);
}

.skill-card--selected {
  border-color: var(--color-brand-blue);
  background: var(--color-brand-blue-tint);
}

.skill-card--selected:hover {
  border-color: var(--color-brand-blue);
}

.skill-card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
}

.skill-checkbox {
  display: flex;
  align-items: center;
}

.skill-checkbox :deep(.n-checkbox-box-wrapper) {
  margin: 0;
}

.skill-name {
  font-weight: var(--weight-semibold);
  font-size: var(--text-body-md);
  color: var(--color-ink);
  flex: 1;
}

.skill-actions {
  display: flex;
  gap: var(--space-xxs);
}

.action-btn {
  border-radius: var(--radius-full);
  transition: background var(--transition-fast);
}

.action-btn:hover {
  background: var(--color-surface);
}

.action-btn--danger:hover {
  background: var(--color-error-bg);
}

.skill-agents {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xxs);
}

.agent-tag {
  font-size: var(--text-micro);
  font-weight: var(--weight-regular);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-stone);
  border: 1px solid var(--color-hairline);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
  /* 重置 button 默认样式，保持视觉与之前 NTag 一致 */
  font-family: inherit;
  line-height: var(--leading-normal);
  padding: 0 8px;
}

.agent-tag--clickable {
  cursor: pointer;
}

.agent-tag--clickable:hover {
  background: var(--color-muted);
  color: var(--color-ink);
  border-color: var(--color-muted);
}

.agent-tag:focus-visible {
  outline: 2px solid var(--color-brand-blue);
  outline-offset: 2px;
}
</style>
