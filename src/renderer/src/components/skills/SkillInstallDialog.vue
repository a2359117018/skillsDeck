<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NModal, NCard, NCheckboxGroup, NCheckbox, NSpace, NButton, NInput,
  NCollapse, NCollapseItem, NText, useMessage
} from 'naive-ui'
import { AGENTS, getCommonAgents } from '../../constants/agents'
import { useSkillsStore } from '../../stores/skills'

const props = defineProps<{ show: boolean; packageRef: string }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'complete'): void
}>()
const skillsStore = useSkillsStore()
const message = useMessage()

const isGlobal = ref(false)
const selectedAgents = ref<string[]>([])
const filterText = ref('')
const installing = ref(false)
const commandOutput = ref('')
const commandDone = ref(false)

const commonAgents = getCommonAgents()

const allAgents = computed(() => {
  const text = filterText.value.toLowerCase()
  if (!text) return AGENTS
  return AGENTS.filter(
    (a) => a.name.toLowerCase().includes(text) || a.agentFlag.toLowerCase().includes(text)
  )
})

const allCommonSelected = computed(() =>
  commonAgents.length > 0 && commonAgents.every((a) => selectedAgents.value.includes(a.agentFlag))
)
const allFilteredSelected = computed(() =>
  allAgents.value.length > 0 && allAgents.value.every((a) => selectedAgents.value.includes(a.agentFlag))
)

function toggleSelectCommon() {
  const flags = commonAgents.map((a) => a.agentFlag)
  if (allCommonSelected.value) {
    selectedAgents.value = selectedAgents.value.filter((s) => !flags.includes(s))
  } else {
    selectedAgents.value = [...new Set([...selectedAgents.value, ...flags])]
  }
}

function toggleSelectAll() {
  const flags = allAgents.value.map((a) => a.agentFlag)
  if (allFilteredSelected.value) {
    selectedAgents.value = selectedAgents.value.filter((s) => !flags.includes(s))
  } else {
    selectedAgents.value = [...new Set([...selectedAgents.value, ...flags])]
  }
}

function toggleGlobal(val: boolean) {
  isGlobal.value = val
  if (val) selectedAgents.value = []
}

async function handleInstall() {
  if (!isGlobal.value && selectedAgents.value.length === 0) {
    message.warning('请选择至少一个安装目标')
    return
  }
  installing.value = true
  commandDone.value = false
  commandOutput.value = ''
  try {
    const result = await skillsStore.install(props.packageRef, selectedAgents.value, isGlobal.value)
    commandOutput.value = result.stdout || result.stderr || ''
    commandDone.value = true
    if (result.success) {
      message.success('安装成功')
    } else {
      message.error('安装失败')
    }
  } catch (error: any) {
    commandOutput.value = error.message
    commandDone.value = true
    message.error('安装失败: ' + error.message)
  } finally {
    installing.value = false
  }
}

function handleClose() {
  if (!installing.value) {
    emit('update:show', false)
    if (commandDone.value) emit('complete')
  }
}
</script>

<template>
  <NModal :show="show" @update:show="handleClose">
    <NCard title="安装技能" style="width: 560px">
      <NText>安装: <strong>{{ packageRef }}</strong></NText>

      <div style="margin-top: 16px">
        <NCheckbox :checked="isGlobal" @update:checked="toggleGlobal">
          全局安装（不指定 agent）
        </NCheckbox>
      </div>

      <div v-if="!isGlobal" style="margin-top: 12px">
        <NInput
          v-model:value="filterText"
          placeholder="筛选 agent..."
          clearable
          size="small"
          style="margin-bottom: 8px"
        />
        <NCheckboxGroup v-model:value="selectedAgents">
          <NCollapse :default-expanded-names="['common', 'all']">
            <NCollapseItem title="常用" name="common">
              <NCheckbox
                :checked="allCommonSelected"
                :indeterminate="selectedAgents.some(s => commonAgents.some(a => a.agentFlag === s)) && !allCommonSelected"
                @update:checked="toggleSelectCommon"
                style="margin-bottom: 8px"
              >
                全选常用
              </NCheckbox>
              <NSpace vertical>
                <NCheckbox v-for="agent in commonAgents" :key="agent.agentFlag" :value="agent.agentFlag" :label="agent.name" />
              </NSpace>
            </NCollapseItem>
            <NCollapseItem title="全部" name="all">
              <NCheckbox
                :checked="allFilteredSelected"
                :indeterminate="selectedAgents.some(s => allAgents.some(a => a.agentFlag === s)) && !allFilteredSelected"
                @update:checked="toggleSelectAll"
                style="margin-bottom: 8px"
              >
                全选当前筛选
              </NCheckbox>
              <NSpace vertical style="max-height: 200px; overflow-y: auto">
                <NCheckbox v-for="agent in allAgents" :key="agent.agentFlag" :value="agent.agentFlag" :label="agent.name" />
              </NSpace>
            </NCollapseItem>
          </NCollapse>
        </NCheckboxGroup>
        <NText depth="3" style="font-size: 12px; margin-top: 8px; display: block">
          已选: {{ selectedAgents.length }} 个 agent
        </NText>
      </div>

      <div v-if="commandOutput" style="margin-top: 12px">
        <div class="mini-terminal">{{ commandOutput }}</div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="handleClose">取消</NButton>
          <NButton type="primary" :loading="installing" @click="handleInstall">确认安装</NButton>
        </NSpace>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.mini-terminal {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
}
</style>