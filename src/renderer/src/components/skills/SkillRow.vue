<script setup lang="ts">
import { NIcon, NButton, NTag, NText } from 'naive-ui'
import { FolderOpenOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import type { Skill } from '../../../../shared/types'

const props = defineProps<{ skill: Skill }>()

const emit = defineEmits<{
  update: [name: string]
  remove: [name: string]
  openLocation: [path: string]
}>()
</script>

<template>
  <div class="skill-row">
    <div class="skill-row-line1">
      <NText class="skill-row-name">{{ props.skill.name }}</NText>
      <div class="skill-row-actions">
        <NButton
          quaternary
          circle
          size="tiny"
          title="打开位置"
          @click="emit('openLocation', props.skill.path)"
        >
          <template #icon>
            <NIcon :size="16"><FolderOpenOutline /></NIcon>
          </template>
        </NButton>
        <NButton
          quaternary
          circle
          size="tiny"
          title="更新"
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
          title="删除"
          @click="emit('remove', props.skill.name)"
        >
          <template #icon>
            <NIcon :size="16"><TrashOutline /></NIcon>
          </template>
        </NButton>
      </div>
    </div>
    <div v-if="props.skill.agents.length > 0" class="skill-row-agents">
      <NTag
        v-for="agent in props.skill.agents"
        :key="agent"
        size="small"
        :bordered="false"
        round
        class="skill-row-tag"
      >
        {{ agent }}
      </NTag>
    </div>
  </div>
</template>

<style scoped>
.skill-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 12px;
  border-bottom: 1px solid #eaecf0;
  transition: background 0.15s ease;
}

.skill-row:hover {
  background: #f7f8fa;
  box-shadow: rgba(0, 0, 0, 0.04) 0 1px 2px;
}

.skill-row-line1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-row-name {
  font-weight: 500;
  font-size: 14px;
  color: #222222;
}

.skill-row-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.skill-row:hover .skill-row-actions {
  opacity: 1;
}

.skill-row-agents {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.skill-row-tag {
  font-size: 12px;
  font-weight: 400;
  --n-border-radius: 9999px;
}
</style>
