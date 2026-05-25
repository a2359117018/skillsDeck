<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NSkeleton, NEmpty } from 'naive-ui'
import SkillDocContent from './SkillDocContent.vue'
import type { SkillDoc } from '../../../../shared/types'

const props = defineProps<{
  show: boolean
  skillName: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const doc = ref<SkillDoc | null>(null)

/** 通过 IPC 获取技能 SKILL.md 内容 */
async function fetchDoc(): Promise<void> {
  loading.value = true
  error.value = null
  doc.value = null

  try {
    const result = await window.api.skills.readDoc(props.skillName)
    if (result.ok) {
      doc.value = result.data
    } else {
      error.value = result.error.message
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

/** Modal 打开时自动加载文档 */
watch(
  () => props.show,
  (visible) => {
    if (visible && props.skillName) {
      fetchDoc()
    }
  }
)
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="skillName"
    :bordered="false"
    :segmented="{ content: true }"
    :style="{ width: 'min(560px, 60vw)', maxHeight: 'min(600px, 80vh)' }"
    content-style="overflow-y: auto;"
    header-style="padding: var(--space-md) var(--space-lg);"
    @update:show="emit('update:show', $event)"
  >
    <div v-if="loading" class="loading-state">
      <NSkeleton text :repeat="3" />
      <NSkeleton text style="width: 60%" />
    </div>

    <div v-else-if="error" class="error-state">
      <NEmpty :description="error" />
    </div>

    <div v-else-if="!doc" class="empty-state">
      <NEmpty description="暂无文档" />
    </div>

    <SkillDocContent v-else :content="doc.content" />
  </NModal>
</template>

<style scoped>
.loading-state,
.error-state,
.empty-state {
  padding: var(--space-xl) var(--space-md);
}
</style>
