import type { AtlasId } from '@/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAvailableViewModes } from '@/core/atlases/registry'
import { useAtlasStore } from '@/stores/atlas'
import { getViewModeLabelKey, VIEW_MODES } from '@/utils/view-modes'

export function useViewMode() {
  const { t } = useI18n()
  const atlasStore = useAtlasStore()

  const viewModeOptions = computed(() => {
    const atlasConfig = atlasStore.currentAtlasConfig
    if (!atlasConfig)
      return []

    const supportedModes = getAvailableViewModes(atlasConfig.id as AtlasId)

    return VIEW_MODES
      .filter(mode => supportedModes.includes(mode))
      .map(mode => ({ value: mode, label: t(getViewModeLabelKey(mode)), translated: true }))
  })

  return {
    viewModeOptions,
  }
}
