/**
 * European Union Region Configuration
 * All EU-specific settings and defaults
 */

import type { ProjectionParams, RegionSpecificConfig } from './types'
import type { GeoDataConfig, RegionConfig } from '@/types/territory'
import { EU_COUNTRIES } from '@/data/territories'

/**
 * Projection parameters for EU
 */
export const EU_PROJECTION_PARAMS: ProjectionParams = {
  center: {
    longitude: 10.0,
    latitude: 51.0,
  },
  rotate: {
    mainland: [-10.0, 0],
    azimuthal: [-10.0, -51.0],
  },
  parallels: {
    conic: [43, 62],
  },
}

/**
 * Geographic data configuration for EU
 */
export const EU_GEO_DATA_CONFIG: GeoDataConfig = {
  dataPath: '/data/eu-territories-50m.json',
  metadataPath: '/data/eu-metadata-50m.json',
  topologyObjectName: 'territories',
  // No mainlandCode for EU
  overseasTerritories: [], // EU doesn't have overseas territories in this model
}

/**
 * Complete EU region configuration
 */
export const EU_REGION_CONFIG: RegionConfig = {
  id: 'eu',
  name: 'Union Européenne',
  geoDataConfig: EU_GEO_DATA_CONFIG,
  supportedViewModes: ['split', 'composite-existing', 'unified'],
  defaultViewMode: 'split',
  compositeProjections: ['conic-conformal-europe'],
  defaultCompositeProjection: 'conic-conformal-europe',
  splitModeConfig: {
    territoriesTitle: 'États membres de l\'Union Européenne',
  },
  hasTerritorySelector: false, // EU doesn't have territory mode filtering
}

/**
 * EU-specific configuration
 */
export const EU_CONFIG: RegionSpecificConfig = {
  projectionParams: EU_PROJECTION_PARAMS,
  territoryModes: {}, // No modes for EU
}

/**
 * Export EU countries for reference
 */
export { EU_COUNTRIES }
