<script setup lang="ts">
import { ref } from 'vue'
import { NInput } from 'naive-ui'
import { useDebounceFn } from '@vueuse/core'

const keyword = ref('')
const emit = defineEmits<{ (e: 'search', keyword: string): void }>()

const debouncedSearch = useDebounceFn(() => {
  if (keyword.value.trim()) emit('search', keyword.value.trim())
}, 300)

function onInput(value: string): void {
  keyword.value = value
  debouncedSearch()
}
</script>

<template>
  <NInput
    :value="keyword"
    placeholder="搜索技能..."
    clearable
    @input="onInput"
    @clear="keyword = ''"
  />
</template>
