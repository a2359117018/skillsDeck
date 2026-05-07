<script setup lang="ts">
import { onMounted } from 'vue'
import { NEmpty, NSpace, NText, NScrollbar, NInput, NIcon, useMessage } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
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
  <div class="list-page">
    <div class="list-header">
      <NInput
        :value="skillsStore.searchKeyword"
        placeholder="搜索技能..."
        clearable
        round
        size="large"
        class="search-input"
        @update:value="handleSearchInput"
      >
        <template #suffix>
          <NSpace align="center" :size="8" :wrap="false">
            <NText class="count-text">{{ skillsStore.filteredSkills.length }} 个技能</NText>
            <NButton
              quaternary
              circle
              size="small"
              :loading="skillsStore.fetching"
              title="刷新"
              @click="handleRefresh"
            >
              <template #icon>
                <NIcon :size="16"><RefreshOutline /></NIcon>
              </template>
            </NButton>
          </NSpace>
        </template>
      </NInput>
    </div>
    <AgentTagBar />
    <NScrollbar class="list-scroll">
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
      <NEmpty v-else description="暂无已安装的技能" style="margin-top: 48px" />
    </NScrollbar>
  </div>
</template>

<style scoped>
.list-page {
  max-width: 960px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
}

.count-text {
  font-size: 13px;
  font-weight: 400;
  color: #8e8e93;
}

.list-scroll {
  flex: 1;
  min-height: 0;
}

.list-scroll :deep(.n-scrollbar-rail) {
  display: none !important;
}

.skill-list {
  padding-bottom: 24px;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.list-move {
  transition: transform 0.2s ease;
}
</style>
