import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAtlasGroups } from '@/composables/useAtlasGroups'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { getAtlasPresets, getAvailableViewModes } from '@/core/atlases/registry'
import { getViewModeIcon, getViewModeLabelKey, VIEW_MODES } from '@/utils/view-modes'

export function useAtlasList() {
  const { t } = useI18n()
  const { localize } = useLocalizedName()
  const { atlasGroups } = useAtlasGroups()

  const atlasList = computed(() => atlasGroups.value.map(group => ({
    ...group,
    options: group.options.map((atlas) => {
      const presets = getAtlasPresets(atlas.value)
      const availableModes = getAvailableViewModes(atlas.value)
      const views = VIEW_MODES
        .filter(mode => availableModes.includes(mode))
        .map(mode => ({
          mode,
          label: t(getViewModeLabelKey(mode)),
          icon: getViewModeIcon(mode),
          presets: presets.filter(preset => preset.type === mode).map(preset => ({
            id: preset.id,
            name: localize(preset.name),
            description: preset.description ? localize(preset.description) : '',
          })),
        }))
      return { ...atlas, views }
    }),
  })))

  return { atlasList }
}
