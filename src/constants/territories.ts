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
  clipExtent?: { x1: number, y1: number, x2: number, y2: number } // Clip extent for composite projection
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
  offset: [80, 0], // Center reference point + small right for better visual balance with Corse
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
    clipExtent: { x1: -0.14, y1: -0.052, x2: -0.0996, y2: -0.032 },
  },
  {
    code: 'FR-GP',
    name: 'Guadeloupe',
    center: [-61.551, 16.265],
    scale: 25000, // Adjusted for actual geographic size (~1,628 km²)
    offset: [-450, 50], // Below Saint-Martin
    bounds: [[-61.81, 15.83], [-61.0, 16.52]],
    clipExtent: { x1: -0.14, y1: -0.032, x2: -0.0996, y2: 0 },
  },
  {
    code: 'FR-MQ',
    name: 'Martinique',
    center: [-61.024, 14.642],
    scale: 28000, // Adjusted for actual geographic size (~1,128 km²)
    offset: [-450, 150], // Below Guadeloupe
    bounds: [[-61.23, 14.39], [-60.81, 14.88]],
    clipExtent: { x1: -0.14, y1: 0, x2: -0.0996, y2: 0.029 },
  },
  {
    code: 'FR-GF',
    name: 'Guyane',
    shortName: 'Guyane Française',
    center: [-53.1, 3.9],
    scale: 2200,
    offset: [-300, 180], // Below Martinique (larger territory)
    bounds: [[-54.6, 2.1], [-51.6, 5.8]],
    clipExtent: { x1: -0.14, y1: 0.029, x2: -0.0996, y2: 0.0864 },
  },

  // North Atlantic
  {
    code: 'FR-PM',
    name: 'Saint-Pierre-et-Miquelon',
    center: [-56.327, 46.885],
    scale: 25000,
    offset: [-200, -200], // Top center-left
    bounds: [[-56.42, 46.75], [-56.13, 47.15]],
    clipExtent: { x1: -0.14, y1: -0.076, x2: -0.0996, y2: -0.052 },
  },

  // Indian Ocean - Right side, top to bottom
  {
    code: 'FR-YT',
    name: 'Mayotte',
    center: [45.166, -12.827],
    scale: 35000,
    offset: [350, -50], // Top right (small island)
    bounds: [[44.98, -13.0], [45.3, -12.64]],
    clipExtent: { x1: 0.0967, y1: -0.076, x2: 0.1371, y2: -0.052 },
  },
  {
    code: 'FR-RE',
    name: 'La Réunion',
    center: [55.536, -21.115],
    scale: 22000, // Adjusted for actual geographic size (~2,512 km²)
    offset: [350, 50], // Below Mayotte
    bounds: [[55.22, -21.39], [55.84, -20.87]],
    clipExtent: { x1: 0.0967, y1: -0.052, x2: 0.1371, y2: -0.02 },
  },
  {
    code: 'FR-TF',
    name: 'Terres australes et antarctiques françaises',
    shortName: 'TAAF',
    center: [69.348, -49.280],
    scale: 2500,
    offset: [350, 250], // Bottom right (large territory)
    bounds: [[39.0, -50.0], [77.0, -37.0]],
    clipExtent: { x1: 0.0967, y1: -0.09, x2: 0.1371, y2: -0.076 },
  },

  // Pacific - Far right, top to bottom
  {
    code: 'FR-NC',
    name: 'Nouvelle-Calédonie',
    center: [165.618, -20.904],
    scale: 3000,
    offset: [550, -100], // Far top right
    bounds: [[163.0, -22.7], [168.0, -19.5]],
    clipExtent: { x1: 0.0967, y1: -0.02, x2: 0.1371, y2: 0.012 },
  },
  {
    code: 'FR-WF',
    name: 'Wallis-et-Futuna',
    center: [-176.176, -13.768],
    scale: 35000,
    offset: [550, 50], // Below NC (small islands)
    bounds: [[-178.2, -14.4], [-176.1, -13.2]],
    clipExtent: { x1: 0.0967, y1: 0.012, x2: 0.1371, y2: 0.033 },
  },
  {
    code: 'FR-PF',
    name: 'Polynésie française',
    center: [-149.566, -17.679],
    scale: 8000,
    offset: [550, 180], // Below WF (large territory)
    bounds: [[-154, -28], [-134, -7]],
    clipExtent: { x1: 0.0967, y1: 0.033, x2: 0.1371, y2: 0.0864 },
  },

  // Saint-Barthélemy (not in original list but should be included)
  {
    code: 'FR-BL',
    name: 'Saint-Barthélemy',
    center: [-62.85, 17.90],
    scale: 45000,
    offset: [-450, -150], // Above Saint-Martin (very small)
    bounds: [[-62.88, 17.87], [-62.79, 17.97]],
    clipExtent: { x1: -0.14, y1: -0.08, x2: -0.0996, y2: -0.06 },
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

/**
 * Territory region mappings for geographic classification
 */
export const TERRITORY_REGIONS: Record<string, string> = {
  'FR-MET': 'Europe',
  'FR-PM': 'North America',
  'FR-MF': 'Caribbean',
  'FR-BL': 'Caribbean',
  'FR-GP': 'Caribbean',
  'FR-MQ': 'Caribbean',
  'FR-GF': 'South America',
  'FR-PF': 'Pacific Ocean',
  'FR-NC': 'Pacific Ocean',
  'FR-WF': 'Pacific Ocean',
  'FR-RE': 'Indian Ocean',
  'FR-YT': 'Indian Ocean',
  'FR-TF': 'Indian Ocean',
}

/**
 * Get the geographic region for a territory code
 */
export function getTerritoryRegion(code: string): string {
  return TERRITORY_REGIONS[code] || 'Other'
}

/**
 * Territory mode definitions
 * Define which territories are included in each mode
 */
export const TERRITORY_MODES = {
  'metropole-only': {
    label: 'Métropole uniquement',
    codes: [],
  },
  'metropole-major': {
    label: 'Métropole + DOM majeurs',
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
 * Default translation ranges for territory controls (in pixels)
 */
export const TRANSLATION_RANGES = {
  x: { min: -600, max: 600, step: 10 },
  y: { min: -400, max: 400, step: 10 },
} as const

/**
 * Default scale range for territory controls
 */
export const SCALE_RANGE = {
  min: 0.5,
  max: 2.0,
  step: 0.1,
  default: 1.0,
} as const

/**
 * Default reset values for territory translations
 * These match the offset values defined in OVERSEAS_TERRITORIES
 */
export const DEFAULT_TERRITORY_TRANSLATIONS = Object.fromEntries(
  OVERSEAS_TERRITORIES.map(t => [t.code, { x: t.offset[0], y: t.offset[1] }]),
) as Record<string, { x: number, y: number }>

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
 * Get JavaScript variable name for a territory code
 */
export function getTerritoryVarName(code: string): string {
  return TERRITORY_VAR_NAMES[code] || code.toLowerCase().replace('-', '')
}
