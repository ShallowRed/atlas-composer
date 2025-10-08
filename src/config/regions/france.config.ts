/**
 * France Region Configuration
 * All France-specific settings, modes, groups, and defaults
 */

import type { CompositeProjectionDefaults, ProjectionParams, RegionSpecificConfig } from './types'
import type { GeoDataConfig, RegionConfig, TerritoryGroupConfig, TerritoryModeConfig } from '@/types/territory'
import {
  FRANCE_ALL_TERRITORIES,
  FRANCE_OVERSEAS_TERRITORIES,
  MAINLAND_FRANCE,
} from '@/data/territories'

/**
 * Projection parameters for France
 */
export const FRANCE_PROJECTION_PARAMS: ProjectionParams = {
  center: {
    longitude: 2.5,
    latitude: 46.5,
  },
  rotate: {
    mainland: [-2, 0],
    azimuthal: [-2, -46.5],
  },
  parallels: {
    conic: [44, 49],
  },
}

/**
 * Territory mode definitions for France
 * Defines which territories are included in each display mode
 */
export const FRANCE_TERRITORY_MODES: Record<string, TerritoryModeConfig> = {
  'metropole-only': {
    label: 'Métropole uniquement',
    codes: [],
  },
  'metropole-major': {
    label: 'Métropole + DOM',
    codes: ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT'],
  },
  'metropole-uncommon': {
    label: 'Métropole + DOM + COM principaux',
    codes: ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-PF-2', 'FR-NC'],
  },
  'all-territories': {
    label: 'Tous les territoires',
    codes: ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-PF-2', 'FR-NC', 'FR-TF', 'FR-WF', 'FR-PM', 'FR-BL'],
  },
}

/**
 * Territory groupings for UI organization
 */
export const FRANCE_TERRITORY_GROUPS: Record<string, TerritoryGroupConfig> = {
  MAINLAND: {
    label: 'France Métropolitaine',
    codes: ['FR-MET'],
  },
  CARIBBEAN: {
    label: 'Caraïbes',
    codes: ['FR-GP', 'FR-MQ', 'FR-GF', 'FR-MF', 'FR-BL'],
  },
  INDIAN_OCEAN: {
    label: 'Océan Indien',
    codes: ['FR-RE', 'FR-YT', 'FR-TF'],
  },
  PACIFIC: {
    label: 'Océan Pacifique',
    codes: ['FR-NC', 'FR-PF', 'FR-PF-2', 'FR-WF'],
  },
  NORTH_ATLANTIC: {
    label: 'Atlantique Nord',
    codes: ['FR-PM'],
  },
}

/**
 * Default composite projection configuration for France
 * Pre-configured settings for custom composite mode
 */
export const FRANCE_DEFAULT_COMPOSITE_CONFIG: CompositeProjectionDefaults = {
  territoryProjections: Object.fromEntries(
    FRANCE_OVERSEAS_TERRITORIES.map(t => [
      t.code,
      t.projectionType || 'mercator',
    ]),
  ),
  territoryTranslations: Object.fromEntries(
    FRANCE_ALL_TERRITORIES.map((t: any) => [t.code, { x: t.offset[0], y: t.offset[1] }]),
  ),
  territoryScales: Object.fromEntries(
    FRANCE_ALL_TERRITORIES.map((t: any) => [t.code, 1.0]),
  ),
}

/**
 * Geographic data configuration for France
 */
export const FRANCE_GEO_DATA_CONFIG: GeoDataConfig = {
  dataPath: '/data/france-territories-50m.json',
  metadataPath: '/data/france-metadata-50m.json',
  topologyObjectName: 'territories',
  mainlandCode: 'FR-MET',
  mainlandBounds: MAINLAND_FRANCE.bounds,
  overseasTerritories: FRANCE_OVERSEAS_TERRITORIES,
}

/**
 * Composite projection configuration for CustomCompositeProjection
 */
export const FRANCE_COMPOSITE_PROJECTION_CONFIG = {
  mainland: MAINLAND_FRANCE,
  overseasTerritories: FRANCE_OVERSEAS_TERRITORIES,
}

/**
 * Complete France region configuration
 */
export const FRANCE_REGION_CONFIG: RegionConfig = {
  id: 'france',
  name: 'France',
  geoDataConfig: FRANCE_GEO_DATA_CONFIG,
  supportedViewModes: ['split', 'composite-existing', 'composite-custom', 'unified'],
  defaultViewMode: 'composite-custom',
  defaultTerritoryMode: 'metropole-major',
  compositeProjections: ['conic-conformal-france'],
  defaultCompositeProjection: 'conic-conformal-france',
  compositeProjectionConfig: FRANCE_COMPOSITE_PROJECTION_CONFIG,
  splitModeConfig: {
    mainlandTitle: 'France Métropolitaine',
    mainlandCode: 'FR-MET',
    territoriesTitle: 'Départements et Collectivités d\'Outre-Mer',
  },
  hasTerritorySelector: true,
  territoryModeOptions: [
    { value: 'metropole-only', label: FRANCE_TERRITORY_MODES['metropole-only']!.label },
    { value: 'metropole-major', label: FRANCE_TERRITORY_MODES['metropole-major']!.label },
    { value: 'metropole-uncommon', label: FRANCE_TERRITORY_MODES['metropole-uncommon']!.label },
    { value: 'all-territories', label: FRANCE_TERRITORY_MODES['all-territories']!.label },
  ],
  defaultCompositeConfig: FRANCE_DEFAULT_COMPOSITE_CONFIG,
}

/**
 * France-specific configuration
 * Combines all France-related configuration for easy access
 */
export const FRANCE_CONFIG: RegionSpecificConfig = {
  projectionParams: FRANCE_PROJECTION_PARAMS,
  territoryModes: FRANCE_TERRITORY_MODES,
  territoryGroups: FRANCE_TERRITORY_GROUPS,
  defaultCompositeConfig: FRANCE_DEFAULT_COMPOSITE_CONFIG,
}
