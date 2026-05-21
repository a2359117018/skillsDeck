<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted, watch } from 'vue'
import {
  NModal,
  NCard,
  NSteps,
  NStep,
  NButton,
  NSpace,
  NText,
  NTag,
  NIcon,
  useMessage
} from 'naive-ui'
import { DownloadOutline, CheckmarkCircle, CloseCircle } from '@vicons/ionicons5'
import { AGENTS, getCommonAgents } from '../../constants/agents'
import AgentSelector from './AgentSelector.vue'
import { useSkillsStore } from '../../stores/skills'

const props = defineProps<{ show: boolean; source: string }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'complete'): void
}>()
const skillsStore = useSkillsStore()
const message = useMessage()

const currentStep = ref(1)
const isGlobal = ref(false)
const selectedAgents = ref<string[]>([])
const installing = ref(false)
const installStatus = ref<'idle' | 'installing' | 'success' | 'failed' | 'cancelled'>('idle')
const commandOutput = ref('')
const terminalRef = ref<HTMLElement | null>(null)

/** 自动滚动终端输出到底部 */
function scrollTerminalToBottom(): void {
  nextTick(() => {
    const el = terminalRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

const commonAgentFlags = getCommonAgents().map((a) => a.agentFlag)

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      selectedAgents.value = [...commonAgentFlags]
    }
  }
)

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

  removeOutputListener = window.api.skills.onInstallOutput((text) => {
    commandOutput.value += text
    scrollTerminalToBottom()
  })

  try {
    const result = await skillsStore.installStreaming(
      props.source,
      selectedAgents.value,
      isGlobal.value
    )
    if (result.success) {
      installStatus.value = 'success'
      setTimeout(() => {
        emit('update:show', false)
        emit('complete')
      }, 2000)
    } else {
      installStatus.value = 'failed'
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    commandOutput.value += errMsg
    scrollTerminalToBottom()
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
  await window.api.skills.cancelInstall()
  commandOutput.value += '\n安装已取消'
  scrollTerminalToBottom()
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
  selectedAgents.value = [...commonAgentFlags]
  installing.value = false
  installStatus.value = 'idle'
  commandOutput.value = ''
}

onUnmounted(() => {
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
    :trap-focus="true"
    :on-after-leave="resetState"
    @update:show="handleClose"
  >
    <NCard title="安装技能" style="width: 620px">
      <NText>即将安装：{{ source }}</NText>

      <NSteps :current="currentStep" style="margin-top: var(--space-md)" size="small">
        <NStep title="选择安装目标" />
        <NStep title="确认并安装" />
      </NSteps>

      <!-- Step 1: Agent selection -->
      <div v-if="currentStep === 1" style="margin-top: var(--space-md)">
        <AgentSelector v-model="selectedAgents" v-model:is-global="isGlobal" />
      </div>

      <!-- Step 2: Confirm and progress -->
      <div v-if="currentStep === 2" style="margin-top: var(--space-md)">
        <div class="confirm-row">
          <NText depth="3">安装方式：</NText>
          <NText>{{ isGlobal ? '所有 AI 工具' : '指定的 AI 工具' }}</NText>
        </div>
        <div v-if="!isGlobal && selectedAgents.length > 0" class="confirm-row">
          <NText depth="3">选中的 AI 工具：</NText>
          <NSpace :size="4" :wrap="true" inline style="display: inline-flex">
            <NTag v-for="flag in selectedAgents" :key="flag" size="small" round type="info">
              {{ AGENTS.find((a) => a.agentFlag === flag)?.name || flag }}
            </NTag>
          </NSpace>
        </div>

        <!-- Installing state: real CLI output -->
        <div v-if="installStatus === 'installing'" class="install-progress">
          <div class="progress-header">
            <NText depth="3" class="progress-label">正在安装中...</NText>
            <NButton size="tiny" round class="progress-cancel-btn" @click="handleCancelInstall">
              取消安装
            </NButton>
          </div>
          <div ref="terminalRef" class="install-terminal">
            <pre class="terminal-content">{{ commandOutput || '等待输出...' }}</pre>
          </div>
        </div>

        <!-- Success state -->
        <div v-else-if="installStatus === 'success'" class="install-result install-result--success">
          <NIcon :size="48"><CheckmarkCircle /></NIcon>
          <NText type="success">安装成功</NText>
        </div>

        <!-- Failed state -->
        <div v-else-if="installStatus === 'failed'" class="install-result install-result--failed">
          <NIcon :size="48"><CloseCircle /></NIcon>
          <NText type="error">安装失败</NText>
          <div v-if="commandOutput" class="failed-log">
            <pre class="terminal-content">{{ failedLogLines.join('\n') }}</pre>
          </div>
        </div>

        <!-- Cancelled state -->
        <div
          v-else-if="installStatus === 'cancelled'"
          class="install-result install-result--cancelled"
        >
          <NIcon :size="48"><CloseCircle /></NIcon>
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
            开始安装
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
.confirm-row {
  margin-bottom: var(--space-md);
}

.install-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md) 0;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progress-label {
  font-size: var(--text-body-sm);
}

.progress-cancel-btn {
  flex-shrink: 0;
}

.install-terminal {
  max-height: 240px;
  overflow-y: auto;
  background: var(--color-ink);
  border-radius: var(--radius-md);
  padding: var(--space-xs);
}

.install-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) 0;
}

.install-result--success {
  color: var(--color-success-text);
}

.install-result--failed {
  color: var(--color-error);
}

.install-result--cancelled {
  color: var(--color-warning);
}

.failed-log {
  width: 100%;
  margin-top: var(--space-md);
  background: var(--color-ink);
  border-radius: var(--radius-md);
  padding: var(--space-xs);
}

.terminal-content {
  color: var(--color-muted);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  padding: var(--space-sm) var(--space-md);
}
</style>
