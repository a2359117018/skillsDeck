<script setup lang="ts">
import { onMounted } from 'vue'
import {
  NCard,
  NForm,
  NFormItem,
  NSelect,
  NSwitch,
  NButton,
  NSpace,
  NIcon,
  useMessage
} from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { useSettingsStore } from '../stores/settings'
import { useSkillsStore } from '../stores/skills'
import { useConfirm } from '../composables/useConfirm'
import { AGENTS } from '../constants/agents'

const settingsStore = useSettingsStore()
const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdateAll } = useConfirm()

const agentOptions = AGENTS.map((a) => ({ label: a.name, value: a.agentFlag }))

onMounted(() => settingsStore.load())

async function handleSave(): Promise<void> {
  await settingsStore.save({
    defaultAgent: settingsStore.defaultAgent,
    autoCheckEnv: settingsStore.autoCheckEnv
  })
  message.success('设置已保存')
}

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
    } else {
      message.error('更新失败: ' + (result.stderr || '未知错误'))
    }
  } catch {
    message.error('更新失败')
  }
}
</script>

<template>
  <div class="settings-page">
    <NCard title="设置">
      <NForm label-placement="left" label-width="140">
        <NFormItem label="默认安装目标">
          <NSelect v-model:value="settingsStore.defaultAgent" :options="agentOptions" filterable />
        </NFormItem>
        <NFormItem label="启动时检查环境">
          <NSwitch v-model:value="settingsStore.autoCheckEnv" />
        </NFormItem>
        <NFormItem label="技能管理">
          <NButton
            round
            :loading="skillsStore.updatingAll"
            :disabled="skillsStore.installedSkills.length === 0"
            @click="handleUpdateAll"
          >
            <template #icon>
              <NIcon :size="14"><RefreshOutline /></NIcon>
            </template>
            全部更新 ({{ skillsStore.installedSkills.length }})
          </NButton>
        </NFormItem>
      </NForm>
      <NSpace justify="end" style="margin-top: 16px">
        <NButton type="primary" @click="handleSave">保存</NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 600px;
}
</style>
