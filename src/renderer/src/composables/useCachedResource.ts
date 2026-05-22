import { ref, type Ref } from 'vue'

interface CacheState<T> {
  data: T
  timestamp: number
  stale: boolean
}

export function useCachedResource<T>(
  fetcher: () => Promise<T>,
  initialValue: T
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
      return cache.value.data
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
