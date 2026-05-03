<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { NCollapse, NCollapseItem, NEmpty, NSpin, NTag, NText, NSpace } from 'naive-ui'
import { useSkillsStore } from '@renderer/stores/skills'
import { AGENTS } from '@renderer/constants/agents'
import type { Skill } from '../../../shared/types'

const skillsStore = useSkillsStore()

const agentNameMap = new Map(AGENTS.map((a) => [a.agentFlag, a.name]))

const groupedByAgent = computed(() => {
  const map = new Map<string, Skill[]>()
  for (const skill of skillsStore.installedSkills) {
    for (const agent of skill.agents) {
      if (!map.has(agent)) map.set(agent, [])
      map.get(agent)!.push(skill)
    }
  }
  return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length))
})

function getAgentName(agentFlag: string): string {
  return agentNameMap.get(agentFlag) || agentFlag
}

onMounted(() => {
  skillsStore.fetchInstalled(true)
})
</script>

<template>
  <div class="agent-view">
    <NSpin :show="skillsStore.loading">
      <NCollapse v-if="groupedByAgent.size > 0">
        <NCollapseItem
          v-for="[agent, skills] in groupedByAgent"
          :key="agent"
          :title="getAgentName(agent)"
          :name="agent"
        >
          <template #header-extra>
            <NTag size="small" :bordered="false">{{ skills.length }}</NTag>
          </template>
          <div v-for="skill in skills" :key="skill.name" class="skill-row">
            <NSpace justify="space-between" align="center">
              <NSpace vertical :size="2">
                <NText strong>{{ skill.name }}</NText>
                <NText depth="3" style="font-size: 12px">{{ skill.source }}</NText>
              </NSpace>
              <NText depth="3" style="font-size: 12px">v{{ skill.version }}</NText>
            </NSpace>
          </div>
        </NCollapseItem>
      </NCollapse>
      <NEmpty v-else description="暂无已安装的技能" style="margin-top: 48px" />
    </NSpin>
  </div>
</template>

<style scoped>
.agent-view {
  max-width: 900px;
}
.skill-row {
  padding: 8px 0;
  border-bottom: 1px solid var(--n-border-color);
}
.skill-row:last-child {
  border-bottom: none;
}
</style>
