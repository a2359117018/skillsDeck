import { createWriteStream, existsSync, unlinkSync } from 'fs'

/**
 * 通用下载函数，支持进度回调和取消信号。
 *
 * 使用流式写入避免大文件内存缓冲，下载中断时会自动清理未完成的文件。
 *
 * @param url 下载地址
 * @param destPath 目标文件路径
 * @param options 可选配置：进度回调、取消信号、超时
 * @returns 下载完成的文件路径
 * @throws 下载失败、响应体缺失或取消时抛出错误
 */
export async function downloadWithProgress(
  url: string,
  destPath: string,
  options?: {
    onProgress?: (percent: number) => void
    signal?: AbortSignal
    timeout?: number
  }
): Promise<string> {
  const controller = new AbortController()
  const signal = options?.signal

  // 如果外部 signal 触发，联动取消内部 controller
  if (signal) {
    const onAbort = (): void => controller.abort()
    signal.addEventListener('abort', onAbort, { once: true })
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null
  if (options?.timeout && options.timeout > 0) {
    timeoutId = setTimeout(() => controller.abort(), options.timeout)
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: '*/*' }
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`)
    }

    const contentLength = Number(response.headers.get('content-length') || 0)
    let downloaded = 0

    const stream = createWriteStream(destPath)
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        const canContinue = stream.write(value)
        downloaded += value.length
        if (contentLength > 0) {
          options?.onProgress?.(Math.round((downloaded / contentLength) * 100))
        }
        if (!canContinue) {
          await new Promise<void>((resolve) => stream.once('drain', resolve))
        }
      }
    }

    stream.end()
    return destPath
  } catch (error) {
    if (existsSync(destPath)) {
      try {
        unlinkSync(destPath)
      } catch {
        // Ignore cleanup errors
      }
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('下载已取消或超时')
    }
    throw error
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
