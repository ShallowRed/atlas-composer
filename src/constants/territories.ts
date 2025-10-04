/**
 * Territory configuration - Main entry point
 *
 * This file re-exports both generic types and France-specific configurations
 * for backward compatibility. For new code, consider importing directly from:
 * - './territory-types' for generic types and utilities
 * - './france-territories' for France-specific configurations
 */

// Re-export France-specific configurations
export {
  ALL_TERRITORIES,
  DEFAULT_GEO_DATA_CONFIG,
  DEFAULT_TERRITORY_TRANSLATIONS,
  FRANCE_PROJECTION_PARAMS,
  getTerritoriesForMode,
  getTerritoryConfig,
  getTerritoryName,
  getTerritoryShortName,
  getTerritoryVarName,
  MAINLAND_FRANCE,
  OVERSEAS_TERRITORIES,
  TERRITORIES_BY_CODE,
  TERRITORY_CODES,
  TERRITORY_GROUPS,
  TERRITORY_LIST,
  TERRITORY_MODES,
  TERRITORY_VAR_NAMES,
  type TerritoryMode,
} from './france-territories'

// Re-export generic types and utilities
export type {
  GeoDataConfig,
  TerritoryConfig,
  TerritoryGroupConfig,
  TerritoryModeConfig,
} from './territory-types'

export {
  createDefaultTranslations,
  createTerritoryMap,
  DEFAULT_PROJECTION_TYPES,
  extractTerritoryCodes,
  getTerritoryConfig as getGenericTerritoryConfig,
  getTerritoryName as getGenericTerritoryName,
  getTerritoryShortName as getGenericTerritoryShortName,
  SCALE_RANGE,
  TRANSLATION_RANGES,
} from './territory-types'
