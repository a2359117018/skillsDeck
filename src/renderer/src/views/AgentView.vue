<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWindowSize } from '@vueuse/core'
import { NDrawer, NTooltip, NText, NButton, NIcon, NInput, NSpin, NCheckbox } from 'naive-ui'
import FolderOpenOutline from '@vicons/ionicons5/FolderOpenOutline'
import RefreshOutline from '@vicons/ionicons5/RefreshOutline'
import TrashOutline from '@vicons/ionicons5/TrashOutline'
import SearchOutline from '@vicons/ionicons5/SearchOutline'
import CloseOutline from '@vicons/ionicons5/CloseOutline'
import GitMergeOutline from '@vicons/ionicons5/GitMergeOutline'
import { useSkillsStore } from '@renderer/stores/skills'
import { useTaskStore } from '@renderer/stores/tasks'
import { useConfirm } from '@renderer/composables/useConfirm'
import { useNotify } from '@renderer/composables/useNotify'
import EmptyState from '@renderer/components/common/EmptyState.vue'
import type { AgentScanResult } from '../../../shared/types'

const skillsStore = useSkillsStore()
const taskStore = useTaskStore()
const notify = useNotify()
const router = useRouter()
const { confirmUpdate, confirmRemove, confirmRemoveBatch } = useConfirm()

const agentSearchKeyword = ref('')
const selectedAgentFlag = ref<string | null>(null)
const selectedAgent = computed(
  () => skillsStore.sortedAgentResults.find((a) => a.agentFlag === selectedAgentFlag.value) || null
)
const drawerVisible = ref(false)
const removingSkill = ref<string | null>(null)

// Batch mode state
const isBatchMode = ref(false)
const isBatchRemoving = ref(false)
const selectedSkillNames = ref<string[]>([])

/** 使用 @vueuse/core 的 useWindowSize 替代手动 resize 监听，避免未节流的事件风暴 */
const { width: windowWidth } = useWindowSize()

const visibleAgentResults = computed(() =>
  skillsStore.sortedAgentResults.filter((a) => {
    if (a.count === 0) return false
    if (!agentSearchKeyword.value) return true
    return a.agentName.toLowerCase().includes(agentSearchKeyword.value.toLowerCase())
  })
)

const agentCount = computed(() => visibleAgentResults.value.length)

const allSelected = computed(() => {
  const skills = selectedAgent.value?.skills || []
  return skills.length > 0 && skills.every((s) => selectedSkillNames.value.includes(s))
})

const someSelected = computed(() => {
  return selectedSkillNames.value.length > 0 && !allSelected.value
})

const selectedCount = computed(() => selectedSkillNames.value.length)

function getAgentInitials(name: string): string {
  return name.slice(0, 2)
}

function getAgentColorIndex(index: number): number {
  return index % 4
}

/** 打开 Agent 卡片详情抽屉 */
function openAgentCard(agent: AgentScanResult): void {
  selectedAgentFlag.value = agent.agentFlag
  drawerVisible.value = true
}

function closeDrawer(): void {
  drawerVisible.value = false
  selectedAgentFlag.value = null
}

/** Enter batch mode and clear any previous selection. */
function enterBatchMode(): void {
  isBatchMode.value = true
  selectedSkillNames.value = []
}

/** Exit batch mode and clear selection. */
function exitBatchMode(): void {
  isBatchMode.value = false
  selectedSkillNames.value = []
}

/** Toggle selection of all skills in the current agent. */
function toggleAll(): void {
  const skills = selectedAgent.value?.skills || []
  const names = skills
  if (allSelected.value) {
    selectedSkillNames.value = selectedSkillNames.value.filter((n) => !names.includes(n))
  } else {
    selectedSkillNames.value = Array.from(new Set([...selectedSkillNames.value, ...names]))
  }
}

/** Toggle selection of a single skill by name. */
function toggleSkill(name: string): void {
  const idx = selectedSkillNames.value.indexOf(name)
  if (idx >= 0) {
    selectedSkillNames.value = selectedSkillNames.value.filter((n) => n !== name)
  } else {
    selectedSkillNames.value = [...selectedSkillNames.value, name]
  }
}

function openAgentFolder(agent: AgentScanResult, e?: Event): void {
  e?.stopPropagation()
  skillsStore.openLocation(agent.globalPath)
}

async function handleUpdate(name: string): Promise<void> {
  const confirmed = await confirmUpdate(name)
  if (!confirmed) return
  taskStore
    .start('skill-update', {
      packageRef: name,
      global: true,
      onSuccess: () => {
        notify.success(`${name} 更新成功`)
        skillsStore.fetchInstalled()
      },
      onError: (err) => {
        notify.error(`${name} 更新失败: ${err}`)
      }
    })
    .catch((e) => {
      notify.info(e instanceof Error ? e.message : '启动更新失败')
    })
}

/**
 * Remove all selected skills in the current agent in batch.
 * Executes serially to avoid file-lock conflicts. Reports success/failure counts.
 */
async function handleBatchRemove(): Promise<void> {
  if (selectedSkillNames.value.length === 0 || isBatchRemoving.value) return
  const confirmed = await confirmRemoveBatch(selectedSkillNames.value)
  if (!confirmed) return

  isBatchRemoving.value = true
  const names = [...selectedSkillNames.value]
  const failedNames: string[] = []
  let successCount = 0
  const agentFlag = selectedAgent.value?.agentFlag

  for (const name of names) {
    try {
      const result = await skillsStore.remove(name, true, agentFlag)
      if (result.success) {
        successCount++
      } else {
        failedNames.push(name)
      }
    } catch {
      failedNames.push(name)
    }
  }

  if (successCount > 0) {
    notify.success(`已删除 ${successCount} 个技能`)
  }
  if (failedNames.length > 0) {
    const displayed = failedNames.slice(0, 5).join('、')
    const suffix = failedNames.length > 5 ? ` 等 ${failedNames.length} 个技能` : ''
    notify.error(`删除失败：${displayed}${suffix}`)
  }

  await skillsStore.fetchInstalled()
  isBatchRemoving.value = false
  exitBatchMode()
}

async function handleRemove(name: string): Promise<void> {
  const confirmed = await confirmRemove(name)
  if (!confirmed) return
  removingSkill.value = name
  try {
    const result = await skillsStore.remove(name, true, selectedAgent.value?.agentFlag)
    if (result.success) {
      notify.success(`${name} 已删除`)
      await skillsStore.fetchInstalled()
    } else {
      notify.error(`${name} 删除失败`)
    }
  } catch {
    notify.error(`${name} 删除失败`)
  } finally {
    removingSkill.value = null
  }
}

async function handleRefresh(): Promise<void> {
  try {
    await skillsStore.fetchInstalled()
    notify.success('刷新完成')
  } catch {
    notify.error('刷新失败，请重试')
  }
}

onMounted(() => {
  skillsStore.fetchInstalled()
})
</script>

<template>
  <div class="agent-page" role="main" aria-label="Agent 管理页面">
    <div class="container">
      <!-- Toolbar -->
      <div class="toolbar">
        <h1 class="toolbar-title">
          AI 工具管理
          <span class="toolbar-badge">{{ agentCount }}</span>
        </h1>
        <p class="toolbar-subtitle">管理已安装技能对应的 AI 编程工具，如 Claude Code、Cursor 等</p>
        <div class="toolbar-search">
          <NInput
            v-model:value="agentSearchKeyword"
            placeholder="搜索 AI 工具名称..."
            clearable
            size="large"
            aria-label="搜索 Agent"
            class="toolbar-search-input"
          >
            <template #prefix>
              <NIcon :size="18" :color="'var(--color-muted)'" aria-hidden="true">
                <SearchOutline />
              </NIcon>
            </template>
          </NInput>
        </div>
        <div class="toolbar-actions">
          <NButton secondary size="small" :disabled="skillsStore.refreshing" @click="handleRefresh">
            <template #icon>
              <NIcon :size="16" aria-hidden="true"><RefreshOutline /></NIcon>
            </template>
            刷新
          </NButton>
        </div>
      </div>

      <!-- Agent Grid -->
      <div v-if="skillsStore.fetching && visibleAgentResults.length === 0" class="page-loading">
        <NSpin size="large" />
      </div>
      <div v-else-if="visibleAgentResults.length > 0" class="agent-grid">
        <div
          v-for="(agent, index) in visibleAgentResults"
          :key="agent.agentFlag"
          class="agent-card"
          :class="['color-' + getAgentColorIndex(index)]"
          role="button"
          tabindex="0"
          :aria-label="agent.agentName + '，' + agent.count + '个技能'"
          @click="openAgentCard(agent)"
          @keydown.enter.prevent="openAgentCard(agent)"
          @keydown.space.prevent="openAgentCard(agent)"
        >
          <div class="agent-card-avatar">
            {{ getAgentInitials(agent.agentName) }}
          </div>
          <div class="agent-card-name">
            <NText strong>{{ agent.agentName }}</NText>
          </div>
          <div class="agent-card-info">
            <NText depth="3">{{ agent.count }} 个技能</NText>
            <button
              type="button"
              class="agent-folder-btn"
              aria-label="打开技能文件夹"
              title="打开技能文件夹"
              @click.stop="openAgentFolder(agent, $event)"
            >
              <NIcon :size="14" aria-hidden="true"><FolderOpenOutline /></NIcon>
            </button>
          </div>
        </div>
      </div>
      <EmptyState
        v-else
        :icon="GitMergeOutline"
        title="暂无已安装的 Agent"
        description="安装技能后，对应的 AI 编程工具会自动出现在这里"
      >
        <template #actions>
          <NButton type="primary" size="small" round @click="router.push({ name: 'search' })">
            搜索技能
          </NButton>
        </template>
      </EmptyState>
    </div>

    <!-- Drawer -->
    <NDrawer
      class="agent-drawer"
      :show="drawerVisible"
      :width="Math.min(480, windowWidth * 0.4)"
      placement="right"
      @update:show="
        (val: boolean) => {
          if (!val) closeDrawer()
        }
      "
      @mask-click="closeDrawer"
    >
      <div v-if="selectedAgent" class="drawer-wrapper">
        <div class="drawer-header">
          <div class="header-left">
            <div class="header-avatar">{{ getAgentInitials(selectedAgent.agentName) }}</div>
            <div class="header-info">
              <div class="header-name">{{ selectedAgent.agentName }}</div>
              <div class="header-count">{{ selectedAgent.count }} 个技能</div>
            </div>
          </div>
          <div class="header-actions">
            <NTooltip>
              <template #trigger>
                <NButton
                  quaternary
                  circle
                  size="medium"
                  class="header-icon-btn"
                  @click="openAgentFolder(selectedAgent!)"
                >
                  <template #icon>
                    <NIcon :size="18" aria-hidden="true"><FolderOpenOutline /></NIcon>
                  </template>
                </NButton>
              </template>
              打开文件夹
            </NTooltip>
            <NTooltip>
              <template #trigger>
                <NButton
                  quaternary
                  circle
                  size="medium"
                  class="header-icon-btn"
                  @click="closeDrawer"
                >
                  <template #icon>
                    <NIcon :size="18" aria-hidden="true"><CloseOutline /></NIcon>
                  </template>
                </NButton>
              </template>
              关闭
            </NTooltip>
          </div>
        </div>
        <div class="drawer-body">
          <div
            v-for="skillName in selectedAgent.skills"
            :key="selectedAgent.agentFlag + '-' + skillName"
            class="skill-card"
          >
            <div class="skill-left">
              <div class="skill-name">{{ skillName }}</div>
            </div>
            <div class="skill-actions">
              <NTooltip>
                <template #trigger>
                  <NButton
                    quaternary
                    circle
                    size="small"
                    class="action-btn update"
                    aria-label="更新技能"
                    @click="handleUpdate(skillName)"
                  >
                    <template #icon>
                      <NIcon :size="16" aria-hidden="true"><RefreshOutline /></NIcon>
                    </template>
                  </NButton>
                </template>
                更新
              </NTooltip>
              <NTooltip>
                <template #trigger>
                  <NButton
                    quaternary
                    circle
                    size="small"
                    class="action-btn delete"
                    aria-label="删除技能"
                    :loading="removingSkill === skillName"
                    @click="handleRemove(skillName)"
                  >
                    <template #icon>
                      <NIcon :size="16" aria-hidden="true"><TrashOutline /></NIcon>
                    </template>
                  </NButton>
                </template>
                删除
              </NTooltip>
            </div>
          </div>
        </div>
      </div>
    </NDrawer>
  </div>
</template>

<style scoped>
/* Page Layout */
.agent-page {
  height: 100%;
  overflow-y: auto;
  background: var(--color-canvas);
  padding: var(--space-xl);
}

.container {
  width: 100%;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}

.toolbar-title {
  font-size: var(--text-heading-lg);
  font-weight: var(--weight-bold);
  margin: 0;
  color: var(--color-ink);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  white-space: nowrap;
}

.toolbar-badge {
  background: var(--color-brand-blue);
  color: var(--color-canvas);
  padding: var(--space-xxs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-semibold);
}

.toolbar-subtitle {
  font-size: var(--text-body-sm);
  color: var(--color-stone);
  margin: 0;
  width: 100%;
}

.toolbar-search {
  flex: 1;
}

.toolbar-search-input :deep(.n-input) {
  border-radius: var(--radius-full);
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
}

.toolbar-actions {
  display: flex;
  gap: var(--space-sm);
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

/* Agent Grid */
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-xl);
  padding: var(--space-md);
  border: 1px solid;
  transition:
    box-shadow var(--transition-base),
    border-color var(--transition-base);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.agent-card:hover {
  box-shadow: var(--shadow-3);
  border-color: var(--color-hairline-hover);
}

/* Card Color Themes */
.agent-card.color-0 {
  background: var(--color-agent-coral-bg);
  border-color: var(--color-agent-coral-border);
}
.agent-card.color-0 .agent-card-avatar {
  background: var(--color-avatar-coral);
}
.agent-card.color-0 .agent-folder-btn {
  color: var(--color-brand-coral);
}

.agent-card.color-1 {
  background: var(--color-agent-blue-bg);
  border-color: var(--color-agent-blue-border);
}
.agent-card.color-1 .agent-card-avatar {
  background: var(--color-avatar-blue);
}
.agent-card.color-1 .agent-folder-btn {
  color: var(--color-brand-blue);
}

.agent-card.color-2 {
  background: var(--color-agent-magenta-bg);
  border-color: var(--color-agent-magenta-border);
}
.agent-card.color-2 .agent-card-avatar {
  background: var(--color-avatar-magenta);
}
.agent-card.color-2 .agent-folder-btn {
  color: var(--color-brand-magenta);
}

.agent-card.color-3 {
  background: var(--color-agent-purple-bg);
  border-color: var(--color-agent-purple-border);
}
.agent-card.color-3 .agent-card-avatar {
  background: var(--color-avatar-purple);
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
  color: var(--color-canvas);
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
  color: var(--color-ink);
}

/* Card Info Row */
.agent-card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-body-sm);
}

.agent-folder-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  cursor: pointer;
  background: transparent;
  border: none;
  outline: none;
  transition:
    opacity var(--transition-fast),
    background var(--transition-fast);
}

/* Drawer Wrapper */
.drawer-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-canvas);
}

/* Drawer Header - 紧凑一行布局 */
.drawer-header {
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.header-avatar {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--color-brand-blue);
  color: var(--color-canvas);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--weight-bold);
  font-size: var(--text-body-sm);
  flex-shrink: 0;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxs);
}

.header-name {
  font-size: var(--text-body-lg);
  font-weight: var(--weight-bold);
  color: var(--color-ink);
}

.header-count {
  font-size: var(--text-caption);
  color: var(--color-brand-blue-deep);
  background: var(--color-brand-blue-tint);
  padding: var(--space-xxs) var(--space-xs);
  border-radius: var(--radius-full);
  width: fit-content;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xxs);
}

:deep(.n-button.header-icon-btn) {
  width: 44px;
  height: 44px;
  color: var(--color-stone);
}

:deep(.n-button.header-icon-btn:hover) {
  background: var(--color-brand-blue-tint);
  color: var(--color-interactive-accent);
}

/* Drawer Body - 卡片列表 */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  background: var(--color-surface);
}

/* Skill Card */
.skill-card {
  background: var(--color-canvas);
  border: 1px solid var(--color-brand-blue-tint);
  border-radius: var(--radius-lg);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base);
}

.skill-card:hover {
  border-color: var(--color-interactive-accent);
  box-shadow: 0 2px 12px var(--color-brand-blue-tint);
}

.skill-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  flex: 1;
}

.skill-name {
  font-size: var(--text-body-md);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Action Buttons */
.skill-actions {
  display: flex;
  gap: var(--space-xxs);
  flex-shrink: 0;
}

:deep(.n-button.action-btn) {
  width: 44px;
  height: 44px;
  color: var(--color-stone);
}

:deep(.n-button.action-btn.update:hover) {
  background: var(--color-brand-blue-tint);
  color: var(--color-interactive-accent);
}

:deep(.n-button.action-btn.delete:hover) {
  background: var(--color-error-bg);
  color: var(--color-error);
}
</style>

<style>
/* NDrawer teleports to body, so scoped styles can't reach it */
.agent-drawer.n-drawer {
  background-color: transparent;
  border-radius: 0;
}
</style>
