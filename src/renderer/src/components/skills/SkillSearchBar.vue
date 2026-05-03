<script setup lang="ts">
import { ref } from 'vue'
import { NInput, NButton, NSpace } from 'naive-ui'

const keyword = ref('')
const emit = defineEmits<{ (e: 'search', keyword: string): void }>()

function handleSearch(): void {
  if (keyword.value.trim()) emit('search', keyword.value.trim())
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') handleSearch()
}
</script>

<template>
  <NSpace align="center">
    <NInput
      :value="keyword"
      placeholder="搜索技能..."
      clearable
      style="flex: 1"
      @input="(v: string) => (keyword = v)"
      @keydown="handleKeydown"
      @clear="keyword = ''"
    />
    <NButton type="primary" @click="handleSearch">搜索</NButton>
  </NSpace>
</template>
