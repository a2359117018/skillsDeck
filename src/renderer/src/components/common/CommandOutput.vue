<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ content: string }>()
const emit = defineEmits<{ (e: 'navigate', packageRef: string): void }>()

const SKILL_REF_RE = /([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+)/g

const segments = computed(() => {
  const parts: { type: 'text' | 'ref'; value: string }[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const re = new RegExp(SKILL_REF_RE.source, 'g')
  while ((match = re.exec(props.content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: props.content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'ref', value: match[1] })
    lastIndex = re.lastIndex
  }
  if (lastIndex < props.content.length) {
    parts.push({ type: 'text', value: props.content.slice(lastIndex) })
  }
  return parts
})
</script>

<template>
  <div class="terminal-output">
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.type === 'text'" class="text">{{ seg.value }}</span>
      <a v-else class="skill-ref" @click.prevent="emit('navigate', seg.value)">{{ seg.value }}</a>
    </template>
  </div>
</template>

<style scoped>
.terminal-output {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
  box-shadow: var(--shadow-1);
}
.skill-ref {
  color: var(--color-brand-blue);
  cursor: pointer;
  text-decoration: underline;
  transition: color var(--transition-fast);
}
.skill-ref:hover {
  color: var(--color-brand-blue-200);
}
</style>
