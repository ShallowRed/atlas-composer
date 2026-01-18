/**
 * JSON Configuration Types
 * Represents the structure of configs/*.json files
 * Used by both backend (scripts/) and frontend (src/)
 */

export type I18nValue = string | Record<string, string>

export interface JSONTerritoryConfig {
  id: string
  code: string
  name: I18nValue
  shortName?: I18nValue
  iso: string
  region?: I18nValue
  center: [number, number]
  bounds: [[number, number], [number, number]]
  extraction?: {
    extractFrom?: string
    polygonIndices?: number[]
    polygonBounds?: [[number, number], [number, number]]
    duplicateFrom?: string
  }
}

export interface JSONTerritoryCollection {
  id: string
  label: I18nValue
  territories: '*' | string[]
  exclude?: string[]
}

export interface JSONTerritoryCollectionSet {
  label: I18nValue
  selectionType: 'incremental' | 'mutually-exclusive'
  description?: I18nValue
  collections: JSONTerritoryCollection[]
}

export type JSONTerritoryCollections = Record<string, JSONTerritoryCollectionSet>

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
  viewModes?: Array<'split' | 'built-in-composite' | 'composite-custom' | 'unified'>
  defaultViewMode?: 'split' | 'built-in-composite' | 'composite-custom' | 'unified'
  // Unified territory collections (replaces modes, groups, territoryModes)
  territoryCollections?: JSONTerritoryCollections
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
    territoriesTitle: string
  }
  territoryModeOptions?: Array<{ value: string, label: string }>
}
