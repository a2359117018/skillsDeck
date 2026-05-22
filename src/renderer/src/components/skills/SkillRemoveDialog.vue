<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NCard, NRadioGroup, NRadio, NButton, NIcon, NText } from 'naive-ui'
import TrashOutline from '@vicons/ionicons5/TrashOutline'
import type { InstalledSkillAgent } from '../../../../shared/types'
import { AGENTS } from '../../constants/agents'

interface RemoveResult {
  confirmed: boolean
  agent?: string
}

const props = defineProps<{
  skillName: string
  agents: InstalledSkillAgent[]
}>()

const emit = defineEmits<{
  done: [result: RemoveResult]
}>()

const visible = ref(true)

/** '__all__' means delete from every agent; any other value is a specific agentFlag */
const selectedTarget = ref<string>('__all__')

const agentDisplayNames = new Map(AGENTS.map((a) => [a.agentFlag, a.name]))

function getAgentLabel(agentFlag: string): string {
  return agentDisplayNames.get(agentFlag) || agentFlag
}

function handleConfirm(): void {
  const agent = selectedTarget.value === '__all__' ? undefined : selectedTarget.value
  visible.value = false
  emit('done', { confirmed: true, agent })
}

function handleCancel(): void {
  visible.value = false
  emit('done', { confirmed: false })
}
</script>

<template>
  <NModal
    v-model:show="visible"
    :mask-closable="false"
    :trap-focus="true"
    @mask-click="handleCancel"
  >
    <NCard
      style="width: min(420px, 90vw)"
      :bordered="false"
      :title="`删除「${props.skillName}」`"
      size="medium"
      role="dialog"
      aria-modal="true"
    >
      <div class="remove-dialog-body">
        <NText depth="3" class="remove-dialog-hint">选择删除范围</NText>
        <NRadioGroup v-model:value="selectedTarget" class="remove-dialog-radios">
          <NRadio value="__all__">从所有 AI 工具中删除（共 {{ props.agents.length }} 个）</NRadio>
          <NRadio v-for="agent in props.agents" :key="agent.name" :value="agent.name">
            {{ getAgentLabel(agent.name) }}
          </NRadio>
        </NRadioGroup>
      </div>
      <template #footer>
        <div class="remove-dialog-footer">
          <NButton round @click="handleCancel">保留技能</NButton>
          <NButton type="error" round @click="handleConfirm">
            <template #icon>
              <NIcon :size="14"><TrashOutline /></NIcon>
            </template>
            删除
          </NButton>
        </div>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.remove-dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.remove-dialog-hint {
  font-size: var(--text-body-sm);
}

.remove-dialog-radios {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.remove-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}
</style>
