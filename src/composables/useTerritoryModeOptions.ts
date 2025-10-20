import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'
import { getAtlasSpecificConfig, isAtlasLoaded } from '@/core/atlases/registry'
import { useConfigStore } from '@/stores/config'

interface TerritoryModeOption {
  value: string
  label: string
  translated: boolean
}

/**
 * Composable to provide reactive territory mode options
 * Labels update automatically when locale changes
 */
export function useTerritoryModeOptions() {
  const configStore = useConfigStore()
  const { locale } = useI18n()

  const options = computed<TerritoryModeOption[]>(() => {
    const atlasId = configStore.selectedAtlas

    // Wait for atlas to load before accessing config
    // Check both currentAtlasConfig (from useAtlasLoader) and cache state
    if (!configStore.currentAtlasConfig || !isAtlasLoaded(atlasId)) {
      return []
    }

    const atlasSpecificConfig = getAtlasSpecificConfig(atlasId)

    if (!atlasSpecificConfig.rawModeLabels) {
      return []
    }

    const rawLabels = atlasSpecificConfig.rawModeLabels

    return Object.keys(atlasSpecificConfig.territoryModes).map((modeId: string) => ({
      value: modeId,
      label: resolveI18nValue(rawLabels[modeId]!, locale.value),
      translated: true, // Labels are already resolved, don't translate again
    }))
  })

  return {
    options,
  }
}
