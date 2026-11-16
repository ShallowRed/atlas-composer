import { computed } from 'vue'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useAtlasStore } from '@/stores/atlas'

interface TerritoryModeOption {
  value: string
  label: string
}

export function useTerritoryModeOptions() {
  const atlasStore = useAtlasStore()
  const { localize } = useLocalizedName()

  const options = computed<TerritoryModeOption[]>(() =>
    atlasStore.territoryModeOptions.map(option => ({
      value: option.value,
      label: localize(option.label),
    })),
  )

  return {
    options,
  }
}
