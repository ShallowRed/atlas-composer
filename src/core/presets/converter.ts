/**
 * Preset Converter
 *
 * Core conversion logic for preset configurations.
 * Handles format transformations between preset formats and internal application formats.
 */

import type { TerritoryDefaults } from './types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { ExportedCompositeConfig } from '@/types/export-config'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { parameterRegistry } from '@/core/parameters'
import { inferCanonicalFromLegacy } from '@/core/positioning'

/**
 * Convert a preset configuration to territory defaults format
 *
 * Territory defaults are used to initialize the store state with
 * projection, translation, and scale values for each territory.
 *
 * @param preset - Validated preset configuration
 * @returns Territory defaults for store initialization
 */
export function convertToDefaults(preset: ExportedCompositeConfig): TerritoryDefaults {
  const projections: Record<TerritoryCode, ProjectionId> = {} as Record<TerritoryCode, ProjectionId>
  const translations: Record<TerritoryCode, { x: number, y: number }> = {} as Record<TerritoryCode, { x: number, y: number }>
  const scales: Record<TerritoryCode, number> = {} as Record<TerritoryCode, number>

  // Extract values from each territory in the preset
  preset.territories.forEach((territory) => {
    const code = territory.code as TerritoryCode

    // Projection ID
    projections[code] = territory.projection.id as ProjectionId

    // Translation offset
    translations[code] = {
      x: territory.layout.translateOffset[0],
      y: territory.layout.translateOffset[1],
    }

    // Scale multiplier
    scales[code] = territory.projection.parameters.scaleMultiplier ?? 1
  })

  return {
    projections,
    translations,
    scales,
  }
}

/**
 * Extract projection parameters from preset data for each territory
 *
 * Extracts all parameters known by the parameter registry, including
 * layout properties (translateOffset, pixelClipExtent).
 *
 * IMPORTANT: This function converts legacy center/rotate parameters to
 * canonical focusLongitude/focusLatitude format. This ensures the store
 * always uses the projection-agnostic canonical format.
 *
 * @param preset - The preset configuration
 * @returns Object mapping territory codes to their projection parameters
 */
export function extractTerritoryParameters(
  preset: ExportedCompositeConfig,
): Record<string, ProjectionParameters> {
  const result: Record<string, ProjectionParameters> = {}

  for (const territory of preset.territories) {
    // Only include parameters that are explicitly set in the territory
    const territoryParams: Partial<ProjectionParameters> = {}

    // IMPORTANT: Extract projectionId from territory.projection.id (required parameter)
    if (territory.projection?.id) {
      territoryParams.projectionId = territory.projection.id
    }

    if (territory.projection.parameters) {
      // Get list of parameter keys that the registry knows about and are exportable
      const exportableKeys = new Set(
        parameterRegistry.getExportable().map(def => def.key),
      )

      // Only copy parameters that exist in the territory and are known by the registry
      for (const [key, value] of Object.entries(territory.projection.parameters)) {
        if (exportableKeys.has(key as keyof ProjectionParameters) && value !== undefined) {
          territoryParams[key as keyof ProjectionParameters] = value as any
        }
      }

      // =======================================================================
      // CANONICAL CONVERSION: Convert legacy center/rotate to canonical format
      // =======================================================================
      // If the preset has center or rotate but no focusLongitude/focusLatitude,
      // convert them to canonical format. This ensures the store always uses
      // the projection-agnostic format.
      const hasLegacyPositioning = territoryParams.center || territoryParams.rotate
      const hasCanonicalPositioning = territoryParams.focusLongitude !== undefined
        || territoryParams.focusLatitude !== undefined

      if (hasLegacyPositioning && !hasCanonicalPositioning) {
        const canonical = inferCanonicalFromLegacy({
          center: territoryParams.center as [number, number] | undefined,
          rotate: territoryParams.rotate as [number, number, number] | undefined,
        })

        // Set canonical parameters
        territoryParams.focusLongitude = canonical.focusLongitude
        territoryParams.focusLatitude = canonical.focusLatitude
        if (canonical.rotateGamma !== 0) {
          territoryParams.rotateGamma = canonical.rotateGamma
        }

        // Clear legacy parameters - we don't need them anymore
        // The canonical format is now the source of truth
        delete territoryParams.center
        delete territoryParams.rotate
      }
    }

    // Convert layout properties to parameters
    if (territory.layout?.pixelClipExtent && Array.isArray(territory.layout.pixelClipExtent) && territory.layout.pixelClipExtent.length === 4) {
      territoryParams.pixelClipExtent = territory.layout.pixelClipExtent as [number, number, number, number]
    }

    if (territory.layout?.translateOffset && Array.isArray(territory.layout.translateOffset) && territory.layout.translateOffset.length === 2) {
      territoryParams.translateOffset = territory.layout.translateOffset as [number, number]
    }

    result[territory.code] = territoryParams as ProjectionParameters
  }

  return result
}
