import { onMounted, onUnmounted } from 'vue'
import { useDialog } from 'naive-ui'

/**
 * Listens for `close:prompt` IPC from main process and shows a dialog
 * asking the user to minimize to tray or quit. The dialog always assumes
 * "remember my choice" is true — since the user can change this later in Settings.
 */
export function useClosePrompt(): void {
  const dialog = useDialog()
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
        }
      })
    })
  })

  onUnmounted(() => {
    cleanup?.()
  })
}
