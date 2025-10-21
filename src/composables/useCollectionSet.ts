/**
 * Composable for safely retrieving and validating territory collection sets
 * based on their selection type requirements
 */

import type { ComputedRef } from 'vue'
import type { TerritoryCollections } from '@/types'
import { computed } from 'vue'
import { getAtlasBehavior, getAtlasSpecificConfig } from '@/core/atlases/registry'
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
    // No mapping in registry, fallback to first available
    const firstKey = Object.keys(territoryCollections)[0]
    if (firstKey && requiredSelectionType !== 'any') {
      const firstSet = territoryCollections[firstKey]
      if (firstSet && firstSet.selectionType !== requiredSelectionType) {
        debug(
          `Warning: No ${uiLocation} mapping in registry for atlas '${atlasId}'. First available collection set '${firstKey}' has selectionType='${firstSet.selectionType}' but '${requiredSelectionType}' is required.`,
        )
      }
    }
    return firstKey
  }

  // Validate selection type if requirement specified
  if (requiredSelectionType !== 'any') {
    const collectionSet = territoryCollections[collectionSetKey]
    if (!collectionSet) {
      debug(
        `Error: Collection set '${collectionSetKey}' referenced by ${uiLocation} does not exist in atlas '${atlasId}'`,
      )
      return undefined
    }

    if (collectionSet.selectionType !== requiredSelectionType) {
      debug(
        `Error: ${uiLocation} in atlas '${atlasId}' references collection set '${collectionSetKey}' with selectionType='${collectionSet.selectionType}', but '${requiredSelectionType}' is required`,
      )
      // Return it anyway but log the error - component should handle gracefully
    }
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
