/**
 * Territory configuration type definitions
 */

/**
 * Traditional composite projection configuration
 * Used for atlases with a single mainland and multiple overseas territories (e.g., France, Portugal)
 */
export interface TraditionalCompositeConfig {
  type: 'traditional'
  mainland: TerritoryConfig
  overseasTerritories: TerritoryConfig[]
}

/**
 * Multi-mainland composite projection configuration
 * Used for atlases with multiple equal mainland territories (e.g., EU with member states, Malaysia with states)
 */
export interface MultiMainlandCompositeConfig {
  type: 'multi-mainland'
  mainlands: TerritoryConfig[]
  overseasTerritories: TerritoryConfig[]
}

/**
 * Composite projection configuration
 * Union type supporting both traditional (1 mainland + N overseas) and multi-mainland (N mainlands + M overseas) patterns
 */
export type CompositeProjectionConfig = TraditionalCompositeConfig | MultiMainlandCompositeConfig

/**
 * Configuration for a single territory
 */
export interface TerritoryConfig {
  code: string // Unique territory identifier (e.g., FR-GP, US-HI)
  name: string // Full display name
  shortName?: string // Optional abbreviated name
  region?: string // Geographic region for grouping (e.g., 'Caribbean', 'Atlantic', 'Pacific')
  center: [number, number] // Geographic center [longitude, latitude]
  offset: [number, number] // [x, y] pixel offset relative to mainland center for composite layouts
  bounds: [[number, number], [number, number]] // Geographic bounds [[minLon, minLat], [maxLon, maxLat]]
  projectionType?: string // Default projection type (mercator, conic-conformal, azimuthal, etc.)
  clipExtent?: { x1: number, y1: number, x2: number, y2: number } // Clip extent for composite projection layouts
  rotate?: [number, number, number?] // Optional rotation [lambda, phi, gamma] for the projection
  parallels?: [number, number] // Optional standard parallels for conic projections
  baseScaleMultiplier?: number // Scale multiplier relative to mainland for geographic proportionality (default: 1.0 for true proportions, <1.0 smaller, >1.0 larger for visibility)
}

/**
 * Configuration for the geographic data service
 * Defines how to load and process territory data
 */
export interface GeoDataConfig {
  dataPath: string // Path to the TopoJSON data file
  metadataPath: string // Path to the metadata JSON file
  topologyObjectName: string // Name of the TopoJSON object containing territories
  mainlandCode?: string // Optional code for the main/mainland territory (for regions with mainland/overseas split)
  mainlandBounds?: [[number, number], [number, number]] // Optional geographic bounds for mainland filtering
  overseasTerritories: TerritoryConfig[] // List of overseas/remote territories (empty for regions without split)
}

/**
 * Complete atlas configuration
 * Defines all settings for a geographic atlas (France, EU, etc.)
 */
export interface AtlasConfig {
  id: string // Unique identifier (e.g., 'france', 'eu')
  name: string // Display name (e.g., 'France', 'European Union')
  geoDataConfig: GeoDataConfig // Data loading configuration
  supportedViewModes: Array<'split' | 'composite-existing' | 'composite-custom' | 'unified'> // Which view modes are available
  defaultViewMode: 'split' | 'composite-existing' | 'composite-custom' | 'unified' // Default view mode
  splitModeConfig?: {
    mainlandTitle?: string // Title for mainland section (e.g., 'France Métropolitaine')
    mainlandCode?: string // Code for mainland in territory controls (e.g., 'FR-MET', 'PT-CONT')
    territoriesTitle: string // Title for territories section (e.g., 'États membres de l'Union Européenne', 'territoires ultramarins')
  }
  territoryModeOptions?: Array<{ value: string, label: string }> // Options for "Territoires à inclure" selector (null if not applicable)
  defaultTerritoryMode?: string // Default territory mode (e.g., 'metropole-major' for France)
  defaultCompositeConfig?: {
    territoryProjections: Record<string, string>
    territoryTranslations: Record<string, { x: number, y: number }>
    territoryScales: Record<string, number>
  } // Default configuration for composite-custom mode
  compositeProjections?: string[] // Built-in D3 composite projections available for this atlas (e.g., ['conic-conformal-france'])
  defaultCompositeProjection?: string // Default composite projection to use
  compositeProjectionConfig?: CompositeProjectionConfig // Configuration for CompositeProjection class
  hasTerritorySelector?: boolean // Whether to show the territory selector
}

/**
 * Territory mode definition
 * Defines which territories are included in a display mode
 */
export interface TerritoryModeConfig {
  label: string // Display label for the mode
  codes: string[] // Territory codes to include
}

/**
 * Territory grouping for UI organization
 */
export interface TerritoryGroupConfig {
  label: string // Display label for the group
  codes: string[] // Territory codes in this group
}
