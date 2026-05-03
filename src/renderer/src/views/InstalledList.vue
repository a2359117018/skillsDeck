<script setup lang="ts">
import { onMounted, ref, h, watch } from 'vue'
import {
  NDataTable,
  NButton,
  NSpace,
  NTabPane,
  NTabs,
  NEmpty,
  NSpin,
  NSelect,
  useMessage
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useSkillsStore } from '../stores/skills'
import { AGENTS } from '../constants/agents'
import type { Skill } from '../../../shared/types'

const skillsStore = useSkillsStore()
const message = useMessage()
const currentTab = ref('global')
const selectedAgent = ref<string | null>(null)

const agentOptions = [
  { label: '全部', value: '' },
  ...AGENTS.map((a) => ({ label: a.name, value: a.agentFlag }))
]

async function loadSkills(): Promise<void> {
  await skillsStore.fetchInstalled(currentTab.value === 'global', selectedAgent.value || undefined)
}

onMounted(() => loadSkills())

watch(selectedAgent, () => loadSkills())

async function handleUpdateAll(): Promise<void> {
  const result = await skillsStore.updateAll(currentTab.value === 'global')
  if (result.success) {
    message.success('更新成功')
    loadSkills()
  } else {
    message.error('更新失败: ' + (result.stderr || '未知错误'))
  }
}

async function handleUpdate(name: string): Promise<void> {
  const result = await skillsStore.update(name, currentTab.value === 'global')
  if (result.success) {
    message.success(`${name} 更新成功`)
    loadSkills()
  } else {
    message.error(`${name} 更新失败`)
  }
}

async function handleRemove(name: string): Promise<void> {
  if (!window.confirm(`确定删除 ${name}? 此操作不可撤销`)) return
  const result = await skillsStore.remove(name)
  if (result.success) {
    message.success(`${name} 已删除`)
    loadSkills()
  } else {
    message.error(`${name} 删除失败`)
  }
}

const columns: DataTableColumns<Skill> = [
  { title: '名称', key: 'name' },
  { title: '版本', key: 'version', width: 100 },
  { title: '来源', key: 'source', ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row: Skill) {
      return h(NSpace, { size: 'small' }, () => [
        h(NButton, { size: 'small', onClick: () => handleUpdate(row.name) }, () => '更新'),
        h(
          NButton,
          { size: 'small', type: 'error', onClick: () => handleRemove(row.name) },
          () => '删除'
        )
      ])
    }
  }
]
</script>

<template>
  <div class="list-page">
    <div class="list-header">
      <NTabs v-model:value="currentTab" @update:value="loadSkills">
        <NTabPane name="global" tab="全局技能" />
        <NTabPane name="project" tab="项目技能" />
      </NTabs>
      <NSpace align="center" :size="12">
        <NSelect
          v-model:value="selectedAgent"
          :options="agentOptions"
          placeholder="筛选 Agent"
          clearable
          style="width: 200px"
        />
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
      <NDataTable
        v-if="skillsStore.installedSkills.length > 0"
        :columns="columns"
        :data="skillsStore.installedSkills"
        :bordered="false"
      />
      <NEmpty v-else description="暂无已安装的技能" style="margin-top: 48px" />
    </NSpin>
  </div>
</template>

<style scoped>
.list-page {
  max-width: 900px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
