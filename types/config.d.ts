/**
 * Shared configuration types for atlas configs
 * Used by both frontend (src/) and backend scripts (scripts/)
 */

/**
 * Territory configuration in unified JSON format
 * Represents a single territory as stored in configs/*.json
 */
export interface JSONTerritoryConfig {
  id: string
  role: 'mainland' | 'overseas' | 'member-state'
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
  rendering?: {
    projectionType?: string
    offset?: [number, number]
    scale?: number
    clipExtent?: { x1: number, y1: number, x2: number, y2: number }
    rotate?: [number, number, number?]
    parallels?: [number, number]
    baseScaleMultiplier?: number
  }
}

/**
 * Atlas configuration in unified JSON format
 * Represents a complete atlas as stored in configs/*.json
 */
export interface JSONAtlasConfig {
  id: string
  name: string
  description: string
  territories: JSONTerritoryConfig[]
  projectionPreferences?: {
    defaultProjection?: string
    compositeModes?: string[]
  }
  viewModes?: {
    supported: Array<'split' | 'composite-existing' | 'composite-custom' | 'unified'>
    default: 'split' | 'composite-existing' | 'composite-custom' | 'unified'
  }
  splitModeConfig?: {
    mainlandTitle?: string
    mainlandCode?: string
    territoriesTitle: string
  }
  territoryModeOptions?: Array<{ value: string, label: string }>
  defaultTerritoryMode?: string
}

/**
 * Backend territory structure for geodata extraction
 * Used by scripts/prepare-geodata.ts for processing Natural Earth data
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
 * Used by scripts/prepare-geodata.ts
 */
export interface BackendConfig {
  name: string
  description: string
  territories: Record<string, BackendTerritory>
  outputName: string
}
