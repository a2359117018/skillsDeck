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
  NInput,
  useMessage
} from 'naive-ui'
import { FolderOpenOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import { useSkillsStore } from '@renderer/stores/skills'
import { useConfirm } from '@renderer/composables/useConfirm'
import type { AgentScanResult } from '../../../shared/types'

const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdate, confirmRemove } = useConfirm()

skillsStore.setMessageHandler((msg, type) => {
  message[type](msg)
})

const agentSearchKeyword = ref('')
const selectedAgent = ref<AgentScanResult | null>(null)
const drawerVisible = ref(false)
const updatingSkill = ref<string | null>(null)
const removingSkill = ref<string | null>(null)

const visibleAgentResults = computed(() =>
  skillsStore.sortedAgentResults.filter((a) => {
    if (a.count === 0) return false
    if (!agentSearchKeyword.value) return true
    return a.agentName.toLowerCase().includes(agentSearchKeyword.value.toLowerCase())
  })
)

function openAgentCard(agent: AgentScanResult): void {
  selectedAgent.value = agent
  drawerVisible.value = true
}

function closeDrawer(): void {
  drawerVisible.value = false
  selectedAgent.value = null
}

function openAgentFolder(agent: AgentScanResult, e?: Event): void {
  e?.stopPropagation()
  skillsStore.openLocation(agent.globalPath)
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
    const result = await skillsStore.remove(name, true, selectedAgent.value?.agentFlag)
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

async function handleRefresh(): Promise<void> {
  await skillsStore.fetchInstalled(true)
}

onMounted(() => skillsStore.fetchInstalled(true))
</script>

<template>
  <div class="agent-view">
    <div class="agent-header">
      <NInput
        v-model:value="agentSearchKeyword"
        placeholder="搜索 Agent..."
        clearable
        round
        class="agent-search-input"
      />
      <NButton size="small" quaternary circle title="刷新" @click="handleRefresh">
        <template #icon>
          <NIcon :size="18"><RefreshOutline /></NIcon>
        </template>
      </NButton>
    </div>
    <NScrollbar class="agent-scroll">
      <div v-if="visibleAgentResults.length > 0" class="agent-grid">
        <div
          v-for="agent in visibleAgentResults"
          :key="agent.agentFlag"
          class="agent-card"
          @click="openAgentCard(agent)"
        >
          <div class="agent-card-body">
            <div class="agent-card-header">
              <NText class="card-base-text">{{ agent.agentName }}</NText>
              <NTag size="small" :bordered="false" round style="background: rgba(255, 255, 255, 0.25); color: white;">{{ agent.count }}</NTag>
            </div>
            <div class="agent-card-footer">
              <NText style="font-size: var(--text-body-sm)">{{ agent.count }} 个技能</NText>
              <div class="agent-folder-btn">
                <NButton
                  size="tiny"
                  quaternary
                  circle
                  title="打开技能文件夹"
                  style="color: white"
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
              {{ selectedAgent ? selectedAgent.agentName : '' }}
            </NText>
            <NTag size="small" :bordered="false" type="info">
              {{ selectedAgent ? selectedAgent.count : 0 }} 个技能
            </NTag>
          </NSpace>
        </template>
        <div v-if="selectedAgent" class="skill-table">
          <div v-for="skillName in selectedAgent.skills" :key="skillName" class="skill-table-row">
            <div class="skill-table-info">
              <NText strong class="skill-table-name">{{ skillName }}</NText>
            </div>
            <NSpace :size="4" align="center">
              <NButton
                quaternary
                circle
                size="tiny"
                title="打开位置"
                @click="handleOpenLocation(selectedAgent!.globalPath + '\\' + skillName)"
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
                :loading="updatingSkill === skillName"
                @click="handleUpdate(skillName)"
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
                :loading="removingSkill === skillName"
                @click="handleRemove(skillName)"
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

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
  flex-shrink: 0;
  gap: var(--space-md);
}

.agent-search-input {
  max-width: 240px;
}

.agent-scroll {
  flex: 1;
  min-height: 0;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-lg);
  padding-bottom: var(--space-xl);
}

.agent-card {
  cursor: pointer;
  position: relative;
  border-radius: var(--radius-hero);
  padding: var(--space-lg);
  color: white;
  transition: all var(--transition-base);
}

.agent-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  border-radius: var(--radius-hero);
  pointer-events: none;
}

.agent-card:nth-child(4n+1) {
  background: linear-gradient(135deg, var(--color-brand-coral), #ff7a59);
}

.agent-card:nth-child(4n+2) {
  background: linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-blue-200));
}

.agent-card:nth-child(4n+3) {
  background: linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-magenta));
}

.agent-card:nth-child(4n+4) {
  background: linear-gradient(135deg, var(--color-brand-magenta), #ff6ec7);
}

.agent-card:hover {
  box-shadow: var(--shadow-3), 0 0 20px rgba(255, 85, 48, 0.3);
  transform: translateY(-2px);
}

.agent-card:nth-child(4n+2):hover {
  box-shadow: var(--shadow-3), 0 0 20px rgba(20, 86, 240, 0.3);
}

.agent-card:nth-child(4n+3):hover {
  box-shadow: var(--shadow-3), 0 0 20px rgba(168, 85, 247, 0.3);
}

.agent-card:nth-child(4n+4):hover {
  box-shadow: var(--shadow-3), 0 0 20px rgba(234, 94, 193, 0.3);
}

.agent-card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  position: relative;
  z-index: 1;
}

.agent-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agent-card-header .card-base-text {
  color: white !important;
  font-size: var(--text-heading-md);
  font-weight: var(--weight-semibold);
}

.agent-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agent-folder-btn {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.agent-card:hover .agent-folder-btn,
.agent-card:focus-within .agent-folder-btn {
  opacity: 1;
}

.agent-card-footer :deep(.n-text) {
  color: rgba(255, 255, 255, 0.9) !important;
}

.skill-table {
  display: flex;
  flex-direction: column;
}

.skill-table-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--color-hairline);
}

.skill-table-row:last-child {
  border-bottom: none;
}

.skill-table-info {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
  flex: 1;
}

.skill-table-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-ink);
}
</style>
