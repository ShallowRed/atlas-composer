/**
 * Shared Types for Atlas composer
 * Domain-agnostic types used by both backend (scripts/) and frontend (src/)
 *
 * IMPORTANT: This directory should NOT re-export from src/ or scripts/
 * - Backend scripts depend on types/ only
 * - Frontend depends on types/ AND src/types/
 * - No circular dependencies allowed
 */

// JSON Configuration (raw data from configs/*.json)
export type {
  I18nValue,
  JSONAtlasConfig,
  JSONTerritoryConfig,
} from './atlas-config.js'

// Atlas registry, generated from configs/schemas/atlas-registry.schema.json
export type {
  AtlasRegistry,
  AtlasRegistryBehavior,
  AtlasRegistryEntry,
  PresetDefinition,
  PresetType,
} from './atlas-registry.js'

// Backend Processing Types
export type {
  BackendConfig,
  BackendTerritory,
} from './backend-config.js'
