<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider,
  createDiscreteApi,
  type GlobalThemeOverrides
} from 'naive-ui'
import AppSidebar from './components/layout/AppSidebar.vue'
import TaskDrawer from './components/tasks/TaskDrawer.vue'
import { useEnvStore } from './stores/env'
import { useSkillsStore } from './stores/skills'
import { useClosePrompt } from './composables/useClosePrompt'

const { dialog } = createDiscreteApi(['dialog'])

const windowType = new URLSearchParams(window.location.search).get('window') || 'main'
const envStore = useEnvStore()
const skillsStore = useSkillsStore()
const router = useRouter()
const route = useRoute()

const isMainWindow = windowType === 'main'
const taskDrawerVisible = ref(false)

/**
 * Global keyboard shortcut handler.
 * - `/` or `Ctrl/Cmd + K` → focus search input on search page
 * - `Escape` → close modals/drawers (handled by NaiveUI, but we ensure router back if needed)
 */
function handleKeydown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
  const isInputFocused =
    tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable

  // Ctrl/Cmd + K or / (when not in input)
  if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !isInputFocused)) {
    e.preventDefault()
    if (route.name !== 'search') {
      router.push({ name: 'search' })
    }
    skillsStore.triggerFocusSearch()
    return
  }
}

if (isMainWindow) {
  useClosePrompt()
}

/** Check environment and prompt install if missing. Recurses after each install. */
async function promptEnvInstall(): Promise<void> {
  await envStore.check()
  const s = envStore.status
  if (!s) return

  if (!s.nodeInstalled) {
    dialog.warning({
      title: '缺少运行环境',
      content: '未检测到 Node.js，需要安装后才能使用技能管理功能。',
      positiveText: '安装 Node.js',
      negativeText: '稍后',
      onPositiveClick: async () => {
        try {
          const result = await window.api.env.installNode()
          if (!result.success) throw new Error(result.error)
          await promptEnvInstall()
        } catch (e) {
          dialog.error({
            title: '安装失败',
            content: e instanceof Error ? e.message : 'Node.js 安装失败，请稍后重试',
            positiveText: '知道了'
          })
        }
      }
    })
    return
  }

  if (!s.skillsInstalled) {
    dialog.info({
      title: '缺少技能管理工具',
      content: '未检测到 skills CLI，需要安装后才能管理技能。',
      positiveText: '安装 skills CLI',
      negativeText: '稍后',
      onPositiveClick: async () => {
        try {
          const result = await window.api.env.installSkills()
          if (!result.success) throw new Error(result.error || '安装失败')
          await promptEnvInstall()
        } catch (e) {
          dialog.error({
            title: '安装失败',
            content: e instanceof Error ? e.message : 'skills CLI 安装失败，请稍后重试',
            positiveText: '知道了'
          })
        }
      }
    })
    return
  }
}

onMounted(() => {
  if (isMainWindow) {
    promptEnvInstall()
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function openTaskDrawer(): void {
  taskDrawerVisible.value = true
}

/**
 * NaiveUI GlobalThemeOverrides — requires JS string literals, not CSS var().
 * Values mirror the design token system in tokens.css.
 * See DESIGN.md "NaiveUI 主题覆盖" section for maintenance rules.
 */
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0a0a0a',
    primaryColorHover: '#2a2a2a',
    primaryColorPressed: '#0a0a0a',
    primaryColorSuppl: '#2a2a2a',
    fontFamily: "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif",
    borderRadius: '8px',
    borderRadiusSmall: '8px',
    /* Semantic colors — align with tokens.css brand/semantic tokens */
    infoColor: '#1456f0',
    infoColorHover: '#3b6ff5',
    infoColorPressed: '#1456f0',
    infoColorSuppl: '#3b6ff5',
    successColor: '#166534',
    successColorHover: '#1e8044',
    successColorPressed: '#166534',
    successColorSuppl: '#1e8044',
    warningColor: '#f0a020',
    warningColorHover: '#f5b040',
    warningColorPressed: '#f0a020',
    warningColorSuppl: '#f5b040',
    errorColor: '#d45656',
    errorColorHover: '#e06666',
    errorColorPressed: '#d45656',
    errorColorSuppl: '#e06666'
  },
  Button: {
    borderRadius: '9999px',
    fontWeight: '500',
    /* quaternary 按钮 hover 仅颜色变化，不添加背景 */
    colorQuaternaryHover: 'transparent',
    colorQuaternaryPressed: 'transparent'
  },
  Tag: {
    borderRadius: '9999px',
    /* Default chip style */
    color: '#f7f8fa',
    textColor: '#6b7280',
    border: '1px solid #e5e7eb',
    /* Info type — Steel Blue tinted */
    colorInfo: '#dbeafe',
    textColorInfo: '#1e40af',
    borderInfo: '1px solid #dbeafe',
    /* Success type */
    colorSuccess: '#dcfce7',
    textColorSuccess: '#166534',
    borderSuccess: '1px solid #dcfce7',
    /* Warning type */
    colorWarning: '#fffbeb',
    textColorWarning: '#92400e',
    borderWarning: '1px solid rgba(240, 160, 32, 0.35)',
    /* Error type */
    colorError: '#fef2f2',
    textColorError: '#d45656',
    borderError: '1px solid #fef2f2'
  },
  Input: {
    borderRadius: '8px',
    height: '40px',
    border: '1px solid #e5e7eb',
    borderHover: '1px solid #d1d5db',
    borderFocus: '1px solid #0a0a0a',
    color: '#ffffff',
    colorFocus: '#ffffff',
    textColor: '#1a1a1a',
    placeholderColor: '#9ca3af',
    caretColor: '#0a0a0a'
  },
  Card: {
    borderRadius: '16px',
    boxShadow: 'none',
    borderColor: '#e5e7eb',
    color: '#ffffff'
  },
  Modal: {
    borderRadius: '20px'
  },
  Dialog: {
    borderRadius: '16px'
  },
  InternalSelectMenu: {
    borderRadius: '8px'
  },
  Tabs: {
    barColor: '#0a0a0a',
    tabTextColorLine: '#6b7280',
    tabTextColorActiveLine: '#0a0a0a',
    tabTextColorHoverLine: '#1a1a1a'
  },
  Checkbox: {
    colorChecked: '#0a0a0a',
    borderChecked: '#0a0a0a',
    checkMarkColor: '#ffffff'
  },
  Switch: {
    railColorActive: '#0a0a0a',
    buttonColor: '#ffffff'
  },
  Progress: {
    fillColor: '#1456f0',
    railColor: '#e5e7eb'
  },
  Alert: {
    /* Warning type */
    colorWarning: '#fffbeb',
    borderWarning: '1px solid rgba(240, 160, 32, 0.35)',
    titleTextColorWarning: '#1a1a1a',
    contentTextColorWarning: '#6b7280',
    iconColorWarning: '#f0a020',
    /* Info type */
    colorInfo: '#eff6ff',
    borderInfo: '1px solid #dbeafe',
    titleTextColorInfo: '#1a1a1a',
    contentTextColorInfo: '#6b7280',
    iconColorInfo: '#1456f0',
    /* Success type */
    colorSuccess: '#dcfce7',
    borderSuccess: '1px solid #dcfce7',
    titleTextColorSuccess: '#1a1a1a',
    contentTextColorSuccess: '#6b7280',
    iconColorSuccess: '#166534',
    /* Error type */
    colorError: '#fef2f2',
    borderError: '1px solid #fef2f2',
    titleTextColorError: '#1a1a1a',
    contentTextColorError: '#6b7280',
    iconColorError: '#d45656'
  },
  Steps: {
    indicatorColorProcess: '#0a0a0a',
    indicatorBorderColorProcess: '#0a0a0a',
    indicatorTextColorProcess: '#ffffff',
    indicatorColorFinish: '#166534',
    indicatorBorderColorFinish: '#166534',
    indicatorTextColorFinish: '#ffffff',
    indicatorColorWait: '#ffffff',
    indicatorBorderColorWait: '#e5e7eb',
    indicatorTextColorWait: '#6b7280',
    headerTextColorProcess: '#0a0a0a',
    headerTextColorFinish: '#1a1a1a',
    headerTextColorWait: '#6b7280',
    splitorColorWait: '#e5e7eb',
    splitorColorFinish: '#166534',
    splitorColorProcess: '#e5e7eb'
  },
  Select: {
    peers: {
      InternalSelection: {
        border: '1px solid #e5e7eb',
        borderHover: '1px solid #d1d5db',
        borderActive: '1px solid #0a0a0a',
        borderFocus: '1px solid #0a0a0a',
        color: '#ffffff',
        colorActive: '#ffffff',
        caretColor: '#0a0a0a',
        textColor: '#1a1a1a',
        placeholderColor: '#9ca3af'
      },
      InternalSelectMenu: {
        optionColorActive: '#f7f8fa',
        optionColorActivePending: '#f7f8fa',
        optionTextColor: '#1a1a1a',
        optionTextColorActive: '#0a0a0a',
        optionCheckColor: '#0a0a0a'
      }
    }
  },
  Typography: {
    textColorSuccess: '#166534',
    textColorError: '#d45656',
    textColorWarning: '#f0a020',
    textColorInfo: '#1e40af'
  }
}
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NDialogProvider>
      <NNotificationProvider placement="top-right" :max="5">
        <NMessageProvider>
          <div v-if="windowType === 'main'" class="app-shell">
            <a href="#main-content" class="skip-link">跳转到主内容</a>
            <AppSidebar @open-tasks="openTaskDrawer" />
            <main id="main-content" class="content-area">
              <div class="page-wrapper">
                <router-view v-slot="{ Component }">
                  <Transition name="fade">
                    <component :is="Component" />
                  </Transition>
                </router-view>
              </div>
            </main>
            <TaskDrawer v-model:show="taskDrawerVisible" />
          </div>
          <router-view v-else />
        </NMessageProvider>
      </NNotificationProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>

<style scoped>
.app-shell {
  height: 100vh;
  display: flex;
  position: relative;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background-color: var(--color-canvas);
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  z-index: 10000;
  background: var(--color-canvas);
  color: var(--color-ink);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  text-decoration: none;
  box-shadow: var(--shadow-3);
}

.skip-link:focus {
  left: var(--space-md);
  top: var(--space-md);
}

.page-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
