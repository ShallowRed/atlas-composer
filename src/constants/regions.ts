/**
 * Region Configurations
 * Centralized configuration for all available geographic regions
 */

import { EU_GEO_DATA_CONFIG } from '@/constants/eu-territories'
import { DEFAULT_COMPOSITE_PROJECTION_CONFIG, DEFAULT_GEO_DATA_CONFIG, TERRITORY_MODES } from '@/constants/france-territories'
import { DEFAULT_PORTUGAL_COMPOSITE_CONFIG, PORTUGAL_COMPOSITE_PROJECTION_CONFIG, PORTUGAL_GEO_DATA_CONFIG, PORTUGAL_TERRITORY_MODES } from '@/constants/portugal-territories'

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
    defaultTerritoryMode: 'metropole-major', // Default: France métropolitaine + territoires ultramarins majeurs
    compositeProjections: ['conic-conformal-france'], // Built-in D3 composite projections for France
    defaultCompositeProjection: 'conic-conformal-france', // Default composite projection
    compositeProjectionConfig: DEFAULT_COMPOSITE_PROJECTION_CONFIG, // Configuration for CustomCompositeProjection
    splitModeConfig: {
      mainlandTitle: 'France Métropolitaine',
      mainlandCode: 'FR-MET',
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
    supportedViewModes: ['split', 'composite-existing', 'unified'], // EU supports split, composite-existing, and unified modes
    defaultViewMode: 'split',
    compositeProjections: ['conic-conformal-europe'], // Built-in D3 composite projection for Europe
    defaultCompositeProjection: 'conic-conformal-europe', // Default composite projection
    splitModeConfig: {
      territoriesTitle: 'États membres de l\'Union Européenne',
    },
    hasTerritorySelector: false, // EU doesn't have territory mode filtering
  },
  portugal: {
    id: 'portugal',
    name: 'Portugal',
    geoDataConfig: PORTUGAL_GEO_DATA_CONFIG,
    supportedViewModes: ['split', 'composite-existing', 'composite-custom', 'unified'],
    defaultViewMode: 'composite-custom',
    defaultTerritoryMode: 'all-territories', // Default: Toutes les régions autonomes
    defaultCompositeConfig: DEFAULT_PORTUGAL_COMPOSITE_CONFIG, // Default composite projection settings
    compositeProjections: ['conic-conformal-portugal'], // Built-in D3 composite projections for Portugal
    defaultCompositeProjection: 'conic-conformal-portugal', // Default composite projection
    compositeProjectionConfig: PORTUGAL_COMPOSITE_PROJECTION_CONFIG, // Configuration for CustomCompositeProjection
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
