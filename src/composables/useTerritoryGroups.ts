import type { ComputedRef, Ref } from 'vue'
import type { TerritoryCode } from '@/types/branded'
import { computed } from 'vue'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useTerritoryNames } from '@/composables/useTerritoryNames'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'

export interface TerritoryGroup {
  id: string
  // Empty for the single group of an atlas without a collection set
  label: string
  territories: { code: TerritoryCode, name: string }[]
}

// The loaded territories of the atlas, grouped by the collections of a collection set, or in one group without it
export function useTerritoryGroups(collectionSetKey: Ref<string | undefined>): ComputedRef<TerritoryGroup[]> {
  const atlasStore = useAtlasStore()
  const geoDataStore = useGeoDataStore()
  const { localize } = useLocalizedName()
  const { territoryName } = useTerritoryNames()

  return computed(() => {
    const territories = geoDataStore.territoriesData.map(territory => ({
      code: territory.code,
      name: territoryName(territory.code, territory.name),
    }))
    const collectionSet = collectionSetKey.value ? atlasStore.territoryCollections?.[collectionSetKey.value] : undefined
    if (!collectionSet) {
      return territories.length > 0 ? [{ id: 'all-territories', label: '', territories }] : []
    }

    const byCode = new Map(territories.map(territory => [territory.code as string, territory]))
    return collectionSet.collections
      .filter(collection => collection.codes !== '*')
      .map(collection => ({
        id: collection.id,
        label: localize(collection.label),
        territories: (collection.codes as string[]).flatMap(code => byCode.get(code) ?? []),
      }))
      .filter(group => group.territories.length > 0)
  })
}
