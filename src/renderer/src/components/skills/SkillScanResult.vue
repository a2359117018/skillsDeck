<script setup lang="ts">
import { computed } from 'vue'
import { NCheckbox, NSpace, NText, NEmpty } from 'naive-ui'
import type { ScannedSkill } from '../../../../shared/types'

const props = defineProps<{
  skills: ScannedSkill[]
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const allSelected = computed(
  () => props.skills.length > 0 && props.skills.every((s) => props.modelValue.includes(s.path))
)

const someSelected = computed(
  () => props.skills.some((s) => props.modelValue.includes(s.path)) && !allSelected.value
)

function toggleAll(): void {
  if (allSelected.value) {
    emit('update:modelValue', [])
  } else {
    emit(
      'update:modelValue',
      props.skills.map((s) => s.path)
    )
  }
}

function toggleSkill(path: string): void {
  const current = [...props.modelValue]
  const idx = current.indexOf(path)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(path)
  }
  emit('update:modelValue', current)
}
</script>

<template>
  <div class="scan-result">
    <div v-if="skills.length > 0" class="scan-header">
      <NCheckbox :checked="allSelected" :indeterminate="someSelected" @update:checked="toggleAll">
        全选 ({{ modelValue.length }} / {{ skills.length }})
      </NCheckbox>
    </div>
    <div v-if="skills.length > 0" class="scan-list">
      <NSpace vertical :size="8">
        <div v-for="skill in skills" :key="skill.path" class="scan-item">
          <NCheckbox
            :checked="modelValue.includes(skill.path)"
            @update:checked="() => toggleSkill(skill.path)"
          >
            <div class="skill-info">
              <NText strong>{{ skill.name }}</NText>
              <NText depth="3" class="skill-path">{{ skill.relativePath }}</NText>
            </div>
          </NCheckbox>
        </div>
      </NSpace>
    </div>
    <NEmpty v-else description="未扫描到技能" />
  </div>
</template>

<style scoped>
.scan-result {
  width: 100%;
}

.scan-header {
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-hairline);
}

.scan-list {
  max-height: 240px;
  overflow-y: auto;
}

.scan-item {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.skill-info {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
}

.skill-path {
  font-size: 12px;
}
</style>
