/**
 * JSON Configuration Types
 * Represents the structure of configs/*.json files
 * Used by both backend (scripts/) and frontend (src/)
 *
 * These types define the on-disk JSON format for atlas configurations.
 * Frontend may derive additional runtime types from these in src/types/
 */

/**
 * Territory configuration in unified JSON format
 * Represents a single territory as stored in configs/*.json
 */
export interface JSONTerritoryConfig {
  id: string
  role: 'primary' | 'secondary' | 'member' | 'embedded'
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
    polygonBounds?: [[number, number], [number, number]]
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
  name: string | { en: string, fr?: string }
  description: string | { en: string, fr?: string }
  pattern?: 'single-focus' | 'equal-members' | 'hierarchical'
  territories: '*' | JSONTerritoryConfig[]
  defaultProjection?: string
  territoryModes?: Array<{
    id: string
    name: string | { en: string, fr?: string }
    territoryCodes: '*' | string[]
    exclude?: string[]
  }>
  defaultTerritoryMode?: string
  metadata?: {
    source?: string
    resolution?: string
    dataFiles?: {
      '50m'?: {
        territories?: string
        metadata?: string
      }
      '10m'?: {
        territories?: string
        metadata?: string
      }
    }
  }
  // Legacy fields (for backward compatibility)
  projectionPreferences?: {
    defaultProjection?: string
    compositeModes?: string[]
  }
  viewModes?: {
    supported: Array<'split' | 'composite-existing' | 'composite-custom' | 'unified'>
    default: 'split' | 'composite-existing' | 'composite-custom' | 'unified'
  }
  mapDisplayDefaults?: {
    showGraticule?: boolean
    showCompositionBorders?: boolean
    showMapLimits?: boolean
  }
  splitModeConfig?: {
    mainlandTitle?: string
    mainlandCode?: string
    territoriesTitle: string
  }
  territoryModeOptions?: Array<{ value: string, label: string }>
}
