import { onUnmounted, getCurrentInstance } from 'vue'

/**
 * 创建一个 debounce 包装函数。
 *
 * @param fn - 需要延迟执行的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 包含 `run`（触发执行）和 `cancel`（取消计时器）的对象
 */
export function useDebounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number
): { run: (...args: TArgs) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null

  const cancel = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const run = (...args: TArgs): void => {
    cancel()
    timer = setTimeout(() => fn(...args), delay)
  }

  if (getCurrentInstance()) {
    onUnmounted(cancel)
  }

  return { run, cancel }
}
