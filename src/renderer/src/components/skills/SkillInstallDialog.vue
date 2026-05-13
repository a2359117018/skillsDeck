<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import {
  NModal,
  NCard,
  NSteps,
  NStep,
  NCheckbox,
  NButton,
  NInput,
  NSpace,
  NText,
  NTag,
  NIcon,
  NProgress,
  NScrollbar,
  useMessage
} from 'naive-ui'
import { DownloadOutline, CheckmarkCircle, CloseCircle } from '@vicons/ionicons5'
import { AGENTS, getCommonAgents } from '../../constants/agents'
import { useSkillsStore } from '../../stores/skills'
import { useSettingsStore } from '../../stores/settings'

const props = defineProps<{ show: boolean; source: string }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'complete'): void
}>()
const skillsStore = useSkillsStore()
const settingsStore = useSettingsStore()
const message = useMessage()

const currentStep = ref(1)
const isGlobal = ref(false)
const selectedAgents = ref<string[]>([])
const filterText = ref('')
const installing = ref(false)
const installStatus = ref<'idle' | 'installing' | 'success' | 'failed' | 'cancelled'>('idle')
const commandOutput = ref('')
const simulatedProgress = ref(0)
let progressTimer: ReturnType<typeof setTimeout> | null = null

function startProgressSimulation(): void {
  simulatedProgress.value = 0
  const startTime = Date.now()

  function tick(): void {
    const elapsed = (Date.now() - startTime) / 1000
    if (elapsed < 3) {
      simulatedProgress.value = Math.min(85, simulatedProgress.value + 3 + Math.random() * 2)
      progressTimer = setTimeout(tick, 200)
    } else if (elapsed < 6) {
      simulatedProgress.value = Math.min(92, simulatedProgress.value + 1 + Math.random() * 2)
      progressTimer = setTimeout(tick, 300)
    } else {
      simulatedProgress.value = Math.min(92, simulatedProgress.value + Math.random())
      progressTimer = setTimeout(tick, 500)
    }
  }

  progressTimer = setTimeout(tick, 200)
}

function stopProgressSimulation(): void {
  if (progressTimer) {
    clearTimeout(progressTimer)
    progressTimer = null
  }
}

const commonAgents = getCommonAgents()

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      selectedAgents.value = [settingsStore.defaultAgent]
    }
  }
)

const filteredAgents = computed(() => {
  const text = filterText.value.toLowerCase()
  if (!text) return AGENTS
  return AGENTS.filter(
    (a) => a.name.toLowerCase().includes(text) || a.agentFlag.toLowerCase().includes(text)
  )
})

const allFilteredSelected = computed(
  () =>
    filteredAgents.value.length > 0 &&
    filteredAgents.value.every((a) => selectedAgents.value.includes(a.agentFlag))
)

function toggleCommonAgent(agentFlag: string): void {
  if (isGlobal.value) return
  const idx = selectedAgents.value.indexOf(agentFlag)
  if (idx >= 0) {
    selectedAgents.value.splice(idx, 1)
  } else {
    selectedAgents.value.push(agentFlag)
  }
}

function toggleSelectAll(): void {
  const flags = filteredAgents.value.map((a) => a.agentFlag)
  if (allFilteredSelected.value) {
    selectedAgents.value = selectedAgents.value.filter((s) => !flags.includes(s))
  } else {
    selectedAgents.value = [...new Set([...selectedAgents.value, ...flags])]
  }
}

function toggleGlobal(val: boolean): void {
  isGlobal.value = val
  if (val) selectedAgents.value = []
}

const canGoNext = computed(() => {
  if (isGlobal.value) return true
  return selectedAgents.value.length > 0
})

function goNext(): void {
  if (!canGoNext.value) {
    message.warning('请选择至少一个安装目标')
    return
  }
  currentStep.value = 2
}

function goBack(): void {
  if (installing.value) return
  currentStep.value = 1
}

let removeOutputListener: (() => void) | null = null

async function handleInstall(): Promise<void> {
  installing.value = true
  installStatus.value = 'installing'
  commandOutput.value = ''
  startProgressSimulation()

  removeOutputListener = window.api.skills.onInstallOutput((text) => {
    commandOutput.value += text
  })

  try {
    const result = await skillsStore.installStreaming(
      props.source,
      selectedAgents.value,
      isGlobal.value
    )
    stopProgressSimulation()
    if (result.success) {
      simulatedProgress.value = 100
      installStatus.value = 'success'
      setTimeout(() => {
        emit('update:show', false)
        emit('complete')
      }, 2000)
    } else {
      installStatus.value = 'failed'
    }
  } catch (error) {
    stopProgressSimulation()
    const errMsg = error instanceof Error ? error.message : String(error)
    commandOutput.value += errMsg
    installStatus.value = 'failed'
    message.error('安装失败: ' + errMsg)
  } finally {
    installing.value = false
    if (removeOutputListener) {
      removeOutputListener()
      removeOutputListener = null
    }
  }
}

async function handleCancelInstall(): Promise<void> {
  stopProgressSimulation()
  await window.api.skills.cancelInstall()
  commandOutput.value += '\n安装已取消'
  installStatus.value = 'cancelled'
  installing.value = false
  if (removeOutputListener) {
    removeOutputListener()
    removeOutputListener = null
  }
}

function handleClose(): void {
  if (installing.value) return
  emit('update:show', false)
  if (installStatus.value === 'success') emit('complete')
}

function handleRetry(): void {
  installStatus.value = 'idle'
  commandOutput.value = ''
}

function resetState(): void {
  currentStep.value = 1
  isGlobal.value = false
  selectedAgents.value = [settingsStore.defaultAgent]
  filterText.value = ''
  installing.value = false
  installStatus.value = 'idle'
  commandOutput.value = ''
  simulatedProgress.value = 0
}

onUnmounted(() => {
  stopProgressSimulation()
  if (removeOutputListener) {
    removeOutputListener()
    removeOutputListener = null
  }
})

const failedLogLines = computed(() => {
  if (!commandOutput.value) return []
  return commandOutput.value.split('\n').slice(-30)
})
</script>

<template>
  <NModal
    :show="show"
    :mask-closable="!installing"
    :on-after-leave="resetState"
    @update:show="handleClose"
  >
    <NCard title="安装技能" style="width: 620px">
      <NText
        >安装: <strong>{{ source }}</strong></NText
      >

      <NSteps :current="currentStep" style="margin-top: var(--space-md)" size="small">
        <NStep title="选择目标" />
        <NStep title="确认安装" />
      </NSteps>

      <!-- Step 1: Agent selection (unchanged) -->
      <div v-if="currentStep === 1" style="margin-top: var(--space-md)">
        <NCheckbox :checked="isGlobal" @update:checked="toggleGlobal">
          全局安装（不指定 agent）
        </NCheckbox>

        <div v-if="!isGlobal" class="agent-section">
          <NText depth="3" class="section-label">常用 Agent</NText>
          <NSpace :size="8" :wrap="true" class="common-agents">
            <NButton
              v-for="agent in commonAgents"
              :key="agent.agentFlag"
              :type="selectedAgents.includes(agent.agentFlag) ? 'primary' : 'default'"
              size="small"
              round
              @click="toggleCommonAgent(agent.agentFlag)"
            >
              {{ agent.name }}
            </NButton>
          </NSpace>

          <NText depth="3" class="section-label">筛选 Agent</NText>
          <NInput
            v-model:value="filterText"
            placeholder="搜索 agent..."
            clearable
            size="small"
            class="filter-input"
          />

          <NCheckbox
            :checked="allFilteredSelected"
            :indeterminate="
              selectedAgents.some((s) => filteredAgents.some((a) => a.agentFlag === s)) &&
              !allFilteredSelected
            "
            class="select-all-checkbox"
            @update:checked="toggleSelectAll"
          >
            全选当前筛选
          </NCheckbox>
          <div class="agent-list-scroll">
            <NSpace vertical :size="4">
              <NCheckbox
                v-for="agent in filteredAgents"
                :key="agent.agentFlag"
                :checked="selectedAgents.includes(agent.agentFlag)"
                @update:checked="() => toggleCommonAgent(agent.agentFlag)"
              >
                {{ agent.name }}
              </NCheckbox>
            </NSpace>
          </div>

          <NText depth="3" class="selected-count">
            已选: {{ selectedAgents.length }} 个 agent
          </NText>
        </div>
      </div>

      <!-- Step 2: Confirm and progress -->
      <div v-if="currentStep === 2" style="margin-top: var(--space-md)">
        <div class="confirm-row">
          <NText depth="3">安装模式: </NText>
          <NText>{{ isGlobal ? '全局安装' : '指定 Agent' }}</NText>
        </div>
        <div v-if="!isGlobal && selectedAgents.length > 0" class="confirm-row">
          <NText depth="3">选中 Agent: </NText>
          <NSpace :size="4" :wrap="true" inline style="display: inline-flex">
            <NTag v-for="flag in selectedAgents" :key="flag" size="small" round type="info">
              {{ AGENTS.find((a) => a.agentFlag === flag)?.name || flag }}
            </NTag>
          </NSpace>
        </div>

        <!-- Installing state -->
        <div v-if="installStatus === 'installing'" class="install-progress">
          <div class="progress-header">
            <NText depth="3" class="progress-label">正在安装中...</NText>
            <NText strong class="progress-percent">{{ Math.round(simulatedProgress) }}%</NText>
          </div>
          <NProgress
            type="line"
            :percentage="simulatedProgress"
            :show-indicator="false"
            :height="8"
            :border-radius="4"
            :fill-border-radius="4"
            status="default"
          />
          <NButton size="small" round class="progress-cancel-btn" @click="handleCancelInstall">
            取消安装
          </NButton>
        </div>

        <!-- Success state -->
        <div v-else-if="installStatus === 'success'" class="install-result install-result--success">
          <NIcon :size="48" color="#18a058"><CheckmarkCircle /></NIcon>
          <NText type="success">安装成功</NText>
        </div>

        <!-- Failed state -->
        <div v-else-if="installStatus === 'failed'" class="install-result install-result--failed">
          <NIcon :size="48" color="#d03050"><CloseCircle /></NIcon>
          <NText type="error">安装失败</NText>
          <div v-if="commandOutput" class="failed-log">
            <NScrollbar style="max-height: 200px">
              <pre class="terminal-content">{{ failedLogLines.join('\n') }}</pre>
            </NScrollbar>
          </div>
        </div>

        <!-- Cancelled state -->
        <div
          v-else-if="installStatus === 'cancelled'"
          class="install-result install-result--cancelled"
        >
          <NIcon :size="48" color="#f0a020"><CloseCircle /></NIcon>
          <NText type="warning">安装已取消</NText>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton v-if="currentStep === 1" @click="handleClose">取消</NButton>
          <NButton
            v-if="currentStep === 2 && installStatus === 'idle'"
            :disabled="installing"
            @click="goBack"
          >
            上一步
          </NButton>
          <NButton v-if="currentStep === 1" type="primary" :disabled="!canGoNext" @click="goNext">
            下一步
          </NButton>
          <NButton
            v-if="currentStep === 2 && installStatus === 'idle' && !installing"
            type="primary"
            @click="handleInstall"
          >
            <template #icon>
              <NIcon :size="16"><DownloadOutline /></NIcon>
            </template>
            确认安装
          </NButton>
          <NButton v-if="installStatus === 'failed'" type="primary" @click="handleRetry">
            重试
          </NButton>
          <NButton
            v-if="
              installStatus === 'failed' ||
              installStatus === 'success' ||
              installStatus === 'cancelled'
            "
            @click="handleClose"
          >
            关闭
          </NButton>
        </NSpace>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.agent-section {
  margin-top: var(--space-md);
}

.section-label {
  font-size: 13px;
  margin-bottom: var(--space-sm);
  display: block;
  color: var(--color-muted);
}

.common-agents {
  margin-bottom: var(--space-md);
}

.filter-input {
  margin-bottom: var(--space-sm);
}

.select-all-checkbox {
  margin-bottom: var(--space-sm);
}

.agent-list-scroll {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  background: var(--color-surface);
}

.selected-count {
  font-size: 12px;
  margin-top: var(--space-sm);
  display: block;
  color: var(--color-muted);
}

.confirm-row {
  margin-bottom: var(--space-md);
}

.install-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-lg) 0;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progress-label {
  font-size: var(--text-body-sm);
}

.progress-percent {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}

.progress-cancel-btn {
  align-self: flex-end;
  margin-top: var(--space-xs);
}

.install-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) 0;
}

.install-result--success {
  color: #18a058;
}

.install-result--failed {
  color: #d03050;
}

.install-result--cancelled {
  color: #f0a020;
}

.failed-log {
  width: 100%;
  margin-top: var(--space-md);
  background: #1e1e1e;
  border-radius: var(--radius-md);
  padding: var(--space-xs);
}

.terminal-content {
  color: #d4d4d4;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  padding: var(--space-sm) var(--space-md);
}
</style>
