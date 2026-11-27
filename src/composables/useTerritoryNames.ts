import { useLocalizedName } from '@/composables/useLocalizedName'
import { entryName } from '@/core/presets/composition-state'
import { useAtlasStore } from '@/stores/atlas'

// The name of a territory in the atlas file, in the current locale, else the name of the geographic data:
// the world atlas names no territory
export function useTerritoryNames() {
  const atlasStore = useAtlasStore()
  const { localize } = useLocalizedName()

  function territoryName(code: string, fallback: string): string {
    return localize(entryName(code, fallback, atlasStore.territories))
  }

  return { territoryName }
}
