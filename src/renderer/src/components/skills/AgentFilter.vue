<script setup lang="ts">
import { computed } from 'vue'
import { NSelect } from 'naive-ui'
import { useSkillsStore } from '@renderer/stores/skills'

const skillsStore = useSkillsStore()
const selectedAgents = defineModel<string[]>({ default: () => [] })

const agentOptions = computed(() =>
  (skillsStore.sortedAgentResults || [])
    .filter((a) => a.count > 0)
    .map((a) => ({
      label: `${a.agentName} (${a.count})`,
      value: a.agentFlag
    }))
)
</script>

<template>
  <NSelect
    v-model:value="selectedAgents"
    :options="agentOptions"
    multiple
    filterable
    placeholder="筛选 Agent"
    clearable
    max-tag-count="responsive"
    style="min-width: 260px"
  />
</template>
