import type { MaybeRefOrGetter } from 'vue'
import type { LoadedAtlasConfig } from '@/core/atlases/loader'
import type { AtlasId } from '@/types'
import { useAsyncState } from '@vueuse/core'
import { computed, toValue, watch } from 'vue'
import { loadAtlasAsync } from '@/core/atlases/registry'
import { logger } from '@/utils/logger'

const debug = logger.atlas.loader

export interface UseAtlasLoaderOptions {
  immediate?: boolean
  onSuccess?: (config: LoadedAtlasConfig) => void
  onError?: (error: Error) => void
}

export function useAtlasLoader(
  atlasId: MaybeRefOrGetter<string>,
  options: UseAtlasLoaderOptions = {},
) {
  const {
    immediate = true,
    onSuccess,
    onError,
  } = options

  const {
    state: config,
    isReady,
    isLoading,
    error,
    execute,
  } = useAsyncState(
    async () => {
      const id = toValue(atlasId)
      return await loadAtlasAsync(id as AtlasId)
    },
    null,
    {
      immediate,
      resetOnExecute: false,
      onSuccess: (loadedConfig) => {
        if (loadedConfig) {
          onSuccess?.(loadedConfig)
        }
      },
      onError: (err) => {
        debug('Failed to load atlas: %o', err)
        onError?.(err as Error)
      },
    },
  )

  watch(
    () => toValue(atlasId),
    async (newId, oldId) => {
      if (newId !== oldId) {
        debug('Atlas changed from %s to %s, loading...', oldId, newId)
        await execute()
      }
    },
  )

  const atlasConfig = computed(() => config.value?.atlasConfig)
  const atlasSpecificConfig = computed(() => config.value?.atlasSpecificConfig)
  const territories = computed(() => config.value?.territories)

  return {
    config,

    atlasConfig,
    atlasSpecificConfig,
    territories,

    isReady,
    isLoading,
    error,

    execute,
    reload: execute,
  }
}
