<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NCheckbox, NButton, NInput, NSpace, NText } from 'naive-ui'
import { AGENTS, getCommonAgents } from '../../constants/agents'

const props = defineProps<{
  modelValue: string[]
  isGlobal: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:isGlobal': [value: boolean]
}>()

const filterText = ref('')

watch(
  () => props.isGlobal,
  (global) => {
    if (global) emit('update:modelValue', [])
  }
)

const commonAgents = getCommonAgents()

const filteredAgents = computed(() => {
  const text = filterText.value.toLowerCase()
  if (!text) return AGENTS
  return AGENTS.filter(
    (a) => a.name.toLowerCase().includes(text) || a.agentFlag.toLowerCase().includes(text)
  )
})

const allFilteredSelected = computed(
  () =>
    filteredAgents.value.length > 0 &&
    filteredAgents.value.every((a) => props.modelValue.includes(a.agentFlag))
)

function toggleAgent(agentFlag: string): void {
  if (props.isGlobal) return
  const current = [...props.modelValue]
  const idx = current.indexOf(agentFlag)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(agentFlag)
  }
  emit('update:modelValue', current)
}

function toggleSelectAll(): void {
  const flags = filteredAgents.value.map((a) => a.agentFlag)
  if (allFilteredSelected.value) {
    emit(
      'update:modelValue',
      props.modelValue.filter((s) => !flags.includes(s))
    )
  } else {
    emit('update:modelValue', [...new Set([...props.modelValue, ...flags])])
  }
}

function toggleGlobal(val: boolean): void {
  emit('update:isGlobal', val)
}

const canConfirm = computed(() => {
  if (props.isGlobal) return true
  return props.modelValue.length > 0
})

defineExpose({ canConfirm })
</script>

<template>
  <div class="agent-selector">
    <NCheckbox :checked="isGlobal" @update:checked="toggleGlobal">
      全局安装（不指定 agent）
    </NCheckbox>

    <div v-if="!isGlobal" class="agent-section">
      <NText depth="3" class="section-label">常用 Agent</NText>
      <NSpace :size="8" :wrap="true" class="common-agents">
        <NButton
          v-for="agent in commonAgents"
          :key="agent.agentFlag"
          :type="modelValue.includes(agent.agentFlag) ? 'primary' : 'default'"
          size="small"
          round
          @click="toggleAgent(agent.agentFlag)"
        >
          {{ agent.name }}
        </NButton>
      </NSpace>

      <NText depth="3" class="section-label">筛选 Agent</NText>
      <NInput
        v-model:value="filterText"
        placeholder="搜索 agent..."
        clearable
        size="small"
        class="filter-input"
      />

      <NCheckbox
        :checked="allFilteredSelected"
        :indeterminate="
          modelValue.some((s) => filteredAgents.some((a) => a.agentFlag === s)) &&
          !allFilteredSelected
        "
        class="select-all-checkbox"
        @update:checked="toggleSelectAll"
      >
        全选当前筛选
      </NCheckbox>
      <div class="agent-list-scroll">
        <NSpace vertical :size="4">
          <NCheckbox
            v-for="agent in filteredAgents"
            :key="agent.agentFlag"
            :checked="modelValue.includes(agent.agentFlag)"
            @update:checked="() => toggleAgent(agent.agentFlag)"
          >
            {{ agent.name }}
          </NCheckbox>
        </NSpace>
      </div>

      <NText depth="3" class="selected-count"> 已选: {{ modelValue.length }} 个 agent </NText>
    </div>
  </div>
</template>

<style scoped>
.agent-selector {
  width: 100%;
}

.agent-section {
  margin-top: var(--space-md);
}

.section-label {
  font-size: 13px;
  margin-bottom: var(--space-sm);
  display: block;
  color: var(--color-muted);
}

.common-agents {
  margin-bottom: var(--space-md);
}

.filter-input {
  margin-bottom: var(--space-sm);
}

.select-all-checkbox {
  margin-bottom: var(--space-sm);
}

.agent-list-scroll {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  background: var(--color-surface);
}

.selected-count {
  font-size: 12px;
  margin-top: var(--space-sm);
  display: block;
  color: var(--color-muted);
}
</style>
