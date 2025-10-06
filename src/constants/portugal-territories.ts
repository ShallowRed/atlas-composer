/**
 * Portugal Territory Configurations
 * Defines all Portuguese territories including mainland and autonomous regions
 */

import type { GeoDataConfig, TerritoryModeConfig } from '@/constants/territory-types'

/**
 * Mainland Portugal
 */
export const MAINLAND_PORTUGAL = {
  code: 'PT-CONT',
  name: 'Portugal Continental',
  center: [-8.0, 39.5],
  bounds: [[-9.5, 37.0], [-6.2, 42.2]] as [[number, number], [number, number]],
}

/**
 * Autonomous regions (Madeira and Azores)
 * Note: These are extracted from Portugal's MultiPolygon geometry
 * Based on actual polygon analysis:
 * - Madeira: Polygon 0, lon [-17.24, -16.69], lat [32.65, 32.87]
 * - Azores: Polygons 2-8, lon [-31.28, -25.03], lat [36.94, 39.52]
 */
export const AUTONOMOUS_REGIONS = [
  {
    code: 'PT-20',
    name: 'Madeira',
    region: 'Atlantic',
    center: [-16.9, 32.75] as [number, number],
    offset: [400, -200] as [number, number], // Positioned east of mainland
    bounds: [[-17.5, 32.5], [-16.5, 33.0]] as [[number, number], [number, number]],
    projectionType: 'mercator',
  },
  {
    code: 'PT-30',
    name: 'Azores',
    region: 'Atlantic',
    center: [-28.0, 38.5] as [number, number],
    offset: [-400, -100] as [number, number], // Positioned west of mainland
    // Wider bounds to capture all 7 Azores islands
    bounds: [[-32.0, 36.5], [-24.5, 40.0]] as [[number, number], [number, number]],
    projectionType: 'mercator',
  },
]

/**
 * Default geographic data configuration for Portugal
 * This configuration can be passed to GeoDataService
 */
export const PORTUGAL_GEO_DATA_CONFIG: GeoDataConfig = {
  dataPath: '/data/portugal-territories-50m.json',
  metadataPath: '/data/portugal-metadata-50m.json',
  topologyObjectName: 'territories',
  mainlandCode: 'PT',
  mainlandBounds: MAINLAND_PORTUGAL.bounds,
  overseasTerritories: AUTONOMOUS_REGIONS,
}

/**
 * Territory mode definitions for Portugal
 * Define which territories are included in each display mode
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
} as const

export type PortugalTerritoryMode = keyof typeof PORTUGAL_TERRITORY_MODES

/**
 * Get territory codes for a given mode
 */
export function getPortugalTerritoriesForMode(mode: PortugalTerritoryMode): readonly string[] {
  return PORTUGAL_TERRITORY_MODES[mode]?.codes || []
}

/**
 * Get the geographic region for a Portuguese territory code
 */
export function getPortugalTerritoryRegion(code: string): string {
  // All Portuguese autonomous regions are in the Atlantic
  const territory = AUTONOMOUS_REGIONS.find(t => t.code === code)
  return territory ? 'Atlantic' : 'Other'
}
