import { ref, h, onUnmounted } from 'vue'
import { createDiscreteApi, NCheckbox } from 'naive-ui'

const { dialog } = createDiscreteApi(['dialog'])

/**
 * Listens for `close:prompt` IPC from main process and shows a dialog
 * asking the user to minimize to tray or quit. Uses createDiscreteApi
 * because this composable runs in App.vue which owns NDialogProvider.
 */
export function useClosePrompt(): void {
  const rememberChoice = ref(false)

  const cleanup = window.api.close.onPrompt(() => {
    rememberChoice.value = false
    dialog.create({
      title: '关闭 SkillDeck',
      content: () =>
        h('div', { style: 'display: flex; flex-direction: column; gap: 12px' }, [
          h('span', null, '你希望应用如何？'),
          h(NCheckbox, {
            checked: rememberChoice.value,
            'onUpdate:checked': (val: boolean) => {
              rememberChoice.value = val
            }
          }, { default: () => '记住选择' })
        ]),
      positiveText: '最小化到托盘',
      negativeText: '退出应用',
      onPositiveClick: () => {
        window.api.close.action({ action: 'tray', remember: rememberChoice.value })
      },
      onNegativeClick: () => {
        window.api.close.action({ action: 'quit', remember: rememberChoice.value })
      }
    })
  })

  onUnmounted(() => {
    cleanup()
  })
}
