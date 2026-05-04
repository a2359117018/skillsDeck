<script setup lang="ts">
import { ref } from 'vue'
import { NInput, NButton, NIcon } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'

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
        size="large"
        clearable
        round
        class="search-input"
        @keydown="handleKeydown"
      >
        <template #prefix>
          <NIcon :size="18" color="#999"><SearchOutline /></NIcon>
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
  display: flex;
  justify-content: center;
  padding: 8px 0 20px;
}

.search-bar-container {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 680px;
  align-items: center;
}

.search-input {
  flex: 1;
}

.search-btn {
  flex-shrink: 0;
}
</style>
