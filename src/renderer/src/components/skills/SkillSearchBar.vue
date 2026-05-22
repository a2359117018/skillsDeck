<script setup lang="ts">
import { ref } from 'vue'
import { NInput, NIcon } from 'naive-ui'
import SearchOutline from '@vicons/ionicons5/SearchOutline'

const keyword = ref('')
const emit = defineEmits<{ search: [keyword: string] }>()

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
    </div>
  </div>
</template>

<style scoped>
.search-bar-wrapper {
  padding: var(--space-sm) 0 var(--space-lg);
}

.search-bar-container {
  display: flex;
  width: 100%;
  align-items: center;
}

.search-input {
  flex: 1;
}

.search-input :deep(.n-input__input-el) {
  height: 40px;
}
</style>
