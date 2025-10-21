import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAvailableViewModes } from '@/core/atlases/registry'
import { useConfigStore } from '@/stores/config'

/**
 * Manages view mode configuration and provides view mode options
 */
export function useViewMode() {
  const { t } = useI18n()
  const configStore = useConfigStore()

  /**
   * Get available view modes for current atlas
   */
  const viewModeOptions = computed(() => {
    const atlasConfig = configStore.currentAtlasConfig
    if (!atlasConfig)
      return []

    const supportedModes = getAvailableViewModes(atlasConfig.id)

    // All possible view mode options
    const allOptions = [
      { value: 'composite-custom', label: t('mode.compositeCustom'), translated: true },
      { value: 'split', label: t('mode.split'), translated: true },
      { value: 'built-in-composite', label: t('mode.compositeExisting'), translated: true },
      { value: 'unified', label: t('mode.unified'), translated: true },
    ]

    // Filter to only supported modes for this region
    return allOptions.filter(option => supportedModes.includes(option.value as any))
  })

  return {
    viewModeOptions,
  }
}
