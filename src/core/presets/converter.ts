/**
 * Preset Converter
 *
 * Core conversion logic for preset configurations.
 * Handles format transformations between preset formats and internal application formats.
 */

import type { TerritoryDefaults } from './types'
import type { ExportedCompositeConfig } from '@/types/export-config'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { parameterRegistry } from '@/core/parameters'

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
  const projections: Record<string, string> = {}
  const translations: Record<string, { x: number, y: number }> = {}
  const scales: Record<string, number> = {}

  // Extract values from each territory in the preset
  preset.territories.forEach((territory) => {
    const code = territory.code

    // Projection ID
    projections[code] = territory.projection.id

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
