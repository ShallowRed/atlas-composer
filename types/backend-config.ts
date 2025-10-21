/**
 * Backend Configuration Types
 * Used by scripts/prepare-geodata.ts for data extraction
 *
 * These types are specific to backend processing and are NOT used by the frontend.
 */

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
  bounds?: [[number, number], [number, number]]
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
  outputName?: string
}
