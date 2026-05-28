import { ref, type Ref } from 'vue'

interface CacheState<T> {
  data: T
  timestamp: number
  stale: boolean
}

/**
 * useCachedResource 的配置选项。
 */
export interface UseCachedResourceOptions {
  /** 缓存有效期（毫秒），未指定时缓存永不过期 */
  ttl?: number
}

/**
 * 带缓存的数据获取 composable。
 *
 * 封装 stale-while-revalidate 缓存语义：首次调用 ensure() 会触发数据获取，
 * 后续调用在缓存有效时直接返回缓存数据。可通过 invalidate() 手动使缓存失效，
 * 或通过 ttl 选项设置自动过期时间。
 *
 * @param fetcher - 数据获取函数
 * @param initialValue - 初始值，在首次获取完成前使用
 * @param options - 可选配置
 * @returns 缓存状态、加载状态及操作方法
 */
export function useCachedResource<T>(
  fetcher: () => Promise<T>,
  initialValue: T,
  options?: UseCachedResourceOptions
): {
  data: Ref<T>
  loading: Ref<boolean>
  refreshing: Ref<boolean>
  isStale: Ref<boolean>
  error: Ref<Error | null>
  ensure: () => Promise<T>
  invalidate: () => void
  refresh: () => Promise<T>
} {
  const cache = ref<CacheState<T> | null>(null) as Ref<CacheState<T> | null>
  const data = ref<T>(initialValue) as Ref<T>
  const loading = ref(false)
  const refreshing = ref(false)
  const isStale = ref(true)
  const error = ref<Error | null>(null)

  async function ensure(): Promise<T> {
    if (cache.value && !cache.value.stale) {
      const isExpired =
        options?.ttl !== undefined && Date.now() - cache.value.timestamp > options.ttl
      if (!isExpired) {
        return cache.value.data
      }
      /** TTL 过期，标记缓存为失效状态后再刷新 */
      invalidate()
    }
    if (refreshing.value) {
      return data.value
    }
    return refresh()
  }

  async function refresh(): Promise<T> {
    if (refreshing.value) {
      return data.value
    }
    const hasData = cache.value !== null
    refreshing.value = true
    if (!hasData) {
      loading.value = true
    }
    try {
      const result = await fetcher()
      data.value = result
      cache.value = { data: result, timestamp: Date.now(), stale: false }
      isStale.value = false
      error.value = null
      return result
    } catch (err) {
      console.error('Failed to refresh cached resource:', err)
      /** 刷新失败时使缓存失效，确保下次调用 ensure() 会重试 */
      invalidate()
      error.value = err instanceof Error ? err : new Error(String(err))
      throw err
    } finally {
      refreshing.value = false
      loading.value = false
    }
  }

  function invalidate(): void {
    if (cache.value) {
      cache.value.stale = true
    }
    isStale.value = true
  }

  return { data, loading, refreshing, isStale, error, ensure, invalidate, refresh }
}
