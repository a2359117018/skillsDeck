<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NIcon, NButton, NSpin, NCheckbox } from 'naive-ui'
import RefreshOutline from '@vicons/ionicons5/RefreshOutline'
import SearchOutline from '@vicons/ionicons5/SearchOutline'
import CloseOutline from '@vicons/ionicons5/CloseOutline'
import TrashOutline from '@vicons/ionicons5/TrashOutline'
import { useSkillsStore } from '../stores/skills'
import { useTaskStore } from '../stores/tasks'
import { useConfirm } from '../composables/useConfirm'
import { useNotify } from '../composables/useNotify'
import AgentTagBar from '../components/skills/AgentTagBar.vue'
import SkillRow from '../components/skills/SkillRow.vue'
import SkillRemoveDialog from '../components/skills/SkillRemoveDialog.vue'
import SkillDetailModal from '../components/skills/SkillDetailModal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import type { InstalledSkillAgent } from '../../../shared/types'

const skillsStore = useSkillsStore()
const taskStore = useTaskStore()
const notify = useNotify()
const router = useRouter()
const { confirmUpdate, confirmRemove, confirmRemoveBatch, confirmUpdateAll } = useConfirm()

const removeDialogState = ref<{
  visible: boolean
  skillName: string
  agents: InstalledSkillAgent[]
}>({ visible: false, skillName: '', agents: [] })

const detailModalState = ref<{
  visible: boolean
  skillName: string
}>({ visible: false, skillName: '' })

// Batch mode state
const isBatchMode = ref(false)
const selectedNames = ref<string[]>([])
const pendingRemovalNames = ref<Set<string>>(new Set())

const allSelected = computed(() => {
  const skills = displayedSkills.value
  return skills.length > 0 && skills.every((s) => selectedNames.value.includes(s.name))
})

const someSelected = computed(() => {
  return selectedNames.value.length > 0 && !allSelected.value
})

const selectedCount = computed(() => selectedNames.value.length)

const displayedSkills = computed(() =>
  skillsStore.filteredSkills.filter((s) => !pendingRemovalNames.value.has(s.name))
)

/** Enter batch management mode, clearing any previous selection. */
function enterBatchMode(): void {
  isBatchMode.value = true
  selectedNames.value = []
}

/** Exit batch management mode and clear selection. */
function exitBatchMode(): void {
  isBatchMode.value = false
  selectedNames.value = []
}

/** Toggle selection of all skills currently in the filtered view. */
function toggleAll(): void {
  const names = displayedSkills.value.map((s) => s.name)
  if (allSelected.value) {
    selectedNames.value = selectedNames.value.filter((n) => !names.includes(n))
  } else {
    selectedNames.value = Array.from(new Set([...selectedNames.value, ...names]))
  }
}

/** Toggle selection of a single skill by name. */
function toggleSkill(name: string): void {
  const idx = selectedNames.value.indexOf(name)
  if (idx >= 0) {
    selectedNames.value = selectedNames.value.filter((n) => n !== name)
  } else {
    selectedNames.value = [...selectedNames.value, name]
  }
}

/**
 * Remove all selected skills in batch via background task with optimistic deletion.
 */
async function handleBatchRemove(): Promise<void> {
  if (selectedNames.value.length === 0) return
  const confirmed = await confirmRemoveBatch(selectedNames.value)
  if (!confirmed) return

  const names = [...selectedNames.value]

  // 乐观删除：立即加入 pendingRemovalNames
  pendingRemovalNames.value = new Set([...pendingRemovalNames.value, ...names])

  taskStore
    .start('skill-remove-batch', {
      packageRefs: names,
      onSuccess: () => {
        pendingRemovalNames.value = new Set()
        loadSkills()
      },
      onError: (err) => {
        notify.error(err)
        pendingRemovalNames.value = new Set()
        loadSkills()
      }
    })
    .catch((e) => {
      notify.error(e instanceof Error ? e.message : '启动删除失败')
      pendingRemovalNames.value = new Set()
      loadSkills()
    })

  exitBatchMode()
}

async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled()
}

onMounted(() => {
  loadSkills()
})

async function handleRefresh(): Promise<void> {
  try {
    await loadSkills()
    notify.success('刷新完成')
  } catch {
    notify.error('刷新失败，请重试')
  }
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
        loadSkills()
      },
      onError: (err) => {
        notify.error(`${name} 更新失败: ${err}`)
      }
    })
    .catch((e) => {
      notify.info(e instanceof Error ? e.message : '启动更新失败')
    })
}

async function handleRemove(name: string): Promise<void> {
  const skill = skillsStore.installedSkills.find((s) => s.name === name)
  const agents = skill?.agents || []

  if (agents.length <= 1) {
    const confirmed = await confirmRemove(name)
    if (!confirmed) return
    try {
      const result = await skillsStore.remove(name, true)
      if (result.success) {
        notify.success(`${name} 已删除`)
        await loadSkills()
      } else {
        notify.error(`${name} 删除失败`)
      }
    } catch {
      notify.error(`${name} 删除失败`)
    }
    return
  }

  removeDialogState.value = { visible: true, skillName: name, agents }
}

async function handleRemoveDialogDone(result: {
  confirmed: boolean
  agent?: string
}): Promise<void> {
  if (!result.confirmed) {
    removeDialogState.value.visible = false
    return
  }
  const { skillName } = removeDialogState.value
  removeDialogState.value.visible = false
  try {
    const removeResult = await skillsStore.remove(skillName, true, result.agent)
    if (removeResult.success) {
      notify.success(`${skillName} 已删除`)
      await loadSkills()
    } else {
      notify.error(`${skillName} 删除失败`)
    }
  } catch {
    notify.error(`${skillName} 删除失败`)
  }
}

function handleOpenLocation(path: string): void {
  skillsStore.openLocation(path)
}

async function handleUpdateAll(): Promise<void> {
  const names = skillsStore.installedSkills.map((s) => s.name)
  if (names.length === 0) {
    notify.info('没有可更新的技能')
    return
  }
  const confirmed = await confirmUpdateAll(names)
  if (!confirmed) return
  taskStore
    .start('skill-update-all', {
      global: true,
      onSuccess: () => {
        notify.success('全部更新成功')
        loadSkills()
      },
      onError: (err) => {
        notify.error(`更新失败: ${err}`)
      }
    })
    .catch((e) => {
      notify.info(e instanceof Error ? e.message : '启动更新失败')
    })
}

function handleSearchInput(val: string): void {
  skillsStore.setSearchKeyword(val)
}

function handleFilterAgent(agentFlag: string): void {
  if (isBatchMode.value) {
    exitBatchMode()
  }
  skillsStore.toggleAgent(agentFlag)
}

function handleViewDetail(name: string): void {
  detailModalState.value = { visible: true, skillName: name }
}
</script>

<template>
  <main class="installed-list-page">
    <div class="container">
      <!-- Toolbar -->
      <div class="toolbar">
        <template v-if="!isBatchMode">
          <h1 class="toolbar-title">
            我的技能
            <span class="toolbar-badge">{{ displayedSkills.length }}</span>
          </h1>
          <div class="toolbar-search">
            <NInput
              :value="skillsStore.searchKeyword"
              placeholder="搜索技能..."
              aria-label="搜索已安装技能"
              clearable
              size="large"
              class="toolbar-search-input"
              @update:value="handleSearchInput"
            >
              <template #prefix>
                <NIcon :size="18" :color="'var(--color-muted)'">
                  <SearchOutline />
                </NIcon>
              </template>
            </NInput>
          </div>
          <div class="toolbar-actions">
            <NButton
              secondary
              size="small"
              :disabled="skillsStore.refreshing"
              @click="handleRefresh"
            >
              <template #icon>
                <NIcon :size="16"><RefreshOutline /></NIcon>
              </template>
              刷新
            </NButton>
            <NButton
              secondary
              size="small"
              :disabled="skillsStore.installedSkills.length === 0"
              @click="handleUpdateAll"
            >
              全部更新
            </NButton>
            <NButton
              secondary
              size="small"
              :disabled="skillsStore.installedSkills.length === 0"
              @click="enterBatchMode"
            >
              批量管理
            </NButton>
          </div>
        </template>
        <template v-else>
          <h1 class="toolbar-title">批量管理</h1>
          <div class="batch-toolbar-middle">
            <NCheckbox
              :checked="allSelected"
              :indeterminate="someSelected"
              @update:checked="toggleAll"
            >
              全选
            </NCheckbox>
            <span class="batch-count">已选 {{ selectedCount }} 个</span>
          </div>
          <div class="toolbar-actions">
            <NButton
              type="error"
              size="small"
              :disabled="selectedCount === 0"
              @click="handleBatchRemove"
            >
              <template #icon>
                <NIcon :size="16"><TrashOutline /></NIcon>
              </template>
              删除选中
            </NButton>
            <NButton secondary size="small" @click="exitBatchMode">
              <template #icon>
                <NIcon :size="16"><CloseOutline /></NIcon>
              </template>
              完成
            </NButton>
          </div>
        </template>
      </div>

      <!-- Agent Tag Bar -->
      <AgentTagBar />

      <!-- Skill List -->
      <div v-if="skillsStore.fetching && displayedSkills.length === 0" class="page-loading">
        <NSpin size="large" />
      </div>
      <div v-else-if="displayedSkills.length > 0" class="skill-list">
        <TransitionGroup name="list" tag="div">
          <SkillRow
            v-for="skill in displayedSkills"
            :key="skill.name"
            :skill="skill"
            :batch-mode="isBatchMode"
            :selected="selectedNames.includes(skill.name)"
            @update="handleUpdate"
            @remove="handleRemove"
            @open-location="handleOpenLocation"
            @filter-agent="handleFilterAgent"
            @view-detail="handleViewDetail"
            @toggle-select="toggleSkill"
          />
        </TransitionGroup>
      </div>
      <EmptyState
        v-else
        :icon="SearchOutline"
        title="暂无已安装的技能"
        description="从技能库中搜索并安装技能，管理你的 AI 编程助手能力"
      >
        <template #actions>
          <NButton type="primary" size="small" round @click="router.push({ name: 'search' })">
            搜索技能
          </NButton>
        </template>
      </EmptyState>

      <!-- Remove Dialog -->
      <SkillRemoveDialog
        v-if="removeDialogState.visible"
        :skill-name="removeDialogState.skillName"
        :agents="removeDialogState.agents"
        @done="handleRemoveDialogDone"
      />

      <!-- Skill Detail Modal -->
      <SkillDetailModal
        v-model:show="detailModalState.visible"
        :skill-name="detailModalState.skillName"
      />
    </div>
  </main>
</template>

<style scoped>
.installed-list-page {
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
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-semibold);
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

.batch-toolbar-middle {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
}

.batch-count {
  font-size: var(--text-body-sm);
  color: var(--color-stone);
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

/* Skill List */
.skill-list {
  display: flex;
  flex-direction: column;
}

.skill-list > div {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.empty-state {
  padding: var(--space-xxxl) 0;
  display: flex;
  justify-content: center;
}

/* List Transitions */
.list-enter-active,
.list-leave-active {
  transition:
    opacity var(--transition-base),
    transform var(--transition-base);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
