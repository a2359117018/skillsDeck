<script setup lang="ts">
import { NButton, NIcon, NText, NSpace, NTag } from 'naive-ui'
import { DownloadOutline } from '@vicons/ionicons5'
import type { SkillSearchResult } from '../../../../shared/types'
import { toPackageRef, formatInstalls } from '../../../../shared/types'

const props = defineProps<{ result: SkillSearchResult }>()
const emit = defineEmits<{ install: [packageRef: string] }>()

const packageRef = toPackageRef(props.result.id)
const detailUrl = `https://skills.sh/${props.result.id}`
</script>

<template>
  <div class="card-base result-card">
    <div
      class="card-base-accent"
      style="--card-accent: linear-gradient(180deg, #2080f0, #18a058)"
    />
    <div class="card-base-body">
      <div class="result-card-main">
        <div class="result-card-info">
          <NSpace align="center" :size="8">
            <NText strong class="card-base-text result-name">{{ result.name }}</NText>
            <NTag :bordered="false" type="info" size="small" round>
              {{ formatInstalls(result.installs) }} 次下载
            </NTag>
          </NSpace>
          <NText depth="3" code style="font-size: 12px">{{ packageRef }}</NText>
          <a :href="detailUrl" target="_blank" class="result-link">{{ detailUrl }}</a>
        </div>
        <NButton type="primary" size="small" round @click="emit('install', packageRef)">
          <template #icon>
            <NIcon :size="16"><DownloadOutline /></NIcon>
          </template>
          安装
        </NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-card {
  margin-bottom: 12px;
}

.result-card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.result-card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.result-name {
  font-size: 15px;
}

.result-link {
  font-size: 12px;
  color: #4fc3f7;
  text-decoration: none;
}

.result-link:hover {
  text-decoration: underline;
}
</style>
