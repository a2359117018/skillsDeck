<script setup lang="ts">
import { NSpin } from 'naive-ui'

defineProps<{ show: boolean }>()
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="app-loading-overlay">
      <NSpin size="large" />
    </div>
  </Transition>
</template>

<style scoped>
.app-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
</style>
