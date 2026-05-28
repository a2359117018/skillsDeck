import path from 'path'
import os from 'os'

/**
 * 将路径中的 `~` 扩展为用户主目录绝对路径。
 *
 * - `~` → os.homedir()
 * - `~/path` 或 `~\path` → path.join(homedir, path)
 * - 其他路径 → path.resolve(p)
 */
export function expandTildePath(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(os.homedir(), p.slice(2))
  }
  return path.resolve(p)
}
