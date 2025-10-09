/**
 * Shared types for Atlas Composer
 * Used by both frontend (src/) and backend scripts (scripts/)
 */

// Re-export territory types for convenience
export type {
  AtlasConfig,
  CompositeProjectionConfig,
  GeoDataConfig,
  MultiMainlandCompositeConfig,
  TerritoryConfig,
  TerritoryModeConfig,
  TraditionalCompositeConfig,
} from '../src/types/territory.d.ts'

export type {
  BackendConfig,
  BackendTerritory,
  JSONAtlasConfig,
  JSONTerritoryConfig,
} from './config.d.ts'
