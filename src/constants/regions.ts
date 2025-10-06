/**
 * Region Configurations
 * Centralized configuration for all available geographic regions
 */

import type { RegionConfig } from '@/constants/territory-types'
import { EU_GEO_DATA_CONFIG } from '@/constants/eu-territories'
import { DEFAULT_GEO_DATA_CONFIG, TERRITORY_MODES } from '@/constants/france-territories'

/**
 * Available region configurations
 */
export const REGION_CONFIGS: Record<string, RegionConfig> = {
  france: {
    id: 'france',
    name: 'France',
    geoDataConfig: DEFAULT_GEO_DATA_CONFIG,
    supportedViewModes: ['split', 'composite-existing', 'composite-custom', 'unified'],
    defaultViewMode: 'composite-custom',
    splitModeConfig: {
      mainlandTitle: 'France Métropolitaine',
      territoriesTitle: 'Départements et Collectivités d\'Outre-Mer',
    },
    hasTerritorySelector: true,
    territoryModeOptions: [
      { value: 'metropole-only', label: TERRITORY_MODES['metropole-only']!.label },
      { value: 'metropole-major', label: TERRITORY_MODES['metropole-major']!.label },
      { value: 'metropole-uncommon', label: TERRITORY_MODES['metropole-uncommon']!.label },
      { value: 'all-territories', label: TERRITORY_MODES['all-territories']!.label },
    ],
  },
  eu: {
    id: 'eu',
    name: 'Union Européenne',
    geoDataConfig: EU_GEO_DATA_CONFIG,
    supportedViewModes: ['split', 'unified'], // EU supports split and unified modes
    defaultViewMode: 'split',
    splitModeConfig: {
      territoriesTitle: 'États membres de l\'Union Européenne',
    },
    hasTerritorySelector: false, // EU doesn't have territory mode filtering
  },
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
