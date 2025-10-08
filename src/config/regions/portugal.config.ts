/**
 * Portugal Region Configuration
 * Uses generic adapter to transform unified JSON config
 */

import type { CompositeProjectionDefaults, ProjectionParams, RegionSpecificConfig } from './types'
import type { GeoDataConfig, RegionConfig } from '@/types/territory'
import {
  MAINLAND_PORTUGAL,
  PORTUGAL_ALL_TERRITORIES,
  PORTUGAL_OVERSEAS,
} from '@/data/territories'
import config from '../../../configs/portugal.json'
import { createRegionConfigExports } from './adapter'

// Generate all exports from unified config
const exports = createRegionConfigExports(config, {
  mainland: MAINLAND_PORTUGAL,
  overseas: PORTUGAL_OVERSEAS,
  all: PORTUGAL_ALL_TERRITORIES,
})

// Re-export with Portugal-specific names
export const PORTUGAL_PROJECTION_PARAMS: ProjectionParams = exports.projectionParams
export const PORTUGAL_TERRITORY_MODES = exports.territoryModes
export const PORTUGAL_TERRITORY_GROUPS = exports.territoryGroups
export const PORTUGAL_DEFAULT_COMPOSITE_CONFIG: CompositeProjectionDefaults = exports.defaultCompositeConfig
export const PORTUGAL_GEO_DATA_CONFIG: GeoDataConfig = exports.geoDataConfig
export const PORTUGAL_COMPOSITE_PROJECTION_CONFIG = exports.compositeProjectionConfig
export const PORTUGAL_REGION_CONFIG: RegionConfig = exports.regionConfig
export const PORTUGAL_CONFIG: RegionSpecificConfig = exports.regionSpecificConfig
