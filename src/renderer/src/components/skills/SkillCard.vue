<script setup lang="ts">
import { NIcon, NButton, NTag, NText } from 'naive-ui'
import { FolderOpenOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import { AGENTS } from '@renderer/constants/agents'
import type { Skill } from '../../../../shared/types'

const agentNameMap = new Map(AGENTS.map((a) => [a.agentFlag, a.name]))

const props = defineProps<{ skill: Skill }>()

const emit = defineEmits<{
  update: [name: string]
  remove: [name: string]
  openLocation: [path: string]
}>()

function getAgentName(flag: string): string {
  return agentNameMap.get(flag) || flag
}
</script>

<template>
  <div class="card-base skill-card">
    <div class="card-base-accent" />
    <div class="card-base-body skill-card-body">
      <div class="skill-card-top">
        <NText class="card-base-text">{{ props.skill.name }}</NText>
        <div class="skill-actions">
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
      <div class="skill-agents">
        <NTag
          v-for="agent in props.skill.agents"
          :key="agent"
          size="small"
          :bordered="false"
          round
          type="info"
        >
          {{ getAgentName(agent) }}
        </NTag>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skill-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.skill-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.skill-card:hover .skill-actions,
.skill-card:focus-within .skill-actions {
  opacity: 1;
}

.skill-agents {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
