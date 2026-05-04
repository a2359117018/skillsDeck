<script setup lang="ts">
import { computed } from 'vue'
import { NSelect } from 'naive-ui'
import { AGENTS } from '@renderer/constants/agents'

const selectedAgents = defineModel<string[]>({ default: () => [] })

const agentOptions = computed(() =>
  AGENTS.map((a) => ({
    label: a.name,
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
