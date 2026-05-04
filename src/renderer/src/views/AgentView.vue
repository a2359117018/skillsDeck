<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { NDrawer, NDrawerContent, NEmpty, NTag, NText, NSpace, NButton, useMessage } from 'naive-ui'
import { useSkillsStore } from '@renderer/stores/skills'
import { useConfirm } from '@renderer/composables/useConfirm'
import { AGENTS } from '@renderer/constants/agents'
import type { Skill } from '../../../shared/types'

const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdate, confirmRemove } = useConfirm()

skillsStore.setMessageHandler((msg, type) => {
  message[type](msg)
})

const agentNameMap = new Map(AGENTS.map((a) => [a.agentFlag, a.name]))
const agentPathMap = new Map(AGENTS.map((a) => [a.agentFlag, a.globalPath]))

const selectedAgent = ref<string | null>(null)
const drawerVisible = ref(false)
const updatingSkill = ref<string | null>(null)
const removingSkill = ref<string | null>(null)

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

const selectedSkills = computed(() => {
  if (!selectedAgent.value) return []
  return groupedByAgent.value.get(selectedAgent.value) || []
})

function getAgentName(agentFlag: string): string {
  return agentNameMap.get(agentFlag) || agentFlag
}

function openAgentCard(agent: string): void {
  selectedAgent.value = agent
  drawerVisible.value = true
}

function closeDrawer(): void {
  drawerVisible.value = false
  selectedAgent.value = null
}

function openAgentFolder(agentFlag: string, e?: Event): void {
  e?.stopPropagation()
  let folderPath = agentPathMap.get(agentFlag)
  if (!folderPath) {
    const skills = groupedByAgent.value.get(agentFlag)
    if (skills && skills.length > 0 && skills[0].path) {
      const parts = skills[0].path.replace(/\\/g, '/').split('/')
      const idx = parts.lastIndexOf('skills')
      if (idx !== -1) {
        folderPath = parts.slice(0, idx + 1).join('/')
      }
    }
  }
  if (folderPath) {
    skillsStore.openLocation(folderPath)
  } else {
    message.warning('未找到此 Agent 的技能文件夹路径')
  }
}

async function handleOpenLocation(path: string): Promise<void> {
  await skillsStore.openLocation(path)
}

async function handleUpdate(name: string): Promise<void> {
  const confirmed = await confirmUpdate(name)
  if (!confirmed) return
  updatingSkill.value = name
  try {
    const result = await skillsStore.update(name, true)
    if (result.success) {
      message.success(`${name} 更新成功`)
      await skillsStore.fetchInstalled(true)
    } else {
      message.error(`${name} 更新失败`)
    }
  } catch {
    message.error(`${name} 更新失败`)
  } finally {
    updatingSkill.value = null
  }
}

async function handleRemove(name: string): Promise<void> {
  const confirmed = await confirmRemove(name)
  if (!confirmed) return
  removingSkill.value = name
  try {
    const result = await skillsStore.remove(name, true)
    if (result.success) {
      message.success(`${name} 已删除`)
      await skillsStore.fetchInstalled(true)
    } else {
      message.error(`${name} 删除失败`)
    }
  } catch {
    message.error(`${name} 删除失败`)
  } finally {
    removingSkill.value = null
  }
}

onMounted(() => skillsStore.fetchInstalled(true))
</script>

<template>
  <div class="agent-view">
    <div v-if="groupedByAgent.size > 0" class="agent-grid">
      <div
        v-for="[agent, skills] in groupedByAgent"
        :key="agent"
        class="agent-card"
        @click="openAgentCard(agent)"
      >
        <div class="agent-card-header">
          <NText class="agent-name">{{ getAgentName(agent) }}</NText>
          <NTag size="small" :bordered="false" round type="info">{{ skills.length }}</NTag>
        </div>
        <div class="agent-card-footer">
          <NText depth="3" style="font-size: 12px">{{ skills.length }} 个技能</NText>
          <NButton
            size="tiny"
            quaternary
            title="打开技能文件夹"
            @click="openAgentFolder(agent, $event)"
          >
            📂
          </NButton>
        </div>
      </div>
    </div>
    <NEmpty v-else description="暂无已安装的技能" style="margin-top: 48px" />

    <NDrawer
      :show="drawerVisible"
      :width="480"
      placement="right"
      @update:show="
        (val: boolean) => {
          if (!val) closeDrawer()
        }
      "
      @mask-click="closeDrawer"
    >
      <NDrawerContent closable :native-scrollbar="false" @close="closeDrawer">
        <template #header>
          <NSpace align="center" :size="8">
            <NText strong style="font-size: 16px">
              {{ selectedAgent ? getAgentName(selectedAgent) : '' }}
            </NText>
            <NTag size="small" :bordered="false" type="info">
              {{ selectedSkills.length }} 个技能
            </NTag>
          </NSpace>
        </template>
        <div class="skill-table">
          <div v-for="skill in selectedSkills" :key="skill.name" class="skill-table-row">
            <div class="skill-table-info">
              <NText strong class="skill-table-name">{{ skill.name }}</NText>
            </div>
            <NSpace :size="4" align="center">
              <NButton size="tiny" quaternary @click="handleOpenLocation(skill.path)">
                打开位置
              </NButton>
              <NButton
                size="tiny"
                quaternary
                :loading="updatingSkill === skill.name"
                @click="handleUpdate(skill.name)"
              >
                更新
              </NButton>
              <NButton
                size="tiny"
                quaternary
                type="error"
                :loading="removingSkill === skill.name"
                @click="handleRemove(skill.name)"
              >
                删除
              </NButton>
            </NSpace>
          </div>
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.agent-view {
  max-width: 960px;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.agent-card {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--n-border-color);
  background-color: var(--n-color);
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agent-card:hover {
  border-color: var(--n-primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.agent-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agent-name {
  font-weight: 600;
  font-size: 15px;
}

.agent-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-table {
  display: flex;
  flex-direction: column;
}

.skill-table-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--n-border-color);
}

.skill-table-row:last-child {
  border-bottom: none;
}

.skill-table-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.skill-table-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
