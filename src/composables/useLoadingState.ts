import { ref } from 'vue'

export function useLoadingState(minLoadingTime = 200) {
  const showSkeleton = ref(false)

  async function withMinLoadingTime<T>(fn: () => Promise<T>): Promise<T> {
    showSkeleton.value = true
    const start = Date.now()
    try {
      const result = await fn()
      const elapsed = Date.now() - start
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed))
      }
      return result
    }
    finally {
      showSkeleton.value = false
    }
  }

  return {
    showSkeleton,
    withMinLoadingTime,
  }
}
