<script setup lang="ts">
import { NForm, NFormItem, NSwitch, NSelect } from 'naive-ui'

const props = defineProps<{
  autoCheckEnv: boolean
  closeAction: 'ask' | 'tray' | 'quit'
}>()

const emit = defineEmits<{
  (e: 'update:autoCheckEnv', value: boolean): void
  (e: 'update:closeAction', value: 'ask' | 'tray' | 'quit'): void
}>()

const closeActionOptions = [
  { label: '每次询问', value: 'ask' },
  { label: '最小化到系统托盘', value: 'tray' },
  { label: '退出应用', value: 'quit' }
]
</script>

<template>
  <NForm label-placement="left" label-width="140" class="settings-form">
    <NFormItem label="启动时检查运行环境">
      <NSwitch :value="props.autoCheckEnv" @update:value="(v) => emit('update:autoCheckEnv', v)" />
    </NFormItem>
    <NFormItem label="关闭时">
      <NSelect
        :value="props.closeAction"
        :options="closeActionOptions"
        class="settings-select"
        @update:value="(v) => emit('update:closeAction', v as 'ask' | 'tray' | 'quit')"
      />
    </NFormItem>
  </NForm>
</template>

<style scoped>
.settings-form :deep(.n-form-item-label) {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink);
}

.settings-form :deep(.n-form-item) {
  margin-bottom: var(--space-md);
}

.settings-form :deep(.n-form-item:last-child) {
  margin-bottom: 0;
}

.settings-select {
  width: 100%;
}
</style>
