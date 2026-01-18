import type { AtlasId } from '@/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAvailableViewModes } from '@/core/atlases/registry'
import { useAtlasStore } from '@/stores/atlas'

export function useViewMode() {
  const { t } = useI18n()
  const atlasStore = useAtlasStore()

  const viewModeOptions = computed(() => {
    const atlasConfig = atlasStore.currentAtlasConfig
    if (!atlasConfig)
      return []

    const supportedModes = getAvailableViewModes(atlasConfig.id as AtlasId)

    const allOptions = [
      { value: 'composite-custom', label: t('mode.compositeCustom'), translated: true },
      { value: 'split', label: t('mode.split'), translated: true },
      { value: 'built-in-composite', label: t('mode.compositeExisting'), translated: true },
      { value: 'unified', label: t('mode.unified'), translated: true },
    ]

    return allOptions.filter(option => supportedModes.includes(option.value as any))
  })

  return {
    viewModeOptions,
  }
}
