import { useNotification } from 'naive-ui'

type NotifyType = 'success' | 'error' | 'warning' | 'info'

const DEFAULT_DURATION: Record<NotifyType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000
}

/**
 * 统一通知封装。基于 NaiveUI NNotificationProvider（已在 App.vue 中挂载）。
 * 仅用于操作结果反馈，确认对话框仍使用 useDialog()。
 */
export function useNotify(): {
  success: (title: string) => void
  error: (title: string) => void
  warning: (title: string) => void
  info: (title: string) => void
} {
  const notification = useNotification()

  function notify(type: NotifyType, title: string, duration?: number): void {
    notification[type]({
      title,
      duration: duration ?? DEFAULT_DURATION[type]
    })
  }

  return {
    success: (title: string) => notify('success', title),
    error: (title: string) => notify('error', title),
    warning: (title: string) => notify('warning', title),
    info: (title: string) => notify('info', title)
  }
}
