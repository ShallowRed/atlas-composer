/**
 * Portugal Region Configuration
 * All Portugal-specific settings, modes, groups, and defaults
 */

import type { CompositeProjectionDefaults, ProjectionParams, RegionSpecificConfig } from './types'
import type { GeoDataConfig, RegionConfig, TerritoryGroupConfig, TerritoryModeConfig } from '@/types/territory'
import {
  MAINLAND_PORTUGAL,
  PORTUGAL_ALL_TERRITORIES,
  PORTUGAL_AUTONOMOUS_REGIONS,
} from '@/data/territories'

/**
 * Projection parameters for Portugal
 */
export const PORTUGAL_PROJECTION_PARAMS: ProjectionParams = {
  center: {
    longitude: -8.0,
    latitude: 39.5,
  },
  rotate: {
    mainland: [8.0, 0],
    azimuthal: [8.0, -39.5],
  },
  parallels: {
    conic: [37, 42],
  },
}

/**
 * Territory mode definitions for Portugal
 */
export const PORTUGAL_TERRITORY_MODES: Record<string, TerritoryModeConfig> = {
  'mainland-only': {
    label: 'Portugal continental uniquement',
    codes: [],
  },
  'with-madeira': {
    label: 'Continental + Madeira',
    codes: ['PT-20'],
  },
  'all-territories': {
    label: 'Toutes les régions autonomes',
    codes: ['PT-20', 'PT-30'],
  },
}

/**
 * Territory groupings for UI organization
 */
export const PORTUGAL_TERRITORY_GROUPS: Record<string, TerritoryGroupConfig> = {
  MAINLAND: {
    label: 'Portugal Continental',
    codes: ['PT-CONT'],
  },
  ATLANTIC: {
    label: 'Régions Autonomes Atlantique',
    codes: ['PT-20', 'PT-30'],
  },
}

/**
 * Default composite projection configuration for Portugal
 */
export const PORTUGAL_DEFAULT_COMPOSITE_CONFIG: CompositeProjectionDefaults = {
  territoryProjections: Object.fromEntries(
    PORTUGAL_ALL_TERRITORIES.map((t: any) => [
      t.code,
      t.projectionType || 'mercator',
    ]),
  ),
  territoryTranslations: Object.fromEntries(
    PORTUGAL_ALL_TERRITORIES.map((t: any) => [t.code, { x: t.offset[0], y: t.offset[1] }]),
  ),
  territoryScales: Object.fromEntries(
    PORTUGAL_ALL_TERRITORIES.map((t: any) => [t.code, 1.0]),
  ),
}

/**
 * Geographic data configuration for Portugal
 */
export const PORTUGAL_GEO_DATA_CONFIG: GeoDataConfig = {
  dataPath: '/data/portugal-territories-50m.json',
  metadataPath: '/data/portugal-metadata-50m.json',
  topologyObjectName: 'territories',
  mainlandCode: 'PT',
  mainlandBounds: MAINLAND_PORTUGAL.bounds,
  overseasTerritories: PORTUGAL_AUTONOMOUS_REGIONS,
}

/**
 * Composite projection configuration for CustomCompositeProjection
 */
export const PORTUGAL_COMPOSITE_PROJECTION_CONFIG = {
  mainland: MAINLAND_PORTUGAL,
  overseasTerritories: PORTUGAL_AUTONOMOUS_REGIONS,
}

/**
 * Complete Portugal region configuration
 */
export const PORTUGAL_REGION_CONFIG: RegionConfig = {
  id: 'portugal',
  name: 'Portugal',
  geoDataConfig: PORTUGAL_GEO_DATA_CONFIG,
  supportedViewModes: ['split', 'composite-existing', 'composite-custom', 'unified'],
  defaultViewMode: 'composite-custom',
  defaultTerritoryMode: 'all-territories',
  defaultCompositeConfig: PORTUGAL_DEFAULT_COMPOSITE_CONFIG,
  compositeProjections: ['conic-conformal-portugal'],
  defaultCompositeProjection: 'conic-conformal-portugal',
  compositeProjectionConfig: PORTUGAL_COMPOSITE_PROJECTION_CONFIG,
  splitModeConfig: {
    mainlandTitle: 'Portugal Continental',
    mainlandCode: 'PT-CONT',
    territoriesTitle: 'Régions Autonomes',
  },
  hasTerritorySelector: true,
  territoryModeOptions: [
    { value: 'mainland-only', label: PORTUGAL_TERRITORY_MODES['mainland-only']!.label },
    { value: 'with-madeira', label: PORTUGAL_TERRITORY_MODES['with-madeira']!.label },
    { value: 'all-territories', label: PORTUGAL_TERRITORY_MODES['all-territories']!.label },
  ],
}

/**
 * Portugal-specific configuration
 */
export const PORTUGAL_CONFIG: RegionSpecificConfig = {
  projectionParams: PORTUGAL_PROJECTION_PARAMS,
  territoryModes: PORTUGAL_TERRITORY_MODES,
  territoryGroups: PORTUGAL_TERRITORY_GROUPS,
  defaultCompositeConfig: PORTUGAL_DEFAULT_COMPOSITE_CONFIG,
}
