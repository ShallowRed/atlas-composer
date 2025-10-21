import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'

/**
 * Composable for centralized atlas configuration access
 *
 * Provides consistent access to current atlas config and related computed properties
 * across all components and composables.
 *
 * @returns Atlas configuration state and helpers
 *
 * @example
 * ```ts
 * const { currentAtlasConfig, atlasService, isAtlasLoaded } = useAtlasConfig()
 *
 * if (isAtlasLoaded.value) {
 *   console.log(currentAtlasConfig.value.id)
 * }
 * ```
 */
export function useAtlasConfig() {
  const configStore = useConfigStore()

  /**
   * Current atlas configuration (reactive)
   * Returns null if atlas hasn't loaded yet
   */
  const currentAtlasConfig = computed(() => configStore.currentAtlasConfig)

  /**
   * Atlas service instance for current atlas
   * Provides methods for accessing atlas-specific data
   */
  const atlasService = computed(() => configStore.atlasService)

  /**
   * Check if atlas has finished loading
   */
  const isAtlasLoaded = computed(() => currentAtlasConfig.value !== null)

  /**
   * Get atlas ID (fallback to empty string if not loaded)
   */
  const atlasId = computed(() => currentAtlasConfig.value?.id ?? '')

  return {
    currentAtlasConfig,
    atlasService,
    isAtlasLoaded,
    atlasId,
  }
}
