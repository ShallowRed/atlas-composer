/**
 * Region Configuration Index
 * Central registry for all region configurations
 */

import type { RegionConfig } from '@/types/territory'
import { EU_CONFIG, EU_REGION_CONFIG } from './eu.config'
import { FRANCE_CONFIG, FRANCE_REGION_CONFIG } from './france.config'
import { PORTUGAL_CONFIG, PORTUGAL_REGION_CONFIG } from './portugal.config'

/**
 * All available region configurations
 */
export const REGION_CONFIGS: Record<string, RegionConfig> = {
  france: FRANCE_REGION_CONFIG,
  portugal: PORTUGAL_REGION_CONFIG,
  eu: EU_REGION_CONFIG,
}

/**
 * Region-specific configurations (projection params, modes, groups)
 */
export const REGION_SPECIFIC_CONFIGS = {
  france: FRANCE_CONFIG,
  portugal: PORTUGAL_CONFIG,
  eu: EU_CONFIG,
}

/**
 * Default region
 */
export const DEFAULT_REGION = 'france'

/**
 * Get region configuration by ID
 */
export function getRegionConfig(regionId: string): RegionConfig {
  return REGION_CONFIGS[regionId] || REGION_CONFIGS[DEFAULT_REGION]!
}

/**
 * Get list of available regions for UI selector
 */
export function getAvailableRegions() {
  return Object.values(REGION_CONFIGS).map(config => ({
    value: config.id,
    label: config.name,
  }))
}

// Re-export individual configs for direct access
export * from './eu.config'
export * from './france.config'
export * from './portugal.config'
export * from './types'
