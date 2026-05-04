<script setup lang="ts">
import { onMounted } from 'vue'
import { NButton, NEmpty, NSpin, NSpace, NText } from 'naive-ui'
import { useSkillsStore } from '../stores/skills'
import AgentFilter from '../components/skills/AgentFilter.vue'
import SkillCard from '../components/skills/SkillCard.vue'
import { useMessage } from 'naive-ui'

const skillsStore = useSkillsStore()
const message = useMessage()

async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled(true)
}

onMounted(() => loadSkills())

async function handleUpdateAll(): Promise<void> {
  try {
    const result = await skillsStore.updateAll(true)
    if (result.success) {
      message.success('更新成功')
      loadSkills()
    } else {
      message.error('更新失败: ' + (result.stderr || '未知错误'))
    }
  } catch {
    message.error('更新失败')
  }
}

async function handleUpdate(name: string): Promise<void> {
  try {
    const result = await skillsStore.update(name, true)
    if (result.success) {
      message.success(`${name} 更新成功`)
      loadSkills()
    } else {
      message.error(`${name} 更新失败`)
    }
  } catch {
    message.error(`${name} 更新失败`)
  }
}

async function handleRemove(name: string): Promise<void> {
  if (!window.confirm(`确定删除 ${name}? 此操作不可撤销`)) return
  try {
    const result = await skillsStore.remove(name, true)
    if (result.success) {
      message.success(`${name} 已删除`)
      loadSkills()
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
</script>

<template>
  <div class="list-page">
    <div class="list-header">
      <NText class="count-text">{{ skillsStore.filteredSkills.length }} 个技能</NText>
      <NSpace align="center" :size="12">
        <AgentFilter v-model="skillsStore.selectedAgents" />
        <NButton
          type="primary"
          size="small"
          :loading="skillsStore.loading"
          @click="handleUpdateAll"
        >
          全部更新
        </NButton>
      </NSpace>
    </div>
    <NSpin :show="skillsStore.loading">
      <div v-if="skillsStore.filteredSkills.length > 0" class="card-grid">
        <SkillCard
          v-for="skill in skillsStore.filteredSkills"
          :key="skill.name"
          :skill="skill"
          @update="handleUpdate"
          @remove="handleRemove"
          @open-location="handleOpenLocation"
        />
      </div>
      <NEmpty
        v-else-if="!skillsStore.loading"
        description="暂无已安装的技能"
        style="margin-top: 48px"
      />
    </NSpin>
  </div>
</template>

<style scoped>
.list-page {
  max-width: 960px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.count-text {
  font-size: 14px;
  font-weight: 500;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
</style>
