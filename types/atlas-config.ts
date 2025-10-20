/**
 * JSON Configuration Types
 * Represents the structure of configs/*.json files
 * Used by both backend (scripts/) and frontend (src/)
 *
 * These types define the on-disk JSON format for atlas configurations.
 * Frontend may derive additional runtime types from these in src/types/
 */

/**
 * i18n value type - supports both simple strings and localized objects
 */
export type I18nValue = string | Record<string, string>

/**
 * Territory configuration in unified JSON format
 * Represents a single territory as stored in configs/*.json
 */
export interface JSONTerritoryConfig {
  id: string
  role: 'primary' | 'secondary' | 'member' | 'embedded'
  code: string
  name: I18nValue
  shortName?: I18nValue
  iso: string
  region?: I18nValue
  center: [number, number]
  bounds: [[number, number], [number, number]]
  extraction?: {
    mainlandPolygon?: number
    extractFrom?: string
    polygonIndices?: number[]
    polygonBounds?: [[number, number], [number, number]]
    duplicateFrom?: string
  }
}

/**
 * Atlas configuration in unified JSON format
 * Represents a complete atlas as stored in configs/*.json
 */
export interface JSONAtlasConfig {
  id: string
  name: I18nValue
  description: I18nValue
  category?: 'country' | 'region' | 'world'
  pattern?: 'single-focus' | 'equal-members' | 'hierarchical'
  territories: '*' | JSONTerritoryConfig[]
  dataSources: {
    territories: string
    metadata: string
  }
  defaultPreset?: string
  availablePresets?: string[]
  defaultProjection?: string
  modes?: Array<{
    id: string
    label: I18nValue
    territories: string[]
    exclude?: string[]
  }>
  groups?: Array<{
    id: string
    label: I18nValue
    territories: string[]
  }>
  viewModes?: Array<'split' | 'built-in-composite' | 'composite-custom' | 'unified'>
  defaultViewMode?: 'split' | 'built-in-composite' | 'composite-custom' | 'unified'
  territoryModes?: Array<{
    id: string
    name: I18nValue
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
  splitModeConfig?: {
    mainlandTitle?: string
    mainlandCode?: string
    territoriesTitle: string
  }
  territoryModeOptions?: Array<{ value: string, label: string }>
}
