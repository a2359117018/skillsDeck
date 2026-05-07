<script setup lang="ts">
import { computed, ref } from 'vue'
import { NIcon } from 'naive-ui'
import { ChevronDownOutline, ChevronUpOutline } from '@vicons/ionicons5'
import { useSkillsStore } from '@renderer/stores/skills'

const skillsStore = useSkillsStore()
const expanded = ref(false)

const agentTags = computed(() => (skillsStore.sortedAgentResults || []).filter((a) => a.count > 0))

function isActive(agentFlag: string): boolean {
  return skillsStore.selectedAgents.includes(agentFlag)
}

function handleClick(agentFlag: string): void {
  skillsStore.toggleAgent(agentFlag)
}

function toggleExpand(): void {
  expanded.value = !expanded.value
}

const hasActiveFilter = computed(() => skillsStore.selectedAgents.length > 0)
</script>

<template>
  <div v-if="agentTags.length > 0" class="agent-filter-panel">
    <button class="panel-header" @click="toggleExpand">
      <span class="panel-header-label">
        筛选 Agent
        <span v-if="hasActiveFilter" class="panel-header-badge">
          {{ skillsStore.selectedAgents.length }}
        </span>
      </span>
      <NIcon :size="16" class="panel-header-icon">
        <ChevronDownOutline v-if="!expanded" />
        <ChevronUpOutline v-else />
      </NIcon>
    </button>
    <Transition name="panel-slide">
      <div v-show="expanded" class="panel-body">
        <button
          class="agent-tag-pill"
          :class="{ 'agent-tag-pill--active': skillsStore.selectedAgents.length === 0 }"
          @click="skillsStore.clearAgentFilter()"
        >
          全部
        </button>
        <button
          v-for="agent in agentTags"
          :key="agent.agentFlag"
          class="agent-tag-pill"
          :class="{ 'agent-tag-pill--active': isActive(agent.agentFlag) }"
          @click="handleClick(agent.agentFlag)"
        >
          {{ agent.agentName }}
          <span class="agent-tag-count">{{ agent.count }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.agent-filter-panel {
  flex-shrink: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  background: #ffffff;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: #45515e;
  transition: background 0.15s ease;
}

.panel-header:hover {
  background: #f7f8fa;
}

.panel-header-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-header-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9999px;
  background: #0a0a0a;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
}

.panel-header-icon {
  color: #8e8e93;
  transition: transform 0.2s ease;
}

.panel-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px 12px;
  border-top: 1px solid #e5e7eb;
  background: #f7f8fa;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.2s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
}

.agent-tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 9999px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #45515e;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  line-height: 1.4;
}

.agent-tag-pill:hover {
  border-color: #222222;
  color: #222222;
}

.agent-tag-pill--active {
  background: #0a0a0a;
  color: #ffffff;
  border-color: #0a0a0a;
}

.agent-tag-pill--active:hover {
  background: #222222;
  color: #ffffff;
  border-color: #222222;
}

.agent-tag-count {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.7;
}
</style>
