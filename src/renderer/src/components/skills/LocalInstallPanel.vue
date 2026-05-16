<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NText, NSpin, useMessage } from 'naive-ui'
import type { ScannedSkill, LocalInstallResult } from '../../../../shared/types'
import SkillScanResult from './SkillScanResult.vue'
import AgentSelector from './AgentSelector.vue'

defineProps<{
  skills: ScannedSkill[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  install: [payload: { skillDirs: string[]; agents: string[]; isGlobal: boolean }]
}>()

const message = useMessage()
const selectedSkills = ref<string[]>([])
const selectedAgents = ref<string[]>([])
const isGlobal = ref(false)
const installing = ref(false)
const installResult = ref<LocalInstallResult | null>(null)

const canInstall = computed(() => {
  if (selectedSkills.value.length === 0) return false
  if (isGlobal.value) return true
  return selectedAgents.value.length > 0
})

async function handleInstall(): Promise<void> {
  if (!canInstall.value) {
    message.warning('请选择要安装的技能和目标 agent')
    return
  }
  installing.value = true
  installResult.value = null
  try {
    const agents = isGlobal.value ? [] : selectedAgents.value
    emit('install', {
      skillDirs: selectedSkills.value,
      agents,
      isGlobal: isGlobal.value
    })
  } finally {
    installing.value = false
  }
}

function showInstallResult(result: LocalInstallResult): void {
  installResult.value = result
  if (result.failed.length > 0) {
    message.error(`安装完成：${result.success.length} 个成功，${result.failed.length} 个失败`)
  } else {
    message.success(`成功安装 ${result.success.length} 个技能`)
  }
}

defineExpose({ showInstallResult })
</script>

<template>
  <div class="local-install-panel">
    <div v-if="loading" class="panel-loading">
      <NSpin size="large" />
      <NText depth="3">正在处理...</NText>
    </div>

    <div v-else-if="error" class="panel-error">
      <NText type="error">{{ error }}</NText>
    </div>

    <div v-else-if="skills.length > 0" class="panel-content">
      <div class="panel-section">
        <NText depth="3" class="section-title">扫描到的技能</NText>
        <SkillScanResult v-model:model-value="selectedSkills" :skills="skills" />
      </div>

      <div class="panel-section">
        <NText depth="3" class="section-title">安装目标</NText>
        <AgentSelector v-model:model-value="selectedAgents" v-model:is-global="isGlobal" />
      </div>

      <div class="panel-actions">
        <NButton
          type="primary"
          :disabled="!canInstall || installing"
          :loading="installing"
          @click="handleInstall"
        >
          安装选中技能
        </NButton>
      </div>

      <div v-if="installResult" class="install-result">
        <NText v-if="installResult.success.length > 0" type="success">
          成功: {{ installResult.success.join(', ') }}
        </NText>
        <div v-if="installResult.failed.length > 0">
          <NText type="error">失败:</NText>
          <div v-for="f in installResult.failed" :key="f.name" class="fail-item">
            <NText type="error">{{ f.name }}: {{ f.error }}</NText>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.local-install-panel {
  width: 100%;
}

.panel-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) 0;
}

.panel-error {
  padding: var(--space-md);
  background: #fef2f2;
  border-radius: var(--radius-md);
  border: 1px solid #fecaca;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.panel-section {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-hairline);
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: var(--space-sm);
  display: block;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
}

.install-result {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-hairline);
}

.fail-item {
  margin-top: var(--space-xs);
}
</style>
