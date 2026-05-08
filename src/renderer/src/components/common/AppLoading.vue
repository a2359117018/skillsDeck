<script setup lang="ts">
import { NSpin } from 'naive-ui'

defineProps<{ show: boolean }>()
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="app-loading-overlay">
      <div class="spinner-wrapper">
        <NSpin size="large" />
      </div>
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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn var(--transition-base);
}

.spinner-wrapper {
  padding: var(--space-xxl);
  background: linear-gradient(135deg, var(--color-brand-coral), var(--color-brand-purple));
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-3);
  animation: scaleIn var(--transition-base);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
