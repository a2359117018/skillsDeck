import { onMounted, onUnmounted } from 'vue'
import { createDiscreteApi } from 'naive-ui'

const { dialog } = createDiscreteApi(['dialog'])

/**
 * Listens for `close:prompt` IPC from main process and shows a dialog
 * asking the user to minimize to tray or quit. Uses createDiscreteApi
 * because this composable runs in App.vue which owns NDialogProvider.
 */
export function useClosePrompt(): void {
  let cleanup: (() => void) | null = null

  onMounted(() => {
    cleanup = window.api.close.onPrompt(() => {
      dialog.warning({
        title: '关闭 SkillDeck',
        content: '你希望应用如何？',
        positiveText: '最小化到托盘',
        negativeText: '退出应用',
        onPositiveClick: () => {
          window.api.close.action({ action: 'tray', remember: true })
        },
        onNegativeClick: () => {
          window.api.close.action({ action: 'quit', remember: true })
        },
        onClose: () => {
          window.api.close.action({ action: 'tray', remember: true })
        },
        onMaskClick: () => {
          window.api.close.action({ action: 'tray', remember: true })
        }
      })
    })
  })

  onUnmounted(() => {
    cleanup?.()
  })
}
