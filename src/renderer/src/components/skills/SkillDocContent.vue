<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  content: string
}>()

/** Markdown 正文渲染为 HTML */
const renderedMarkdown = computed(() => {
  try {
    return marked.parse(props.content, { async: false }) as string
  } catch {
    return `<pre>${props.content}</pre>`
  }
})
</script>

<template>
  <div class="skill-doc-content">
    <!-- Markdown 内容区 -->
    <div class="markdown-section">
      <!-- 内容来自本地 SKILL.md 文件，由 marked 渲染，XSS 风险可控 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="markdown-body" v-html="renderedMarkdown" />
    </div>
  </div>
</template>

<style scoped>
.skill-doc-content {
  display: flex;
  flex-direction: column;
}

/* Markdown 内容区 */
.markdown-body {
  color: var(--color-ink);
  font-size: var(--text-body-sm);
  line-height: var(--leading-normal);
}

/* Heading 层次 — 有区分的大小和间距 */
.markdown-body :deep(h1) {
  font-size: var(--text-body-lg);
  font-weight: var(--weight-bold);
  margin: var(--space-lg) 0 var(--space-sm);
  padding-bottom: var(--space-xs);
}

.markdown-body :deep(h2) {
  font-size: var(--text-body-md);
  font-weight: var(--weight-semibold);
  margin: var(--space-md) 0 var(--space-xs);
}

.markdown-body :deep(h3) {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-semibold);
  margin: var(--space-sm) 0 var(--space-xs);
  color: var(--color-stone);
}

.markdown-body :deep(p) {
  margin: var(--space-xs) 0;
}

/* 代码块 — 深色背景，形成视觉锚点 */
.markdown-body :deep(pre) {
  background: var(--color-terminal-bg);
  color: var(--color-terminal-text);
  padding: var(--space-sm);
  border-radius: var(--radius-md);
  overflow-x: auto;
  font-size: var(--text-body-sm);
  margin: var(--space-sm) 0;
  line-height: 1.6;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
  font-family: 'SF Mono', Consolas, Monaco, monospace;
}

/* 行内代码 — 轻量高亮 */
.markdown-body :deep(code) {
  background: var(--color-surface);
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  font-family: 'SF Mono', Consolas, Monaco, monospace;
  font-size: 0.9em;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: var(--space-lg);
  margin: var(--space-xs) 0;
}

.markdown-body :deep(li) {
  margin: var(--space-xs) 0;
}

.markdown-body :deep(li::marker) {
  color: var(--color-stone);
}

.markdown-body :deep(a) {
  color: var(--color-brand-blue);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(blockquote) {
  border-left: 1px solid var(--color-muted);
  margin: var(--space-sm) 0;
  padding: var(--space-xs) var(--space-sm);
  color: var(--color-stone);
  background: var(--color-surface);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-hairline);
  margin: var(--space-md) 0;
}

/* 表格 */
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body-sm);
  margin: var(--space-sm) 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--color-hairline);
  padding: var(--space-xs) var(--space-sm);
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--color-surface);
  font-weight: var(--weight-semibold);
  font-size: var(--text-body-sm);
}

.markdown-body :deep(td) {
  font-size: var(--text-body-sm);
}

/* 图片 */
.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: var(--radius-md);
  margin: var(--space-sm) 0;
}

/* 粗体和斜体 */
.markdown-body :deep(strong) {
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.markdown-body :deep(em) {
  font-style: italic;
  color: var(--color-stone);
}
</style>
