import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 网络状态检测 composable。
 * 使用 navigator.onLine 作为初始值，通过 IPC 监听 main 进程的定期检查更新状态。
 */
export function useNetworkStatus() {
  const isOnline = ref(navigator.onLine)

  let unsubscribe: (() => void) | undefined

  onMounted(() => {
    unsubscribe = window.api.network.onStatusChange((online: boolean) => {
      isOnline.value = online
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return { isOnline }
}
