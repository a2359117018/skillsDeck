<script setup lang="ts">
import { NButton, NIcon, NText } from 'naive-ui'
import { DownloadOutline } from '@vicons/ionicons5'
import type { SkillSearchResult } from '../../../../shared/types'
import { toPackageRef, formatInstalls } from '../../../../shared/types'

const props = defineProps<{ result: SkillSearchResult }>()
const emit = defineEmits<{ install: [packageRef: string] }>()

const packageRef = toPackageRef(props.result.id)
const detailUrl = `https://skills.sh/${props.result.id}`
</script>

<template>
  <div class="result-card">
    <div class="result-card-header">
      <div class="result-card-title-row">
        <NText strong class="result-name">{{ result.name }}</NText>
        <div class="install-badge">
          {{ formatInstalls(result.installs) }} 次下载
        </div>
      </div>
      <NText depth="3" code class="package-ref">{{ packageRef }}</NText>
      <a :href="detailUrl" target="_blank" class="result-link">{{ detailUrl }}</a>
    </div>
    <NButton size="small" round class="install-btn" @click="emit('install', packageRef)">
      <template #icon>
        <NIcon :size="16"><DownloadOutline /></NIcon>
      </template>
      安装
    </NButton>
  </div>
</template>

<style scoped>
.result-card {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-xl);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  transition: all var(--transition-base);
  border-left: 3px solid transparent;
}

.result-card:hover {
  border-left-color: var(--color-brand-coral);
  box-shadow: var(--shadow-3);
}

.result-card-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.result-card-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.result-name {
  font-size: var(--text-body-md);
  color: var(--color-ink);
  font-weight: var(--weight-semibold);
}

.install-badge {
  background: var(--color-brand-blue-200);
  color: var(--color-brand-blue-deep);
  font-size: var(--text-micro);
  padding: 2px var(--space-xs);
  border-radius: var(--radius-full);
  font-weight: var(--weight-medium);
  white-space: nowrap;
}

.package-ref {
  font-size: var(--text-caption);
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  color: var(--color-stone);
}

.result-link {
  font-size: var(--text-caption);
  color: var(--color-brand-blue);
  text-decoration: none;
  word-break: break-all;
}

.result-link:hover {
  text-decoration: underline;
}

.install-btn {
  align-self: flex-start;
  background: var(--color-brand-coral);
  border-color: var(--color-brand-coral);
  color: var(--color-canvas);
  font-weight: var(--weight-medium);
  transition: all var(--transition-base);
}

.install-btn:hover {
  background: var(--color-brand-coral-dark);
  border-color: var(--color-brand-coral-dark);
}
</style>
