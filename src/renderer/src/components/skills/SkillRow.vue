<script setup lang="ts">
import { NIcon, NButton, NTag, NText } from 'naive-ui'
import { FolderOpenOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import type { InstalledSkill } from '../../../../shared/types'

const props = defineProps<{ skill: InstalledSkill }>()

const emit = defineEmits<{
  update: [name: string]
  remove: [name: string]
  openLocation: [path: string]
  filterAgent: [agentFlag: string]
}>()
</script>

<template>
  <div class="skill-card">
    <div class="skill-card-main">
      <NText class="skill-name">{{ props.skill.name }}</NText>
      <div class="skill-actions">
        <NButton
          quaternary
          circle
          size="tiny"
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
          size="tiny"
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
          size="tiny"
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
      <NTag
        v-for="agent in props.skill.agents"
        :key="agent.name"
        size="small"
        :bordered="false"
        round
        class="agent-tag agent-tag--clickable"
        @click="emit('filterAgent', agent.name)"
      >
        {{ agent.name }}
      </NTag>
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
  transition: all var(--transition-base);
}

.skill-card:hover {
  box-shadow: var(--shadow-2);
  border-color: var(--color-muted);
}

.skill-card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
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
  transition: all var(--transition-fast);
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
  transition: all var(--transition-fast);
}

.agent-tag--clickable {
  cursor: pointer;
}

.agent-tag--clickable:hover {
  background: var(--color-muted);
  color: var(--color-ink);
  border-color: var(--color-muted);
}
</style>
