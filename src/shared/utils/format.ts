/**
 * 将 owner/name 格式的 ID 转换为 owner@name（package ref 格式）。
 */
export function toPackageRef(id: string): string {
  const lastSlash = id.lastIndexOf('/')
  return id.substring(0, lastSlash) + '@' + id.substring(lastSlash + 1)
}

/**
 * 格式化安装次数，超过 1000 显示为 K，超过 1000000 显示为 M。
 */
export function formatInstalls(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}
