/**
 * Composable for safely retrieving and validating territory collection sets
 * based on their selection type requirements
 */

import type { ComputedRef } from 'vue'
import type { TerritoryCollections } from '@/types'
import { computed } from 'vue'
import { getAtlasBehavior, getAtlasSpecificConfig, isAtlasLoaded } from '@/core/atlases/registry'
import { useConfigStore } from '@/stores/config'
import { logger } from '@/utils/logger'

const debug = logger.vue.component

export type SelectionTypeRequirement = 'incremental' | 'mutually-exclusive' | 'any'

/**
 * Get a collection set key from registry behavior with validation
 *
 * @param uiLocation - The UI location identifier (e.g., 'territoryManager', 'territoryScope')
 * @param requiredSelectionType - Required selection type for this UI location
 * @param atlasId - Atlas identifier
 * @param territoryCollections - Available territory collections
 * @returns Collection set key if valid, undefined otherwise
 */
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
    // No mapping in registry - no fallback
    debug(
      `No ${uiLocation} mapping in registry for atlas '${atlasId}'. No fallback applied.`,
    )
    return undefined
  }

  // Validate that the referenced collection set exists
  const collectionSet = territoryCollections[collectionSetKey]
  if (!collectionSet) {
    debug(
      `Error: Collection set '${collectionSetKey}' referenced by ${uiLocation} does not exist in atlas '${atlasId}'.`,
    )
    return undefined
  }

  // Validate selection type if requirement specified
  if (requiredSelectionType !== 'any' && collectionSet.selectionType !== requiredSelectionType) {
    debug(
      `Warning: ${uiLocation} in atlas '${atlasId}' references collection set '${collectionSetKey}' with selectionType='${collectionSet.selectionType}', but '${requiredSelectionType}' is expected`,
    )
  }

  return collectionSetKey
}

/**
 * Composable for getting a validated collection set for a specific UI location
 *
 * @param uiLocation - The UI location identifier (e.g., 'territoryManager', 'territoryScope')
 * @param requiredSelectionType - Required selection type for this UI location
 * @returns Reactive collection set key
 */
export function useCollectionSet(
  uiLocation: string,
  requiredSelectionType: SelectionTypeRequirement = 'any',
): ComputedRef<string | undefined> {
  const configStore = useConfigStore()

  return computed(() => {
    const atlasId = configStore.selectedAtlas

    // Check if atlas is loaded before accessing config
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

/**
 * Filter collection sets by selection type
 * Useful for providing options in UI dropdowns
 *
 * @param territoryCollections - All available collections
 * @param selectionType - Required selection type to filter by
 * @returns Filtered collection set keys
 */
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
