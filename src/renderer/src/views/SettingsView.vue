<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NCard,
  NForm,
  NFormItem,
  NSelect,
  NSwitch,
  NButton,
  NSpace,
  NIcon,
  NInput,
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

const CUSTOM_PROXY_VALUE = '__custom__'

const proxyOptions = [
  { label: '不使用代理', value: '' },
  { label: 'gh-proxy.org', value: 'https://gh-proxy.org' },
  { label: 'hk.gh-proxy.org', value: 'https://hk.gh-proxy.org' },
  { label: 'cdn.gh-proxy.org', value: 'https://cdn.gh-proxy.org' },
  { label: 'edgeone.gh-proxy.org', value: 'https://edgeone.gh-proxy.org' },
  { label: '自定义...', value: CUSTOM_PROXY_VALUE }
]

const selectedProxy = ref('')
const customProxyUrl = ref('')

onMounted(() => {
  settingsStore.load().then(() => {
    const stored = settingsStore.proxyUrl
    const preset = proxyOptions.find((o) => o.value === stored)
    if (preset && stored !== CUSTOM_PROXY_VALUE) {
      selectedProxy.value = stored
      customProxyUrl.value = ''
    } else if (stored && stored.startsWith('https://')) {
      selectedProxy.value = CUSTOM_PROXY_VALUE
      customProxyUrl.value = stored
    } else {
      selectedProxy.value = ''
      customProxyUrl.value = ''
    }
  })
})

const showCustomInput = computed(() => selectedProxy.value === CUSTOM_PROXY_VALUE)

const effectiveProxyUrl = computed(() => {
  if (selectedProxy.value === CUSTOM_PROXY_VALUE) {
    return customProxyUrl.value.trim()
  }
  return selectedProxy.value
})

async function handleSave(): Promise<void> {
  if (
    showCustomInput.value &&
    customProxyUrl.value &&
    !customProxyUrl.value.trim().startsWith('https://')
  ) {
    message.warning('自定义代理地址必须以 https:// 开头')
    return
  }
  await settingsStore.save({
    defaultAgent: settingsStore.defaultAgent,
    autoCheckEnv: settingsStore.autoCheckEnv,
    proxyUrl: effectiveProxyUrl.value
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
    <NCard title="设置" class="settings-card">
      <NForm label-placement="left" label-width="140" class="settings-form">
        <NFormItem label="默认安装目标">
          <NSelect v-model:value="settingsStore.defaultAgent" :options="agentOptions" filterable />
        </NFormItem>
        <NFormItem label="启动时检查环境">
          <NSwitch v-model:value="settingsStore.autoCheckEnv" />
        </NFormItem>
        <NFormItem label="GitHub 代理">
          <NSelect v-model:value="selectedProxy" :options="proxyOptions" />
          <NInput
            v-if="showCustomInput"
            v-model:value="customProxyUrl"
            placeholder="https://your-proxy.com"
            style="margin-top: var(--space-sm)"
          />
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
      <NSpace justify="end" style="margin-top: var(--space-lg)">
        <NButton type="primary" round @click="handleSave">保存</NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-xl);
}

.settings-card {
  border-radius: var(--radius-xl);
}

.settings-form :deep(.n-form-item-label) {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink);
}
</style>
