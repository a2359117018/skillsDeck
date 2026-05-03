<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NPageHeader,
  NButton,
  NSpace,
  NDescriptions,
  NDescriptionsItem,
  NText,
  useMessage
} from 'naive-ui'
import { useSkillsStore } from '../stores/skills'
import SkillInstallDialog from '../components/skills/SkillInstallDialog.vue'
import CommandOutput from '../components/common/CommandOutput.vue'

const route = useRoute()
const router = useRouter()
const skillsStore = useSkillsStore()
const message = useMessage()

const packageRef = decodeURIComponent(route.params.packageRef as string)
const showInstallDialog = ref(false)
const operationOutput = ref('')
const operationLoading = ref(false)

async function handleUpdate(): Promise<void> {
  operationLoading.value = true
  operationOutput.value = ''
  try {
    const result = await skillsStore.update(packageRef)
    operationOutput.value = result.stdout || result.stderr || ''
    if (result.success) message.success('更新成功')
    else message.error('更新失败')
  } finally {
    operationLoading.value = false
  }
}

async function handleRemove(): Promise<void> {
  if (!window.confirm(`确定删除 ${packageRef}? 此操作不可撤销`)) return
  operationLoading.value = true
  operationOutput.value = ''
  try {
    const result = await skillsStore.remove(packageRef)
    operationOutput.value = result.stdout || result.stderr || ''
    if (result.success) {
      message.success('删除成功')
      setTimeout(() => router.back(), 500)
    } else {
      message.error('删除失败')
    }
  } finally {
    operationLoading.value = false
  }
}
</script>

<template>
  <div class="detail-page">
    <NPageHeader @back="router.back()" :title="packageRef" subtitle="技能管理" />
    <NDescriptions bordered :column="1" label-placement="left" style="margin-top: 16px">
      <NDescriptionsItem label="包名">
        <NText code>{{ packageRef }}</NText>
      </NDescriptionsItem>
    </NDescriptions>
    <NSpace style="margin-top: 16px">
      <NButton type="primary" @click="showInstallDialog = true">安装到...</NButton>
      <NButton :loading="operationLoading" @click="handleUpdate">更新</NButton>
      <NButton type="error" :loading="operationLoading" @click="handleRemove">删除</NButton>
    </NSpace>
    <div v-if="operationOutput" style="margin-top: 16px">
      <CommandOutput :content="operationOutput" />
    </div>
    <SkillInstallDialog
      v-model:show="showInstallDialog"
      :package-ref="packageRef"
      @complete="operationOutput = ''"
    />
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 900px;
}
</style>
