import type { AtlasId } from '@/types/branded'
import { computed } from 'vue'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { getAvailableAtlasesGrouped } from '@/core/atlases/registry'
import { getAtlasFlag } from '@/utils/atlas-icons'

export function useAtlasGroups() {
  const { localize } = useLocalizedName()

  const atlasGroups = computed(() => getAvailableAtlasesGrouped().map(group => ({
    id: group.id,
    label: localize(group.label),
    options: group.options.map(atlas => ({
      value: atlas.value as AtlasId,
      label: localize(atlas.label),
      icon: getAtlasFlag(atlas.value as AtlasId),
    })),
  })))

  return { atlasGroups }
}
