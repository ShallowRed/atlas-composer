/**
 * Generic Backend Config Adapter
 * Transforms unified JSON configs to backend extraction format
 */

/**
 * Transform unified config to backend extraction format
 */
export function createBackendConfig(unifiedConfig) {
  const territories = {}

  for (const territory of unifiedConfig.territories) {
    const backendTerritory = {
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
      backendTerritory.bounds = territory.bounds
    }

    if (territory.extraction?.duplicateFrom) {
      backendTerritory.duplicateFrom = territory.extraction.duplicateFrom
    }

    territories[territory.id] = backendTerritory
  }

  return {
    name: unifiedConfig.name,
    description: unifiedConfig.description,
    territories,
    outputName: unifiedConfig.id,
  }
}
