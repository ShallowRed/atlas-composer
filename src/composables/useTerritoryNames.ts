import { computed } from 'vue'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useAtlasStore } from '@/stores/atlas'

// The name of a territory in the atlas file, in the current locale, else the name of the geographic data:
// the world atlas names no territory
export function useTerritoryNames() {
  const atlasStore = useAtlasStore()
  const { localize } = useLocalizedName()

  const names = computed(() => new Map(atlasStore.territories.map(territory => [territory.code as string, territory.name])))

  function territoryName(code: string, fallback: string): string {
    const name = names.value.get(code)
    return name === undefined ? fallback : localize(name)
  }

  return { territoryName }
}
