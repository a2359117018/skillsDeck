<script setup lang="ts">
import { onMounted } from 'vue'
import { NCard, NForm, NFormItem, NSelect, NSwitch, NButton, NSpace, useMessage } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'
import { AGENTS } from '../constants/agents'

const settingsStore = useSettingsStore()
const message = useMessage()

const agentOptions = AGENTS.map((a) => ({ label: a.name, value: a.agentFlag }))

onMounted(() => settingsStore.load())

async function handleSave(): Promise<void> {
  await settingsStore.save({
    defaultAgent: settingsStore.defaultAgent,
    autoCheckEnv: settingsStore.autoCheckEnv
  })
  message.success('设置已保存')
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
      </NForm>
      <NSpace justify="end" style="margin-top: 16px">
        <NButton type="primary" @click="handleSave">保存</NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 24px;
  height: 100vh;
}
</style>
