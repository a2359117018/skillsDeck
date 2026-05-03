<script setup lang="ts">
import { NCard, NButton, NText, NSpace, NTag } from 'naive-ui'
import type { SkillSearchResult } from '../../../../shared/types'
import { toPackageRef, formatInstalls } from '../../../../shared/types'

const props = defineProps<{ result: SkillSearchResult }>()
const emit = defineEmits<{ (e: 'install', packageRef: string): void }>()

const packageRef = toPackageRef(props.result.id)
const detailUrl = `https://skills.sh/${props.result.id}`
</script>

<template>
  <NCard size="small" hoverable style="margin-bottom: 12px">
    <NSpace justify="space-between" align="center">
      <NSpace vertical :size="4">
        <NSpace align="center" :size="8">
          <NText strong style="font-size: 15px">{{ result.name }}</NText>
          <NTag :bordered="false" type="info" size="small">
            {{ formatInstalls(result.installs) }} 次下载
          </NTag>
        </NSpace>
        <NText depth="3" code style="font-size: 12px">{{ packageRef }}</NText>
        <a :href="detailUrl" target="_blank" style="font-size: 12px; color: #4fc3f7">
          {{ detailUrl }}
        </a>
      </NSpace>
      <NButton type="primary" size="small" @click="emit('install', packageRef)"> 安装 </NButton>
    </NSpace>
  </NCard>
</template>
