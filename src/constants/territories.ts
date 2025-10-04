/**
 * Centralized territory configuration
 * All territory codes, labels, geographic data, and default positioning
 */

export interface TerritoryConfig {
  code: string
  name: string
  shortName?: string
  center: [number, number] // [longitude, latitude]
  scale: number // Base scale for the projection
  offset: [number, number] // [x, y] pixel offset relative to mainland center
  bounds: [[number, number], [number, number]] // [[minLon, minLat], [maxLon, maxLat]]
  projectionType?: string // Default projection type (mercator, conic-conformal, etc.)
}

/**
 * France Métropolitaine configuration
 */
export const MAINLAND_FRANCE: TerritoryConfig = {
  code: 'FR-MET',
  name: 'France Métropolitaine',
  shortName: 'Métropole',
  center: [2.5, 46.5],
  scale: 2800,
  offset: [0, 0], // Center reference point
  bounds: [[-5, 41], [10, 51]],
  projectionType: 'conic-conformal',
}

/**
 * DOM-TOM (Départements et Régions d'Outre-Mer) configurations
 * Optimized positioning for better visual layout
 */
export const OVERSEAS_TERRITORIES: TerritoryConfig[] = [
  // Caribbean - Left side, top to bottom
  {
    code: 'FR-MF',
    name: 'Saint-Martin',
    center: [-63.082, 18.067],
    scale: 40000,
    offset: [-450, -50], // Top left
    bounds: [[-63.15, 18.04], [-63.0, 18.13]],
  },
  {
    code: 'FR-GP',
    name: 'Guadeloupe',
    center: [-61.551, 16.265],
    scale: 18000,
    offset: [-450, 50], // Below Saint-Martin
    bounds: [[-61.81, 15.83], [-61.0, 16.52]],
  },
  {
    code: 'FR-MQ',
    name: 'Martinique',
    center: [-61.024, 14.642],
    scale: 20000,
    offset: [-450, 150], // Below Guadeloupe
    bounds: [[-61.23, 14.39], [-60.81, 14.88]],
  },
  {
    code: 'FR-GF',
    name: 'Guyane',
    shortName: 'Guyane Française',
    center: [-53.1, 3.9],
    scale: 2200,
    offset: [-450, 280], // Below Martinique (larger territory)
    bounds: [[-54.6, 2.1], [-51.6, 5.8]],
  },

  // North Atlantic
  {
    code: 'FR-PM',
    name: 'Saint-Pierre-et-Miquelon',
    center: [-56.327, 46.885],
    scale: 25000,
    offset: [-200, -200], // Top center-left
    bounds: [[-56.42, 46.75], [-56.13, 47.15]],
  },

  // Indian Ocean - Right side, top to bottom
  {
    code: 'FR-YT',
    name: 'Mayotte',
    center: [45.166, -12.827],
    scale: 35000,
    offset: [350, -50], // Top right (small island)
    bounds: [[44.98, -13.0], [45.3, -12.64]],
  },
  {
    code: 'FR-RE',
    name: 'La Réunion',
    center: [55.536, -21.115],
    scale: 18000,
    offset: [350, 50], // Below Mayotte
    bounds: [[55.22, -21.39], [55.84, -20.87]],
  },
  {
    code: 'FR-TF',
    name: 'Terres australes et antarctiques françaises',
    shortName: 'TAAF',
    center: [69.348, -49.280],
    scale: 2500,
    offset: [350, 250], // Bottom right (large territory)
    bounds: [[39.0, -50.0], [77.0, -37.0]],
  },

  // Pacific - Far right, top to bottom
  {
    code: 'FR-NC',
    name: 'Nouvelle-Calédonie',
    center: [165.618, -20.904],
    scale: 3000,
    offset: [550, -100], // Far top right
    bounds: [[163.0, -22.7], [168.0, -19.5]],
  },
  {
    code: 'FR-WF',
    name: 'Wallis-et-Futuna',
    center: [-176.176, -13.768],
    scale: 35000,
    offset: [550, 50], // Below NC (small islands)
    bounds: [[-178.2, -14.4], [-176.1, -13.2]],
  },
  {
    code: 'FR-PF',
    name: 'Polynésie française',
    center: [-149.566, -17.679],
    scale: 8000,
    offset: [550, 180], // Below WF (large territory)
    bounds: [[-154, -28], [-134, -7]],
  },

  // Saint-Barthélemy (not in original list but should be included)
  {
    code: 'FR-BL',
    name: 'Saint-Barthélemy',
    center: [-62.85, 17.90],
    scale: 45000,
    offset: [-450, -150], // Above Saint-Martin (very small)
    bounds: [[-62.88, 17.87], [-62.79, 17.97]],
  },
]

/**
 * All territories combined (mainland + overseas)
 */
export const ALL_TERRITORIES: TerritoryConfig[] = [MAINLAND_FRANCE, ...OVERSEAS_TERRITORIES]

/**
 * Territory codes only (for quick iteration)
 */
export const TERRITORY_CODES = ALL_TERRITORIES.map(t => t.code)

/**
 * Territory lookup by code
 */
export const TERRITORIES_BY_CODE = new Map<string, TerritoryConfig>(
  ALL_TERRITORIES.map(t => [t.code, t]),
)

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
 * Default projection types for different territory types
 */
export const DEFAULT_PROJECTION_TYPES = {
  MAINLAND: 'conic-conformal',
  OVERSEAS: 'mercator',
  POLAR: 'azimuthal-equal-area',
} as const

/**
 * Territory groupings for UI organization
 */
export const TERRITORY_GROUPS = {
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
