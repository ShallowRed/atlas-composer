/**
 * Composable for loading atlas configurations asynchronously
 * Uses VueUse's useAsyncState for reactive loading state management
 */

import type { MaybeRefOrGetter } from 'vue'
import type { LoadedAtlasConfig } from '@/core/atlases/loader'
import { useAsyncState } from '@vueuse/core'
import { computed, toValue, watch } from 'vue'
import { isAtlasLoaded, loadAtlasAsync } from '@/core/atlases/registry'

export interface UseAtlasLoaderOptions {
  /**
   * Load the atlas immediately on mount
   * @default true
   */
  immediate?: boolean

  /**
   * Callback when atlas loads successfully
   */
  onSuccess?: (config: LoadedAtlasConfig) => void

  /**
   * Callback when atlas loading fails
   */
  onError?: (error: Error) => void
}

/**
 * Composable for loading atlas configurations with reactive state
 *
 * @param atlasId - The ID of the atlas to load (can be a ref)
 * @param options - Loading options
 * @returns Reactive loading state and controls
 *
 * @example
 * ```ts
 * const { config, isLoading, error, execute } = useAtlasLoader('france')
 *
 * // Or with a ref
 * const atlasId = ref('france')
 * const { config, isLoading } = useAtlasLoader(atlasId)
 *
 * // Change atlas
 * atlasId.value = 'portugal' // Automatically loads new atlas
 * ```
 */
export function useAtlasLoader(
  atlasId: MaybeRefOrGetter<string>,
  options: UseAtlasLoaderOptions = {},
) {
  const {
    immediate = true,
    onSuccess,
    onError,
  } = options

  // Create async state for atlas loading
  const {
    state: config,
    isReady,
    isLoading,
    error,
    execute,
  } = useAsyncState(
    async () => {
      const id = toValue(atlasId)

      // Check if already loaded
      if (isAtlasLoaded(id)) {
        console.debug(`[useAtlasLoader] Atlas '${id}' already loaded from cache`)
      }

      return await loadAtlasAsync(id)
    },
    null,
    {
      immediate,
      resetOnExecute: false, // Keep previous config while loading new one
      onSuccess: (loadedConfig) => {
        if (loadedConfig) {
          console.info(`[useAtlasLoader] Successfully loaded atlas '${loadedConfig.atlasConfig.id}'`)
          onSuccess?.(loadedConfig)
        }
      },
      onError: (err) => {
        console.error('[useAtlasLoader] Failed to load atlas:', err)
        onError?.(err as Error)
      },
    },
  )

  // Watch atlas ID changes and reload
  watch(
    () => toValue(atlasId),
    async (newId, oldId) => {
      if (newId !== oldId) {
        console.info(`[useAtlasLoader] Atlas changed from '${oldId}' to '${newId}', loading...`)
        await execute()
      }
    },
  )

  // Computed properties for convenience
  const atlasConfig = computed(() => config.value?.atlasConfig)
  const atlasSpecificConfig = computed(() => config.value?.atlasSpecificConfig)
  const territories = computed(() => config.value?.territories)

  return {
    // Full loaded config
    config,

    // Extracted properties for convenience
    atlasConfig,
    atlasSpecificConfig,
    territories,

    // Loading state
    isReady,
    isLoading,
    error,

    // Manual control
    execute,
    reload: execute,
  }
}
