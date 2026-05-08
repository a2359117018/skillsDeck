<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSpace, NDescriptions, NDescriptionsItem, NText, NIcon, useMessage } from 'naive-ui'
import { ArrowBack } from '@vicons/ionicons5'
import { useSkillsStore } from '../stores/skills'
import { useConfirm } from '../composables/useConfirm'
import SkillInstallDialog from '../components/skills/SkillInstallDialog.vue'
import CommandOutput from '../components/common/CommandOutput.vue'

const route = useRoute()
const router = useRouter()
const skillsStore = useSkillsStore()
const message = useMessage()
const { confirmUpdate, confirmRemove, confirmInstall } = useConfirm()

const packageRef = decodeURIComponent(route.params.packageRef as string)
const showInstallDialog = ref(false)
const operationOutput = ref('')
const operationLoading = ref(false)

async function handleUpdate(): Promise<void> {
  const confirmed = await confirmUpdate(packageRef)
  if (!confirmed) return
  operationLoading.value = true
  operationOutput.value = ''
  try {
    const result = await skillsStore.update(packageRef, true)
    operationOutput.value = result.stdout || result.stderr || ''
    if (result.success) message.success('更新成功')
    else message.error('更新失败')
  } finally {
    operationLoading.value = false
  }
}

async function handleRemove(): Promise<void> {
  const confirmed = await confirmRemove(packageRef)
  if (!confirmed) return
  operationLoading.value = true
  operationOutput.value = ''
  try {
    const result = await skillsStore.remove(packageRef, true)
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

async function handleInstallClick(): Promise<void> {
  const confirmed = await confirmInstall(packageRef)
  if (!confirmed) return
  showInstallDialog.value = true
}
</script>

<template>
  <div class="detail-page">
    <button class="breadcrumb-back" @click="router.back()">
      <NIcon :size="20"><ArrowBack /></NIcon>
      <span>返回</span>
    </button>

    <div class="detail-header">
      <h1 class="detail-title">{{ packageRef }}</h1>
      <NText code class="detail-package">{{ packageRef }}</NText>
    </div>

    <div class="detail-actions">
      <NButton size="medium" round class="action-btn action-btn-primary" @click="handleInstallClick">
        安装到...
      </NButton>
      <NButton
        size="medium"
        round
        class="action-btn"
        :loading="skillsStore.updating || operationLoading"
        @click="handleUpdate"
      >
        更新
      </NButton>
      <NButton
        size="medium"
        round
        class="action-btn action-btn-danger"
        :loading="skillsStore.removing || operationLoading"
        @click="handleRemove"
      >
        删除
      </NButton>
    </div>

    <div v-if="operationOutput" class="detail-output">
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
  padding: var(--space-lg) 0;
}

.breadcrumb-back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: none;
  color: var(--color-stone);
  font-size: var(--text-body-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--space-md);
}

.breadcrumb-back:hover {
  color: var(--color-ink);
}

.detail-header {
  margin-bottom: var(--space-xl);
}

.detail-title {
  font-size: var(--text-heading-lg);
  font-weight: var(--weight-bold);
  color: var(--color-ink);
  margin: 0 0 var(--space-sm) 0;
  line-height: var(--leading-tight);
}

.detail-package {
  font-size: var(--text-body-sm);
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  color: var(--color-stone);
}

.detail-actions {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.action-btn {
  min-width: 100px;
  font-weight: var(--weight-medium);
  border-radius: var(--radius-full);
  transition: all var(--transition-base);
}

.action-btn-primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-canvas);
}

.action-btn-primary:hover {
  background: var(--color-ink);
  border-color: var(--color-ink);
}

.action-btn-danger {
  border-color: var(--color-error);
  color: var(--color-error);
  background: transparent;
}

.action-btn-danger:hover {
  background: var(--color-error-bg);
}

.detail-output {
  margin-top: var(--space-lg);
}
</style>
