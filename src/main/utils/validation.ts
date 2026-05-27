/**
 * Validate skills install source parameter.
 * Expected format: owner/repo or owner/repo/subpath (GitHub shorthand).
 *
 * @param source - The raw install source to validate
 * @returns The trimmed, validated source string
 * @throws Error if the source is invalid
 */
export function validateInstallSource(source: unknown): string {
  if (typeof source !== 'string' || source.trim() === '') {
    throw new Error('安装来源不能为空')
  }
  const trimmed = source.trim()
  if (trimmed.length > 200) {
    throw new Error('安装来源过长')
  }
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)*$/.test(trimmed)) {
    throw new Error('安装来源格式无效，应为 owner/repo 格式')
  }
  return trimmed
}
