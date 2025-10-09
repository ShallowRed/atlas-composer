/**
 * Generic Backend Config Adapter
 * Transforms unified JSON configs to backend extraction format
 */

import type { BackendConfig, BackendTerritory, JSONAtlasConfig } from '#types'

// Re-export types for backwards compatibility
export type { BackendConfig, BackendTerritory }

/**
 * Transform unified config to backend extraction format
 * Takes raw JSON config and creates backend-specific structure
 */
export function createBackendConfig(unifiedConfig: JSONAtlasConfig): BackendConfig {
  const territories: Record<string, BackendTerritory> = {}

  // Skip territory processing if wildcard (all territories loaded dynamically)
  if (unifiedConfig.territories === '*') {
    return {
      name: typeof unifiedConfig.name === 'string' ? unifiedConfig.name : unifiedConfig.name.en,
      description: typeof unifiedConfig.description === 'string' ? unifiedConfig.description : unifiedConfig.description.en,
      territories: {},
    }
  }

  for (const territory of unifiedConfig.territories) {
    const backendTerritory: BackendTerritory = {
      name: territory.name,
      code: territory.code,
      iso: territory.iso,
    }

    // Add extraction properties
    if (territory.extraction?.mainlandPolygon !== undefined) {
      backendTerritory.mainlandPolygon = territory.extraction.mainlandPolygon
    }

    if (territory.extraction?.extractFrom) {
      backendTerritory.extractFrom = Number.parseInt(territory.extraction.extractFrom)
    }

    if (territory.extraction?.polygonIndices) {
      backendTerritory.polygonIndices = territory.extraction.polygonIndices
    }

    if (territory.extraction?.polygonBounds) {
      backendTerritory.bounds = territory.extraction.polygonBounds
    }
    else if (territory.bounds) {
      // Use bounds as-is in [[minLon, minLat], [maxLon, maxLat]] format
      backendTerritory.bounds = territory.bounds
    }

    if (territory.extraction?.duplicateFrom) {
      backendTerritory.duplicateFrom = territory.extraction.duplicateFrom
    }

    territories[territory.id] = backendTerritory
  }

  return {
    name: typeof unifiedConfig.name === 'string' ? unifiedConfig.name : unifiedConfig.name.en,
    description: typeof unifiedConfig.description === 'string' ? unifiedConfig.description : unifiedConfig.description.en,
    territories,
    outputName: unifiedConfig.id,
  }
}
