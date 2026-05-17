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
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: var(--space-md);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-canvas);
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  color: var(--color-stone);
  transition: background var(--transition-base);
}

.panel-header:hover {
  background: var(--color-surface);
}

.panel-header-label {
  display: flex;
  align-items: center;
  gap: var(--space-xxs);
}

.panel-header-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 var(--space-xxs);
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-canvas);
  font-size: var(--text-micro);
  font-weight: var(--weight-semibold);
}

.panel-header-icon {
  color: var(--color-muted);
  transition: transform var(--transition-slow);
}

.panel-body {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md) var(--space-md);
  border-top: 1px solid var(--color-hairline);
  background: var(--color-surface);
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all var(--transition-base);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
}

.agent-tag-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xxs);
  padding: var(--space-xxs) var(--space-md);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-hairline);
  background: var(--color-canvas);
  color: var(--color-stone);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: inherit;
  line-height: var(--leading-normal);
}

.agent-tag-pill:hover {
  border-color: var(--color-ink);
  color: var(--color-ink);
}

.agent-tag-pill--active {
  background: var(--color-primary);
  color: var(--color-canvas);
  border-color: var(--color-primary);
}

.agent-tag-pill--active:hover {
  background: var(--color-ink);
  border-color: var(--color-ink);
}

.agent-tag-count {
  font-size: var(--text-micro);
  font-weight: var(--weight-regular);
  opacity: 0.7;
}
</style>
