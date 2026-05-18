<script setup lang="ts">
import { NButton, NText, NSpin } from 'naive-ui'
import type { ScannedSkill, LocalInstallResult } from '../../../../shared/types'
import SkillScanResult from './SkillScanResult.vue'
import AgentSelector from './AgentSelector.vue'

defineProps<{
  skills: ScannedSkill[]
  selectedSkills: string[]
  selectedAgents: string[]
  isGlobal: boolean
  installing: boolean
  installResult: LocalInstallResult | null
  canInstall: boolean
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  'update:selectedSkills': [value: string[]]
  'update:selectedAgents': [value: string[]]
  'update:isGlobal': [value: boolean]
  install: []
}>()
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
      <div class="panel-grid">
        <div class="panel-section">
          <NText depth="3" class="section-title">扫描到的技能</NText>
          <SkillScanResult
            :skills="skills"
            :model-value="selectedSkills"
            @update:model-value="emit('update:selectedSkills', $event)"
          />
        </div>

        <div class="panel-section">
          <NText depth="3" class="section-title">安装目标</NText>
          <AgentSelector
            :model-value="selectedAgents"
            :is-global="isGlobal"
            @update:model-value="emit('update:selectedAgents', $event)"
            @update:is-global="emit('update:isGlobal', $event)"
          />
        </div>
      </div>

      <div class="panel-actions">
        <NButton
          type="primary"
          :disabled="!canInstall || installing"
          :loading="installing"
          @click="emit('install')"
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
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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
  background: var(--color-error-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-error);
}

.panel-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: var(--space-lg);
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  flex: 1;
  min-height: 0;
}

.panel-section {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-hairline);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: var(--space-sm);
  display: block;
  flex-shrink: 0;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.install-result {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-hairline);
  flex-shrink: 0;
}

.fail-item {
  margin-top: var(--space-xs);
}
</style>
