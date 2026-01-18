import type { ComputedRef } from 'vue'
import type { TerritoryCollections } from '@/types'
import { computed } from 'vue'
import { getAtlasBehavior, getAtlasSpecificConfig, isAtlasLoaded } from '@/core/atlases/registry'
import { useAtlasStore } from '@/stores/atlas'
import { logger } from '@/utils/logger'

const debug = logger.vue.component

export type SelectionTypeRequirement = 'incremental' | 'mutually-exclusive' | 'any'

export function getValidatedCollectionSetKey(
  uiLocation: string,
  requiredSelectionType: SelectionTypeRequirement,
  atlasId: string,
  territoryCollections: TerritoryCollections | undefined,
): string | undefined {
  if (!territoryCollections) {
    return undefined
  }

  const behavior = getAtlasBehavior(atlasId)
  const collectionSetKey = behavior?.collectionSets?.[uiLocation]

  if (!collectionSetKey) {
    debug(
      `No ${uiLocation} mapping in registry for atlas '${atlasId}'. No fallback applied.`,
    )
    return undefined
  }

  const collectionSet = territoryCollections[collectionSetKey]
  if (!collectionSet) {
    debug(
      `Error: Collection set '${collectionSetKey}' referenced by ${uiLocation} does not exist in atlas '${atlasId}'.`,
    )
    return undefined
  }

  if (requiredSelectionType !== 'any' && collectionSet.selectionType !== requiredSelectionType) {
    debug(
      `Warning: ${uiLocation} in atlas '${atlasId}' references collection set '${collectionSetKey}' with selectionType='${collectionSet.selectionType}', but '${requiredSelectionType}' is expected`,
    )
  }

  return collectionSetKey
}

export function useCollectionSet(
  uiLocation: string,
  requiredSelectionType: SelectionTypeRequirement = 'any',
): ComputedRef<string | undefined> {
  const atlasStore = useAtlasStore()

  return computed(() => {
    const atlasId = atlasStore.selectedAtlasId

    if (!isAtlasLoaded(atlasId)) {
      return undefined
    }

    const atlasSpecificConfig = getAtlasSpecificConfig(atlasId)
    const territoryCollections = atlasSpecificConfig.territoryCollections

    return getValidatedCollectionSetKey(
      uiLocation,
      requiredSelectionType,
      atlasId,
      territoryCollections,
    )
  })
}

export function filterCollectionSetsByType(
  territoryCollections: TerritoryCollections | undefined,
  selectionType: SelectionTypeRequirement,
): string[] {
  if (!territoryCollections || selectionType === 'any') {
    return Object.keys(territoryCollections || {})
  }

  return Object.entries(territoryCollections)
    .filter(([_, set]) => set.selectionType === selectionType)
    .map(([key, _]) => key)
}
