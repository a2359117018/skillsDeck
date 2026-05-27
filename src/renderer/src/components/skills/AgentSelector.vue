<script setup lang="ts">
import { ref, computed } from 'vue'
import { NCheckbox, NButton, NInput, NSpace, NText, NIcon } from 'naive-ui'
import ChevronDownOutline from '@vicons/ionicons5/ChevronDownOutline'
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
const expanded = ref(false)

const commonAgents = getCommonAgents()
const commonFlags = new Set(commonAgents.map((a) => a.agentFlag))

const otherAgents = computed(() => AGENTS.filter((a) => !commonFlags.has(a.agentFlag)))

const filteredOtherAgents = computed(() => {
  const text = filterText.value.toLowerCase()
  if (!text) return otherAgents.value
  return otherAgents.value.filter(
    (a) => a.name.toLowerCase().includes(text) || a.agentFlag.toLowerCase().includes(text)
  )
})

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

function toggleGlobal(val: boolean): void {
  emit('update:isGlobal', val)
  if (val) {
    emit('update:modelValue', [])
  }
}
</script>

<template>
  <div class="agent-selector">
    <NCheckbox :checked="isGlobal" class="global-checkbox" @update:checked="toggleGlobal">
      全局安装（适用于所有 AI 工具）
    </NCheckbox>

    <div :class="['agent-section', { disabled: isGlobal }]">
      <NText depth="3" class="section-label">常用 AI 工具</NText>
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

      <!-- 改为 button 以支持键盘聚焦和激活，提升可访问性 -->
      <button
        type="button"
        class="expand-bar"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <NText depth="3" class="expand-text">
          {{ expanded ? '收起' : '安装到其他 agent...' }}
        </NText>
        <NIcon
          :size="14"
          :class="['expand-icon', { rotated: expanded }]"
          :component="ChevronDownOutline"
        />
      </button>

      <div v-if="expanded" class="other-agents">
        <NInput
          v-model:value="filterText"
          placeholder="搜索 AI 工具名称..."
          clearable
          size="small"
          class="filter-input"
        />
        <div class="agent-list-scroll">
          <NSpace vertical :size="4">
            <NCheckbox
              v-for="agent in filteredOtherAgents"
              :key="agent.agentFlag"
              :checked="modelValue.includes(agent.agentFlag)"
              @update:checked="() => toggleAgent(agent.agentFlag)"
            >
              {{ agent.name }}
            </NCheckbox>
          </NSpace>
        </div>
      </div>

      <NText depth="3" class="selected-count"> 已选: {{ modelValue.length }} 个 agent </NText>
    </div>
  </div>
</template>

<style scoped>
.agent-selector {
  width: 100%;
}

.global-checkbox {
  display: block;
  margin-bottom: var(--space-sm);
}

.agent-section {
  margin-top: var(--space-md);
  transition: opacity var(--transition-slow);
}

.agent-section.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.section-label {
  font-size: var(--text-caption);
  margin-bottom: var(--space-sm);
  display: block;
  color: var(--color-muted);
}

.common-agents {
  margin-bottom: var(--space-md);
}

.expand-bar {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
  padding: var(--space-xs) 0;
  margin-bottom: var(--space-sm);
  user-select: none;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: inherit;
  width: 100%;
  text-align: left;
}

.expand-text {
  font-size: var(--text-caption);
}

.expand-icon {
  transition: transform var(--transition-slow);
  color: var(--color-muted);
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

.other-agents {
  margin-bottom: var(--space-md);
}

.filter-input {
  margin-bottom: var(--space-sm);
}

.agent-list-scroll {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  background: var(--color-surface);
}

.selected-count {
  font-size: var(--text-micro);
  margin-top: var(--space-sm);
  display: block;
  color: var(--color-muted);
}
</style>
