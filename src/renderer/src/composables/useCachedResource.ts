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
  isStale: Ref<boolean>
  ensure: () => Promise<T>
  invalidate: () => void
  refresh: () => Promise<T>
} {
  const cache = ref<CacheState<T> | null>(null) as Ref<CacheState<T> | null>
  const data = ref<T>(initialValue) as Ref<T>
  const loading = ref(false)
  const isStale = ref(true)

  async function ensure(): Promise<T> {
    if (cache.value && !cache.value.stale) {
      console.log('[cache] HIT — returning cached data, size:', (cache.value.data as any).length)
      return cache.value.data
    }
    console.log('[cache] MISS — fetching fresh data')
    return refresh()
  }

  async function refresh(): Promise<T> {
    loading.value = true
    try {
      const result = await fetcher()
      data.value = result
      cache.value = { data: result, timestamp: Date.now(), stale: false }
      isStale.value = false
      return result
    } finally {
      loading.value = false
    }
  }

  function invalidate(): void {
    if (cache.value) {
      cache.value.stale = true
    }
    isStale.value = true
  }

  return { data, loading, isStale, ensure, invalidate, refresh }
}
