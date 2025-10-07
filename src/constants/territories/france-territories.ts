/**
 * French territory configurations
 * Specific definitions for France and its overseas territories
 *
 * @deprecated This file is deprecated and will be removed in a future version.
 *
 * **Migration Guide:**
 * - For pure territory data, use: `@/data/territories/france.data.ts`
 * - For region configuration, use: `@/config/regions/france.config.ts`
 * - For territory operations, use: `@/services/TerritoryService.ts`
 * - For region-aware access, use: `@/services/RegionService.ts`
 *
 * The new architecture separates:
 * 1. Data layer (src/data/territories/) - Pure geographic data
 * 2. Config layer (src/config/regions/) - Region-specific settings
 * 3. Service layer (src/services/) - Business logic and utilities
 *
 * This separation improves maintainability and makes the codebase region-agnostic.
 */

import type {
  GeoDataConfig,
  TerritoryConfig,
  TerritoryGroupConfig,
  TerritoryModeConfig,
} from '@/types/territory'

import {
  createDefaultTranslations,
  createTerritoryMap,
  extractTerritoryCodes,
} from '@/utils/territory-utils.ts'

/**
 * Mainland territory configuration (France Métropolitaine)
 */
export const MAINLAND_FRANCE: TerritoryConfig = {
  code: 'FR-MET',
  name: 'France Métropolitaine',
  shortName: 'Métropole',
  center: [2.5, 46.5],
  offset: [80, 0], // Center reference point + small offset for better visual balance
  bounds: [[-5, 41], [10, 51]],
  projectionType: 'conic-conformal',
  rotate: [-3, 0], // Rotation for France
  parallels: [45.898889, 47.696014], // Standard parallels for France's conic conformal projection
}

/**
 * Overseas territories configurations (territoires ultramarins)
 * Optimized positioning for better visual layout
 */
export const OVERSEAS_TERRITORIES: TerritoryConfig[] = [
  // Caribbean - Left side, top to bottom
  {
    code: 'FR-MF',
    name: 'Saint-Martin',
    center: [-63.082, 18.067],
    offset: [-450, -50], // Top left
    bounds: [[-63.15, 18.04], [-63.0, 18.13]],
    clipExtent: { x1: -0.14, y1: -0.052, x2: -0.0996, y2: -0.032 },
  },
  {
    code: 'FR-GP',
    name: 'Guadeloupe',
    center: [-61.551, 16.265],
    offset: [-450, 50], // Below Saint-Martin
    bounds: [[-61.81, 15.83], [-61.0, 16.52]],
    clipExtent: { x1: -0.14, y1: -0.032, x2: -0.0996, y2: 0 },
  },
  {
    code: 'FR-MQ',
    name: 'Martinique',
    center: [-61.024, 14.642],
    offset: [-450, 150], // Below Guadeloupe
    bounds: [[-61.23, 14.39], [-60.81, 14.88]],
    clipExtent: { x1: -0.14, y1: 0, x2: -0.0996, y2: 0.029 },
  },
  {
    code: 'FR-GF',
    name: 'Guyane',
    shortName: 'Guyane Française',
    center: [-53.1, 3.9],
    offset: [-300, 180], // Below Martinique (larger territory)
    bounds: [[-54.6, 2.1], [-51.6, 5.8]],
    clipExtent: { x1: -0.14, y1: 0.029, x2: -0.0996, y2: 0.0864 },
  },

  // North Atlantic
  {
    code: 'FR-PM',
    name: 'Saint-Pierre-et-Miquelon',
    center: [-56.327, 46.885],
    offset: [-200, -200], // Top center-left
    bounds: [[-56.42, 46.75], [-56.13, 47.15]],
    clipExtent: { x1: -0.14, y1: -0.076, x2: -0.0996, y2: -0.052 },
  },

  // Indian Ocean - Right side, top to bottom
  {
    code: 'FR-YT',
    name: 'Mayotte',
    center: [45.166, -12.827],
    offset: [350, -50], // Top right (small island)
    bounds: [[44.98, -13.0], [45.3, -12.64]],
    clipExtent: { x1: 0.0967, y1: -0.076, x2: 0.1371, y2: -0.052 },
  },
  {
    code: 'FR-RE',
    name: 'La Réunion',
    center: [55.536, -21.115],
    offset: [-250, 0], // Below Mayotte
    bounds: [[55.22, -21.39], [55.84, -20.87]],
    clipExtent: { x1: 0.0967, y1: -0.052, x2: 0.1371, y2: -0.02 },
  },
  {
    code: 'FR-TF',
    name: 'Terres australes et antarctiques françaises',
    shortName: 'TAAF',
    center: [69.348, -49.280],
    offset: [350, 250], // Bottom right (large territory)
    bounds: [[39.0, -50.0], [77.0, -37.0]],
    clipExtent: { x1: 0.0967, y1: -0.09, x2: 0.1371, y2: -0.076 },
  },

  // Pacific - Far right, top to bottom
  {
    code: 'FR-NC',
    name: 'Nouvelle-Calédonie',
    center: [165.618, -20.904],
    offset: [550, -100], // Far top right
    bounds: [[163.0, -22.7], [168.0, -19.5]],
    clipExtent: { x1: 0.0967, y1: -0.02, x2: 0.1371, y2: 0.012 },
  },
  {
    code: 'FR-WF',
    name: 'Wallis-et-Futuna',
    center: [-176.176, -13.768],
    offset: [550, 50], // Below NC (small islands)
    bounds: [[-178.2, -14.4], [-176.1, -13.2]],
    clipExtent: { x1: 0.0967, y1: 0.012, x2: 0.1371, y2: 0.033 },
  },
  {
    code: 'FR-PF',
    name: 'Polynésie française',
    center: [-149.566, -17.679],
    offset: [550, 180], // Below WF (large territory)
    bounds: [[-154, -28], [-134, -7]],
    clipExtent: { x1: 0.0967, y1: 0.033, x2: 0.1371, y2: 0.0864 },
  },

  // Saint-Barthélemy
  {
    code: 'FR-BL',
    name: 'Saint-Barthélemy',
    center: [-62.85, 17.90],
    offset: [-450, -150], // Above Saint-Martin (very small)
    bounds: [[-62.88, 17.87], [-62.79, 17.97]],
    clipExtent: { x1: -0.14, y1: -0.08, x2: -0.0996, y2: -0.06 },
  },
]

/**
 * All French territories combined (mainland + overseas)
 */
export const ALL_TERRITORIES: TerritoryConfig[] = [MAINLAND_FRANCE, ...OVERSEAS_TERRITORIES]

/**
 * Territory codes only (for quick iteration)
 */
export const TERRITORY_CODES = extractTerritoryCodes(ALL_TERRITORIES)

/**
 * Territory lookup by code
 */
export const TERRITORIES_BY_CODE = createTerritoryMap(ALL_TERRITORIES)

/**
 * Get territory configuration by code
 */
export function getTerritoryConfig(code: string): TerritoryConfig | undefined {
  return TERRITORIES_BY_CODE.get(code)
}

/**
 * Get territory name by code
 */
export function getTerritoryName(code: string): string {
  return TERRITORIES_BY_CODE.get(code)?.name || code
}

/**
 * Get territory short name (or full name if no short name)
 */
export function getTerritoryShortName(code: string): string {
  const config = TERRITORIES_BY_CODE.get(code)
  return config?.shortName || config?.name || code
}

/**
 * Territory groupings for UI organization
 */
export const TERRITORY_GROUPS: Record<string, TerritoryGroupConfig> = {
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
    codes: ['FR-NC', 'FR-PF', 'FR-WF'],
  },
  NORTH_ATLANTIC: {
    label: 'Atlantique Nord',
    codes: ['FR-PM'],
  },
} as const

/**
 * Get the geographic region for a French territory code
 */
export function getTerritoryWorldRegion(code: string): string {
  for (const groupKey in TERRITORY_GROUPS) {
    const group = TERRITORY_GROUPS[groupKey]
    if (group?.codes.includes(code)) {
      return group.label
    }
  }
  return 'Other'
}

/**
 * Territory mode definitions
 * Define which territories are included in each display mode
 */
export const TERRITORY_MODES: Record<string, TerritoryModeConfig> = {
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
    codes: ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-NC'],
  },
  'all-territories': {
    label: 'Tous les territoires',
    codes: ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-NC', 'FR-TF', 'FR-WF', 'FR-PM', 'FR-BL'],
  },
} as const

export type TerritoryMode = keyof typeof TERRITORY_MODES

/**
 * Get territory codes for a given mode
 */
export function getTerritoriesForMode(mode: TerritoryMode): readonly string[] {
  return TERRITORY_MODES[mode]?.codes || []
}

/**
 * Territory list with full names for UI display
 */
export const TERRITORY_LIST = [
  { code: 'FR-GF', name: 'Guyane française' },
  { code: 'FR-RE', name: 'La Réunion' },
  { code: 'FR-GP', name: 'Guadeloupe' },
  { code: 'FR-MQ', name: 'Martinique' },
  { code: 'FR-YT', name: 'Mayotte' },
  { code: 'FR-MF', name: 'Saint-Martin' },
  { code: 'FR-PF', name: 'Polynésie française' },
  { code: 'FR-NC', name: 'Nouvelle-Calédonie' },
  { code: 'FR-TF', name: 'Terres australes et antarctiques françaises' },
  { code: 'FR-WF', name: 'Wallis-et-Futuna' },
  { code: 'FR-PM', name: 'Saint-Pierre-et-Miquelon' },
  { code: 'FR-BL', name: 'Saint-Barthélemy' },
] as const

/**
 * Projection parameters for France
 */
export const FRANCE_PROJECTION_PARAMS = {
  center: {
    longitude: 2.5,
    latitude: 46.5,
  },
  rotate: {
    mainland: [-2, 0] as [number, number],
    azimuthal: [-2, -46.5] as [number, number],
  },
  parallels: {
    conic: [44, 49] as [number, number],
  },
} as const

/**
 * Default reset values for French territory translations
 * These match the offset values defined in OVERSEAS_TERRITORIES
 */
export const DEFAULT_TERRITORY_TRANSLATIONS = createDefaultTranslations(OVERSEAS_TERRITORIES)

/**
 * Variable name mappings for code generation
 */
export const TERRITORY_VAR_NAMES: Record<string, string> = {
  'FR-GF': 'guyane',
  'FR-MQ': 'martinique',
  'FR-GP': 'guadeloupe',
  'FR-YT': 'mayotte',
  'FR-RE': 'reunion',
  'FR-NC': 'nouvelleCaledonie',
  'FR-WF': 'wallisFutuna',
  'FR-PF': 'polynesie',
  'FR-PM': 'stPierreMiquelon',
  'FR-MF': 'saintMartin',
  'FR-TF': 'terresAustrales',
  'FR-BL': 'saintBarthelemy',
} as const

/**
 * Get JavaScript variable name for a French territory code
 */
export function getTerritoryVarName(code: string): string {
  return TERRITORY_VAR_NAMES[code] || code.toLowerCase().replace('-', '')
}

/**
 * Default geographic data configuration for French territories
 * This configuration can be passed to GeoDataService
 * Note: Update resolution suffix (50m) if using different Natural Earth resolution
 */
export const DEFAULT_GEO_DATA_CONFIG: GeoDataConfig = {
  dataPath: '/data/france-territories-50m.json',
  metadataPath: '/data/france-metadata-50m.json',
  topologyObjectName: 'territories',
  mainlandCode: 'FR-MET',
  mainlandBounds: MAINLAND_FRANCE.bounds, // Use bounds from mainland config
  overseasTerritories: OVERSEAS_TERRITORIES,
}

/**
 * Default composite projection configuration for French territories
 * This configuration can be passed to CustomCompositeProjection
 */
export const DEFAULT_COMPOSITE_PROJECTION_CONFIG = {
  mainland: MAINLAND_FRANCE,
  overseasTerritories: OVERSEAS_TERRITORIES,
}
