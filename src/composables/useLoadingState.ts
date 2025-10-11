import { ref } from 'vue'

/**
 * Manages loading state with minimum duration to prevent flashing skeletons
 */
export function useLoadingState(minLoadingTime = 200) {
  const showSkeleton = ref(false)

  /**
   * Wraps an async function to ensure loading state is visible for minimum duration
   * @param fn - Async function to execute
   * @returns Result of the async function
   */
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
