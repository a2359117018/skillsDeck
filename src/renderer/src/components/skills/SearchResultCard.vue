<script setup lang="ts">
import { NButton, NIcon, NText } from 'naive-ui'
import DownloadOutline from '@vicons/ionicons5/DownloadOutline'
import type { SkillSearchResult } from '../../../../shared/types'
import { toPackageRef, formatInstalls } from '../../../../shared/utils/format'

const props = defineProps<{ result: SkillSearchResult }>()
const emit = defineEmits<{ install: [source: string] }>()

const packageRef = toPackageRef(props.result.id)
const detailUrl = `https://skills.sh/${props.result.id}`
</script>

<template>
  <div class="result-card">
    <div class="result-card-header">
      <NText strong class="result-name">{{ result.name }}</NText>
      <div class="result-card-actions">
        <div class="install-badge">{{ formatInstalls(result.installs) }} 次安装</div>
        <NButton size="small" round @click="emit('install', result.source)">
          <template #icon>
            <NIcon :size="16"><DownloadOutline /></NIcon>
          </template>
          安装
        </NButton>
      </div>
    </div>
    <div class="result-card-body">
      <NText depth="3" code class="package-ref">{{ packageRef }}</NText>
    </div>
    <div class="result-card-footer">
      <a :href="detailUrl" target="_blank" class="result-link">查看详情 ↗</a>
    </div>
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
  gap: var(--space-sm);
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base);
}

.result-card:hover {
  border-color: var(--color-hairline-hover);
}

.result-card-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.result-name {
  font-size: var(--text-body-md);
  color: var(--color-ink);
  font-weight: var(--weight-semibold);
}

.result-card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
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

.result-card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxs);
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

.result-card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
}

.result-link:hover {
  text-decoration: underline;
}
</style>
