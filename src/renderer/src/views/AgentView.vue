<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import {
  NDrawer,
  NDrawerContent,
  NEmpty,
  NText,
  NSpace,
  NButton,
  NIcon,
  NScrollbar,
  NInput,
  useMessage
} from 'naive-ui'
import {
  FolderOpenOutline,
  RefreshOutline,
  TrashOutline,
  SearchOutline
} from '@vicons/ionicons5'
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

const agentCount = computed(() => visibleAgentResults.value.length)

function getAgentInitials(name: string): string {
  return name.slice(0, 2)
}

function getAgentColorIndex(index: number): number {
  return index % 4
}

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
  <div class="agent-page">
    <div class="container">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-content">
          <h1 class="hero-title">
            Agent 管理
            <span class="hero-badge">{{ agentCount }}</span>
          </h1>
          <div class="hero-actions">
            <NButton
              text
              class="hero-action-btn"
              :loading="skillsStore.fetching"
              @click="handleRefresh"
            >
              <template #icon>
                <NIcon :size="18"><RefreshOutline /></NIcon>
              </template>
              刷新
            </NButton>
          </div>
        </div>
        <div class="hero-bg">
          <div class="hero-blob hero-blob-1"></div>
          <div class="hero-blob hero-blob-2"></div>
          <div class="hero-blob hero-blob-3"></div>
        </div>
      </div>

      <!-- Search Section -->
      <div class="search-section">
        <NInput
          v-model:value="agentSearchKeyword"
          placeholder="搜索 Agent..."
          clearable
          size="large"
          class="search-input"
        >
          <template #prefix>
            <NIcon :size="18" :color="'var(--color-muted)'">
              <SearchOutline />
            </NIcon>
          </template>
        </NInput>
        <NText class="search-count">{{ agentCount }} 个 Agent</NText>
      </div>

      <!-- Agent Grid -->
      <NScrollbar class="agent-scroll">
        <div v-if="visibleAgentResults.length > 0" class="agent-grid">
          <div
            v-for="(agent, index) in visibleAgentResults"
            :key="agent.agentFlag"
            class="agent-card"
            :class="['color-' + getAgentColorIndex(index)]"
            @click="openAgentCard(agent)"
          >
            <div class="agent-card-avatar">
              {{ getAgentInitials(agent.agentName) }}
            </div>
            <div class="agent-card-name">
              <NText strong>{{ agent.agentName }}</NText>
            </div>
            <div class="agent-card-info">
              <NText depth="3">{{ agent.count }} 个技能</NText>
              <NButton
                size="tiny"
                quaternary
                circle
                title="打开技能文件夹"
                class="agent-folder-btn"
                @click="openAgentFolder(agent, $event)"
              >
                <template #icon>
                  <NIcon :size="14"><FolderOpenOutline /></NIcon>
                </template>
              </NButton>
            </div>
          </div>
        </div>
        <NEmpty v-else description="暂无已安装的 Agent" class="empty-state" />
      </NScrollbar>
    </div>

    <!-- Drawer -->
    <NDrawer
      :show="drawerVisible"
      :width="500"
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
          <span></span>
        </template>
        <div v-if="selectedAgent" class="drawer-wrapper">
          <div
            class="drawer-header"
            :class="[
              'drawer-color-' +
                getAgentColorIndex(
                  visibleAgentResults.findIndex(
                    (a) => a.agentFlag === selectedAgent!.agentFlag
                  )
                )
            ]"
          >
            <div class="drawer-header-content">
              <div>
                <div class="drawer-header-name">{{ selectedAgent.agentName }}</div>
                <div class="drawer-header-count">{{ selectedAgent.count }} 个技能</div>
              </div>
              <NButton
                size="small"
                class="drawer-folder-btn"
                @click="openAgentFolder(selectedAgent!)"
              >
                <template #icon>
                  <NIcon :size="16"><FolderOpenOutline /></NIcon>
                </template>
                打开文件夹
              </NButton>
            </div>
          </div>
          <NScrollbar class="drawer-scroll">
            <div class="drawer-body">
              <div
                v-for="skillName in selectedAgent.skills"
                :key="skillName"
                class="skill-row"
              >
                <div class="skill-row-info">
                  <NText strong class="skill-row-name">{{ skillName }}</NText>
                  <NText depth="3" class="skill-row-path">
                    {{
                      selectedAgent.globalPath
                        .split(/[/\\]/)
                        .slice(-2)
                        .join('/')
                    }}/{{ skillName }}
                  </NText>
                </div>
                <NSpace :size="8" align="center">
                  <NButton
                    text
                    size="small"
                    type="primary"
                    title="更新"
                    :loading="updatingSkill === skillName"
                    @click="handleUpdate(skillName)"
                  >
                    <template #icon>
                      <NIcon :size="16"><RefreshOutline /></NIcon>
                    </template>
                    更新
                  </NButton>
                  <NButton
                    text
                    size="small"
                    type="error"
                    title="删除"
                    :loading="removingSkill === skillName"
                    @click="handleRemove(skillName)"
                  >
                    <template #icon>
                      <NIcon :size="16"><TrashOutline /></NIcon>
                    </template>
                    删除
                  </NButton>
                </NSpace>
              </div>
            </div>
          </NScrollbar>
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
/* Page Layout */
.agent-page {
  min-height: 100vh;
  background: var(--color-canvas);
  padding: var(--space-xl);
}

.container {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--space-xl) * 2);
}

/* Hero Section */
.hero-section {
  position: relative;
  background: linear-gradient(135deg, var(--color-brand-coral), var(--color-brand-purple));
  border-radius: var(--radius-xl);
  padding: var(--space-xl) var(--space-xxl);
  margin-bottom: var(--space-xl);
  overflow: hidden;
  color: white;
  flex-shrink: 0;
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-lg);
}

.hero-title {
  font-size: var(--text-heading-lg);
  font-weight: var(--weight-bold);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.hero-badge {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  padding: var(--space-xxs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-semibold);
}

.hero-actions {
  display: flex;
  gap: var(--space-sm);
}

.hero-action-btn {
  color: white !important;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--radius-full);
  padding: var(--space-xxs) var(--space-md);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all var(--transition-base);
}

.hero-action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.6);
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.hero-blob {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
  filter: blur(40px);
}

.hero-blob-1 {
  width: 200px;
  height: 200px;
  top: -50px;
  right: -50px;
}

.hero-blob-2 {
  width: 150px;
  height: 150px;
  bottom: -30px;
  left: 20%;
}

.hero-blob-3 {
  width: 100px;
  height: 100px;
  top: 50%;
  right: 30%;
}

/* Search Section */
.search-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
}

.search-input :deep(.n-input) {
  border-radius: var(--radius-full);
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
}

.search-count {
  color: var(--color-stone);
  font-size: var(--text-body-sm);
  white-space: nowrap;
}

/* Agent Grid */
.agent-scroll {
  flex: 1;
  min-height: 0;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-md);
  padding-bottom: var(--space-xl);
}

.empty-state {
  margin-top: var(--space-xxxl);
  display: flex;
  justify-content: center;
}

/* Agent Cards */
.agent-card {
  cursor: pointer;
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid;
  transition: all var(--transition-base);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.agent-card:hover {
  box-shadow: var(--shadow-3);
  transform: translateY(-2px);
}

/* Card Color Themes */
.agent-card.color-0 {
  background: #fff5f2;
  border-color: #ffe0d6;
}
.agent-card.color-0:hover {
  box-shadow: var(--shadow-3), 0 0 20px rgba(255, 85, 48, 0.12);
}
.agent-card.color-0 .agent-card-avatar {
  background: var(--color-brand-coral);
}
.agent-card.color-0 .agent-folder-btn {
  color: var(--color-brand-coral);
}

.agent-card.color-1 {
  background: #eff6ff;
  border-color: #dbeafe;
}
.agent-card.color-1:hover {
  box-shadow: var(--shadow-3), 0 0 20px rgba(20, 86, 240, 0.12);
}
.agent-card.color-1 .agent-card-avatar {
  background: var(--color-brand-blue);
}
.agent-card.color-1 .agent-folder-btn {
  color: var(--color-brand-blue);
}

.agent-card.color-2 {
  background: #fdf2f8;
  border-color: #fce7f3;
}
.agent-card.color-2:hover {
  box-shadow: var(--shadow-3), 0 0 20px rgba(234, 94, 193, 0.12);
}
.agent-card.color-2 .agent-card-avatar {
  background: var(--color-brand-magenta);
}
.agent-card.color-2 .agent-folder-btn {
  color: var(--color-brand-magenta);
}

.agent-card.color-3 {
  background: #faf5ff;
  border-color: #f3e8ff;
}
.agent-card.color-3:hover {
  box-shadow: var(--shadow-3), 0 0 20px rgba(168, 85, 247, 0.12);
}
.agent-card.color-3 .agent-card-avatar {
  background: var(--color-brand-purple);
}
.agent-card.color-3 .agent-folder-btn {
  color: var(--color-brand-purple);
}

/* Card Avatar */
.agent-card-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--text-body-lg);
  font-weight: var(--weight-semibold);
  flex-shrink: 0;
}

/* Card Name */
.agent-card-name {
  font-size: var(--text-body-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.agent-card-name :deep(.n-text) {
  color: var(--color-ink) !important;
}

/* Card Info Row */
.agent-card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-body-sm);
}

.agent-folder-btn {
  transition: opacity var(--transition-fast);
}

/* Drawer Wrapper */
.drawer-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Drawer Header */
.drawer-header {
  padding: var(--space-xl) var(--space-xxl);
  color: white;
  flex-shrink: 0;
}

.drawer-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-header-name {
  font-size: var(--text-heading-lg);
  font-weight: var(--weight-bold);
}

.drawer-header-count {
  font-size: var(--text-body-sm);
  opacity: 0.9;
  margin-top: var(--space-xxs);
}

.drawer-folder-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  border-radius: var(--radius-full) !important;
  color: white !important;
  padding: var(--space-xxs) var(--space-md) !important;
  font-size: var(--text-body-sm);
  transition: all var(--transition-base);
}

.drawer-folder-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
}

/* Drawer Header Colors */
.drawer-header.drawer-color-0 {
  background: linear-gradient(
    135deg,
    var(--color-brand-coral),
    var(--color-brand-coral-light)
  );
}
.drawer-header.drawer-color-1 {
  background: linear-gradient(
    135deg,
    var(--color-brand-blue),
    var(--color-brand-blue-200)
  );
}
.drawer-header.drawer-color-2 {
  background: linear-gradient(
    135deg,
    var(--color-brand-magenta),
    var(--color-brand-magenta-light)
  );
}
.drawer-header.drawer-color-3 {
  background: linear-gradient(
    135deg,
    var(--color-brand-purple),
    var(--color-brand-magenta)
  );
}

/* Drawer Scroll + Body */
.drawer-scroll {
  flex: 1;
  min-height: 0;
}

.drawer-body {
  padding: var(--space-lg);
}

/* Skill Row */
.skill-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--color-hairline);
}

.skill-row:last-child {
  border-bottom: none;
}

.skill-row-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxs);
  min-width: 0;
  flex: 1;
}

.skill-row-name {
  color: var(--color-ink);
}

.skill-row-path {
  font-size: var(--text-caption);
  color: var(--color-stone);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
