<script setup lang="ts">
import { onMounted } from 'vue'
import { NButton, NEmpty, NSpace, NText, NScrollbar, NInput, NIcon, useMessage } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { useSkillsStore } from '../stores/skills'
import { useConfirm } from '../composables/useConfirm'
import AgentFilter from '../components/skills/AgentFilter.vue'
import SkillRow from '../components/skills/SkillRow.vue'

const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdateAll, confirmUpdate, confirmRemove } = useConfirm()

skillsStore.setMessageHandler((msg, type) => {
  message[type](msg)
})

async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled(true)
}

onMounted(() => loadSkills())

async function handleUpdateAll(): Promise<void> {
  const names = skillsStore.installedSkills.map((s) => s.name)
  if (names.length === 0) {
    message.info('没有可更新的技能')
    return
  }
  const confirmed = await confirmUpdateAll(names)
  if (!confirmed) return
  try {
    const result = await skillsStore.updateAll(true)
    if (result.success) {
      message.success('更新成功')
      await loadSkills()
    } else {
      message.error('更新失败: ' + (result.stderr || '未知错误'))
    }
  } catch {
    message.error('更新失败')
  }
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
</script>

<template>
  <div class="list-page">
    <div class="list-header">
      <NInput
        :value="skillsStore.searchKeyword"
        placeholder="搜索技能..."
        clearable
        round
        class="search-input"
        @update:value="handleSearchInput"
      />
      <NSpace align="center" :size="12">
        <AgentFilter v-model="skillsStore.selectedAgents" />
        <NText class="count-text">{{ skillsStore.filteredSkills.length }} 个技能</NText>
        <NButton size="small" round :loading="skillsStore.updatingAll" @click="handleUpdateAll">
          <template #icon>
            <NIcon :size="14"><RefreshOutline /></NIcon>
          </template>
          全部更新
        </NButton>
      </NSpace>
    </div>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
  gap: 12px;
}

.search-input {
  max-width: 240px;
}

.count-text {
  font-size: 14px;
  font-weight: 400;
  color: #45515e;
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
