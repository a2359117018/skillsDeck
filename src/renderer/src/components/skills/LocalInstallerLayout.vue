<script setup lang="ts">
import { NButton } from 'naive-ui'

interface Props {
  /** 扫描到的技能总数，用于 step 1 计数显示 */
  skillCount: number
  /** 当前选中的技能数，用于 step 1 计数与 action bar 计数 */
  selectedCount: number
  /** 安装按钮的 loading 状态 */
  installing: boolean
  /** 安装按钮是否可用 */
  canInstall: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'install'): void
}>()
</script>

<template>
  <div class="local-installer-layout">
    <div class="installer-columns">
      <!-- 左栏：输入 + 技能选择 -->
      <div class="column-left">
        <div class="input-card">
          <slot name="input" />
        </div>

        <div class="step-header">
          <span class="step-number">1</span>
          <h3 class="step-title">选择技能</h3>
          <span v-if="skillCount > 0" class="step-count">
            {{ selectedCount }} / {{ skillCount }}
          </span>
        </div>

        <div class="skill-list-area">
          <slot name="skill-list" />
        </div>
      </div>

      <!-- 右栏：Agent 选择 + 安装操作 -->
      <div class="column-right">
        <div class="step-header">
          <span class="step-number">2</span>
          <h3 class="step-title">选择安装目标</h3>
        </div>

        <div class="agent-area">
          <slot name="agent-selector" />
        </div>

        <div class="action-bar">
          <span class="action-bar-count">
            已选 <span class="action-bar-num">{{ selectedCount }}</span> 个技能
          </span>
          <NButton
            type="primary"
            size="small"
            :disabled="!canInstall || installing"
            :loading="installing"
            round
            @click="emit('install')"
          >
            安装
          </NButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.local-installer-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.installer-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  grid-template-rows: minmax(0, 1fr);
  gap: var(--space-lg);
  flex: 1;
  min-height: 0;
}

/* --- 左栏 --- */
.column-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 0;
  padding-bottom: var(--space-lg);
}

/* --- 输入卡片 --- */
.input-card {
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  flex-shrink: 0;
  min-height: 120px;
}

/* --- Step 标题 --- */
.step-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.step-number {
  background: var(--color-brand-blue);
  color: var(--color-canvas);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-micro);
  font-weight: var(--weight-semibold);
}

.step-title {
  font-size: var(--text-body-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.step-count {
  font-size: var(--text-micro);
  color: var(--color-muted);
}

/* --- 技能列表区域 --- */
.skill-list-area {
  flex: 1;
  min-height: 0;
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  background: var(--color-canvas);
}

/* --- 右栏 --- */
.column-right {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 0;
  padding-bottom: var(--space-lg);
}

.agent-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* --- 操作栏 --- */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.action-bar-count {
  font-size: var(--text-micro);
  color: var(--color-muted);
}

.action-bar-num {
  color: var(--color-ink);
  font-weight: var(--weight-semibold);
}

/* --- 内联进度 --- */
.inline-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxs);
}

.inline-progress-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.inline-progress-hint {
  font-size: var(--text-micro);
}
</style>
