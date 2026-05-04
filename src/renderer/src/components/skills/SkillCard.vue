<script setup lang="ts">
import { NButton, NSpace, NTag, NText } from 'naive-ui'
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
  <div class="skill-card">
    <NText class="skill-name">{{ props.skill.name }}</NText>
    <div class="skill-agents">
      <NTag v-for="agent in props.skill.agents" :key="agent" size="small" :bordered="false" round>
        {{ getAgentName(agent) }}
      </NTag>
    </div>
    <NSpace class="skill-actions" :size="8" align="center">
      <NButton size="tiny" quaternary @click="emit('openLocation', props.skill.source)">
        打开位置
      </NButton>
      <NButton size="tiny" quaternary @click="emit('update', props.skill.name)"> 更新 </NButton>
      <NButton size="tiny" quaternary type="error" @click="emit('remove', props.skill.name)">
        删除
      </NButton>
    </NSpace>
  </div>
</template>

<style scoped>
.skill-card {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--n-border-color);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-name {
  font-weight: 600;
  font-size: 15px;
}

.skill-agents {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.skill-actions {
  margin-top: auto;
}
</style>
