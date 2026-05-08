<script setup lang="ts">
import { onMounted } from 'vue'
import { NEmpty, NText, NScrollbar, NInput, NIcon, NButton, useMessage } from 'naive-ui'
import { RefreshOutline, SearchOutline } from '@vicons/ionicons5'
import { useSkillsStore } from '../stores/skills'
import { useConfirm } from '../composables/useConfirm'
import AgentTagBar from '../components/skills/AgentTagBar.vue'
import SkillRow from '../components/skills/SkillRow.vue'

const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdate, confirmRemove } = useConfirm()

skillsStore.setMessageHandler((msg, type) => {
  message[type](msg)
})

async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled(true)
}

onMounted(() => loadSkills())

async function handleRefresh(): Promise<void> {
  await loadSkills()
}

async function handleUpdate(name: string): Promise<void> {
  const confirmed = await confirmUpdate(name)
  if (!confirmed) return
  try {
    const result = await skillsStore.update(name, true)
    if (result.success) {
      message.success(`${name} 更新成功`)
      await loadSkills()
    } else {
      message.error(`${name} 更新失败`)
    }
  } catch {
    message.error(`${name} 更新失败`)
  }
}

async function handleRemove(name: string): Promise<void> {
  const confirmed = await confirmRemove(name)
  if (!confirmed) return
  try {
    const result = await skillsStore.remove(name, true)
    if (result.success) {
      message.success(`${name} 已删除`)
      await loadSkills()
    } else {
      message.error(`${name} 删除失败`)
    }
  } catch {
    message.error(`${name} 删除失败`)
  }
}

function handleOpenLocation(path: string): void {
  skillsStore.openLocation(path)
}

function handleSearchInput(val: string): void {
  skillsStore.setSearchKeyword(val)
}

function handleFilterAgent(agentFlag: string): void {
  skillsStore.toggleAgent(agentFlag)
}
</script>

<template>
  <div class="installed-list-page">
    <div class="container">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-content">
          <h1 class="hero-title">
            我的技能
            <span class="hero-badge">{{ skillsStore.filteredSkills.length }}</span>
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
            <NButton text class="hero-action-btn">
              全部更新
            </NButton>
          </div>
        </div>
        <div class="hero-bg">
          <div class="hero-blob hero-blob-1"></div>
          <div class="hero-blob hero-blob-2"></div>
          <div class="hero-blob hero-blob-3"></div>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="search-section">
        <NInput
          :value="skillsStore.searchKeyword"
          placeholder="搜索技能..."
          clearable
          size="large"
          class="search-input"
          @update:value="handleSearchInput"
        >
          <template #prefix>
            <NIcon :size="18" :color="'var(--color-muted)'">
              <SearchOutline />
            </NIcon>
          </template>
        </NInput>
        <NText class="search-count">{{ skillsStore.filteredSkills.length }} 个技能</NText>
      </div>

      <!-- Agent Tag Bar -->
      <AgentTagBar />

      <!-- Skill List -->
      <NScrollbar class="skill-list-scroll">
        <div v-if="skillsStore.filteredSkills.length > 0" class="skill-list">
          <TransitionGroup name="list" tag="div">
            <SkillRow
              v-for="skill in skillsStore.filteredSkills"
              :key="skill.name"
              :skill="skill"
              @update="handleUpdate"
              @remove="handleRemove"
              @open-location="handleOpenLocation"
              @filter-agent="handleFilterAgent"
            />
          </TransitionGroup>
        </div>
        <NEmpty v-else description="暂无已安装的技能" class="empty-state" />
      </NScrollbar>
    </div>
  </div>
</template>

<style scoped>
.installed-list-page {
  min-height: 100vh;
  background: var(--color-canvas);
  padding: var(--space-xl);
}

.container {
  max-width: 960px;
  margin: 0 auto;
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

/* Hero Background Decorations */
.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

/* Skill List */
.skill-list-scroll {
  max-height: calc(100vh - 400px);
  min-height: 300px;
}

.skill-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.empty-state {
  padding: var(--space-xxxl) 0;
  display: flex;
  justify-content: center;
}

/* List Transitions */
.list-enter-active,
.list-leave-active {
  transition: all var(--transition-base);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
