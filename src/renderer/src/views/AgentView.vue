<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import {
  NDrawer,
  NDrawerContent,
  NEmpty,
  NTag,
  NText,
  NSpace,
  NButton,
  NIcon,
  NScrollbar,
  useMessage
} from 'naive-ui'
import { FolderOpenOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
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

const agentColors = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
  'linear-gradient(135deg, #f6d365, #fda085)',
  'linear-gradient(135deg, #a1c4fd, #c2e9fb)'
]

function getAgentColor(index: number): string {
  return agentColors[index % agentColors.length]
}

function resolveAgentByPath(skillPath: string): string[] {
  const normalized = skillPath.replace(/\\/g, '/')
  const matched: string[] = []
  for (const agent of AGENTS) {
    const globalDir = agent.globalPath.replace(/^~/, '').replace(/\\/g, '/')
    if (normalized.includes(globalDir)) {
      matched.push(agent.agentFlag)
    }
  }
  return matched.length > 0 ? matched : []
}

const groupedByAgent = computed(() => {
  const map = new Map<string, Skill[]>()
  for (const skill of skillsStore.installedSkills) {
    const resolvedAgents = resolveAgentByPath(skill.path)
    const agents = resolvedAgents.length > 0 ? resolvedAgents : skill.agents
    for (const agent of agents) {
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
    <NScrollbar class="agent-scroll">
      <div v-if="groupedByAgent.size > 0" class="agent-grid">
        <div
          v-for="([agent, skills], index) in groupedByAgent"
          :key="agent"
          class="card-base agent-card"
          @click="openAgentCard(agent)"
        >
          <div class="card-base-accent" :style="{ '--card-accent': getAgentColor(index) }" />
          <div class="card-base-body agent-card-body">
            <div class="agent-card-header">
              <NText class="card-base-text">{{ getAgentName(agent) }}</NText>
              <NTag size="small" :bordered="false" round type="info">{{ skills.length }}</NTag>
            </div>
            <div class="agent-card-footer">
              <NText depth="3" style="font-size: 12px">{{ skills.length }} 个技能</NText>
              <div class="agent-folder-btn">
                <NButton
                  size="tiny"
                  quaternary
                  circle
                  title="打开技能文件夹"
                  @click="openAgentFolder(agent, $event)"
                >
                  <template #icon>
                    <NIcon :size="14"><FolderOpenOutline /></NIcon>
                  </template>
                </NButton>
              </div>
            </div>
          </div>
        </div>
      </div>
      <NEmpty v-else description="暂无已安装的技能" style="margin-top: 48px" />
    </NScrollbar>

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
              <NButton
                quaternary
                circle
                size="tiny"
                title="打开位置"
                @click="handleOpenLocation(skill.path)"
              >
                <template #icon>
                  <NIcon :size="15"><FolderOpenOutline /></NIcon>
                </template>
              </NButton>
              <NButton
                quaternary
                circle
                size="tiny"
                title="更新"
                :loading="updatingSkill === skill.name"
                @click="handleUpdate(skill.name)"
              >
                <template #icon>
                  <NIcon :size="15"><RefreshOutline /></NIcon>
                </template>
              </NButton>
              <NButton
                quaternary
                circle
                size="tiny"
                type="error"
                title="删除"
                :loading="removingSkill === skill.name"
                @click="handleRemove(skill.name)"
              >
                <template #icon>
                  <NIcon :size="15"><TrashOutline /></NIcon>
                </template>
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
  display: flex;
  flex-direction: column;
  height: 100%;
}

.agent-scroll {
  flex: 1;
  min-height: 0;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  padding-bottom: 24px;
}

.agent-card {
  cursor: pointer;
}

.agent-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agent-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agent-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agent-folder-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.agent-card:hover .agent-folder-btn,
.agent-card:focus-within .agent-folder-btn {
  opacity: 1;
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
  border-bottom: 1px solid #e8eaee;
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
  color: #333;
}
</style>
