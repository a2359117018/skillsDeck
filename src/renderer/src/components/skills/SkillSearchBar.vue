<script setup lang="ts">
import { computed } from 'vue'
import { NInput, NButton, NIcon } from 'naive-ui'
import SearchOutline from '@vicons/ionicons5/SearchOutline'

const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [keyword: string]
}>()

const keyword = computed({
  get: () => props.modelValue ?? '',
  set: (val: string) => emit('update:modelValue', val),
})

function handleSearch(): void {
  if (keyword.value.trim()) emit('search', keyword.value.trim())
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') handleSearch()
}
</script>

<template>
  <div class="search-bar-wrapper">
    <div class="search-bar-container">
      <NInput
        v-model:value="keyword"
        placeholder="输入技能名称或关键词搜索..."
        aria-label="搜索技能"
        size="large"
        clearable
        round
        class="search-input"
        @keydown="handleKeydown"
      >
        <template #prefix>
          <NIcon :size="18" :color="'var(--color-muted)'"><SearchOutline /></NIcon>
        </template>
      </NInput>
      <NButton type="primary" size="large" round class="search-btn" @click="handleSearch">
        <template #icon>
          <NIcon :size="18"><SearchOutline /></NIcon>
        </template>
        搜索
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.search-bar-wrapper {
  padding: var(--space-sm) 0 var(--space-lg);
  flex-shrink: 0;
}

.search-bar-container {
  display: flex;
  gap: var(--space-md);
  width: 100%;
  align-items: center;
}

.search-input {
  flex: 1;
}

.search-input :deep(.n-input__input-el) {
  height: 40px;
}

.search-btn {
  flex-shrink: 0;
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-canvas);
  font-weight: var(--weight-medium);
  transition: all var(--transition-base);
}

.search-btn:hover {
  background: var(--color-ink);
  border-color: var(--color-ink);
}
</style>
