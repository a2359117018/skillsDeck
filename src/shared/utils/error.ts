import type { IpcError } from '../types'

/**
 * 将任意错误转换为 IpcError 格式。
 */
export function toIpcError(e: unknown): IpcError {
  if (e instanceof Error && 'code' in e) {
    const cmdErr = e as { code: string; message: string }
    return { message: cmdErr.message, code: cmdErr.code }
  }
  return { message: e instanceof Error ? e.message : String(e) }
}
