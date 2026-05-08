<script setup lang="ts">
import { ref, computed, nextTick, watch, onUnmounted } from 'vue'
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
  NScrollbar,
  useMessage
} from 'naive-ui'
import { DownloadOutline, CloseOutline } from '@vicons/ionicons5'
import { AGENTS, getCommonAgents } from '../../constants/agents'
import { useSkillsStore } from '../../stores/skills'

const props = defineProps<{ show: boolean; packageRef: string }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'complete'): void
}>()
const skillsStore = useSkillsStore()
const message = useMessage()

const currentStep = ref(1)
const isGlobal = ref(false)
const selectedAgents = ref<string[]>([])
const filterText = ref('')
const installing = ref(false)
const commandOutput = ref('')
const commandDone = ref(false)
const scrollbarRef = ref<InstanceType<typeof NScrollbar> | null>(null)

const commonAgents = getCommonAgents()

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

watch(commandOutput, async () => {
  await nextTick()
  try {
    if (scrollbarRef.value) {
      const el = scrollbarRef.value.$el
      const wrapEl = (el instanceof HTMLElement ? el : el?.$el)?.querySelector(
        '.n-scrollbar-container'
      ) as HTMLElement | null
      if (wrapEl) {
        wrapEl.scrollTop = wrapEl.scrollHeight
      }
    }
  } catch {}
})

async function handleInstall(): Promise<void> {
  installing.value = true
  commandDone.value = false
  commandOutput.value = ''

  removeOutputListener = window.api.skills.onInstallOutput((text) => {
    commandOutput.value += text
  })

  try {
    const result = await skillsStore.installStreaming(
      props.packageRef,
      selectedAgents.value,
      isGlobal.value
    )
    commandDone.value = true
    if (result.success) {
      message.success('安装成功')
    } else {
      message.error('安装失败')
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    commandOutput.value += errMsg
    commandDone.value = true
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
  commandDone.value = true
  installing.value = false
  if (removeOutputListener) {
    removeOutputListener()
    removeOutputListener = null
  }
}

function handleClose(): void {
  if (installing.value) return
  emit('update:show', false)
  if (commandDone.value) emit('complete')
}

function resetState(): void {
  currentStep.value = 1
  isGlobal.value = false
  selectedAgents.value = []
  filterText.value = ''
  installing.value = false
  commandOutput.value = ''
  commandDone.value = false
}

onUnmounted(() => {
  if (removeOutputListener) {
    removeOutputListener()
    removeOutputListener = null
  }
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
        >安装: <strong>{{ packageRef }}</strong></NText
      >

      <NSteps :current="currentStep" style="margin-top: var(--space-md)" size="small">
        <NStep title="选择目标" />
        <NStep title="确认安装" />
      </NSteps>

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

        <div v-if="commandOutput || installing" class="install-terminal">
          <NScrollbar ref="scrollbarRef" style="max-height: 240px">
            <pre
              class="terminal-content">{{ commandOutput }}<span v-if="installing" class="cursor-blink">▌</span></pre>
          </NScrollbar>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton v-if="currentStep === 1" @click="handleClose">取消</NButton>
          <NButton v-if="currentStep === 2 && !commandDone" :disabled="installing" @click="goBack">
            上一步
          </NButton>
          <NButton v-if="currentStep === 1" type="primary" :disabled="!canGoNext" @click="goNext">
            下一步
          </NButton>
          <NButton
            v-if="currentStep === 2 && !commandDone && !installing"
            type="primary"
            @click="handleInstall"
          >
            <template #icon>
              <NIcon :size="16"><DownloadOutline /></NIcon>
            </template>
            确认安装
          </NButton>
          <NButton v-if="installing" type="warning" @click="handleCancelInstall">
            <template #icon>
              <NIcon :size="16"><CloseOutline /></NIcon>
            </template>
            取消安装
          </NButton>
          <NButton v-if="commandDone" type="primary" @click="handleClose"> 完成 </NButton>
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

.install-terminal {
  background: #1e1e1e;
  border-radius: var(--radius-md);
  padding: var(--space-xs);
  box-shadow: var(--shadow-1);
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

.cursor-blink {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
