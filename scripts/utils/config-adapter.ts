/**
 * Generic Backend Config Adapter
 * Transforms unified JSON configs to backend extraction format
 */

/**
 * Raw JSON territory structure (as it appears in configs/*.json)
 */
interface JSONTerritoryConfig {
  id: string
  role: 'mainland' | 'overseas'
  code: string
  name: string
  shortName?: string
  iso: string
  region?: string
  center: [number, number]
  bounds: [[number, number], [number, number]]
  extraction?: {
    mainlandPolygon?: number
    extractFrom?: string
    polygonIndices?: number[]
    polygonBounds?: [number, number, number, number]
    duplicateFrom?: string
  }
  rendering?: any
}

/**
 * Raw JSON atlas config structure (as it appears in configs/*.json)
 */
interface JSONAtlasConfig {
  id: string
  name: string
  description: string
  territories: JSONTerritoryConfig[]
  projectionPreferences?: any
  [key: string]: any
}

/**
 * Backend territory structure for geodata extraction
 */
export interface BackendTerritory {
  name: string
  code: string
  iso: string
  mainlandPolygon?: number
  extractFrom?: number
  polygonIndices?: number[]
  bounds?: [number, number, number, number]
  duplicateFrom?: string
}

/**
 * Backend configuration format for geodata scripts
 */
export interface BackendConfig {
  name: string
  description: string
  territories: Record<string, BackendTerritory>
  outputName: string
}

/**
 * Transform unified config to backend extraction format
 * Takes raw JSON config and creates backend-specific structure
 */
export function createBackendConfig(unifiedConfig: JSONAtlasConfig): BackendConfig {
  const territories: Record<string, BackendTerritory> = {}

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
      // Convert [[minLon, minLat], [maxLon, maxLat]] to [minLon, minLat, maxLon, maxLat]
      backendTerritory.bounds = [
        territory.bounds[0][0],
        territory.bounds[0][1],
        territory.bounds[1][0],
        territory.bounds[1][1],
      ]
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
