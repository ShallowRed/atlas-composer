/**
 * Unified Config Loader
 * Adapter to transform shared JSON configs into complete atlas configurations
 */

import type {
  AtlasConfig,
  GeoDataConfig,
  TerritoryConfig,
  TerritoryGroupConfig,
  TerritoryModeConfig,
} from '@/types/territory'

/**
 * Projection parameters for an atlas
 */
export interface ProjectionParams {
  center: {
    longitude: number
    latitude: number
  }
  rotate: {
    mainland: [number, number]
    azimuthal: [number, number]
  }
  parallels: {
    conic: [number, number]
  }
}

/**
 * Default composite projection settings
 */
export interface CompositeProjectionDefaults {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, { x: number, y: number }>
  territoryScales: Record<string, number>
}

/**
 * Projection preferences for an atlas
 */
export interface ProjectionPreferences {
  /** Array of recommended projection IDs for this atlas */
  recommended?: string[]
  /** Default projections for different territory types */
  default?: {
    mainland?: string
    overseas?: string
  }
  /** Array of projection IDs that are not suitable for this atlas */
  prohibited?: string[]
}

/**
 * Atlas-specific configuration
 */
export interface AtlasSpecificConfig {
  projectionParams: ProjectionParams
  territoryModes: Record<string, TerritoryModeConfig>
  territoryGroups?: Record<string, TerritoryGroupConfig>
  defaultCompositeConfig?: CompositeProjectionDefaults
  projectionPreferences?: ProjectionPreferences
}

/**
 * Complete loaded config for an atlas
 */
export interface LoadedAtlasConfig {
  atlasConfig: AtlasConfig
  atlasSpecificConfig: AtlasSpecificConfig
  territories: {
    mainland: TerritoryConfig
    overseas: TerritoryConfig[]
    all: TerritoryConfig[]
  }
}

/**
 * Transform territory from JSON to TerritoryConfig
 */
function transformTerritory(territory: any): TerritoryConfig {
  return {
    code: territory.code,
    name: territory.name,
    ...(territory.shortName && { shortName: territory.shortName }),
    ...(territory.region && { region: territory.region }),
    center: territory.center,
    offset: territory.rendering?.offset || [0, 0],
    bounds: territory.bounds,
    ...(territory.rendering?.projectionType && {
      projectionType: territory.rendering.projectionType,
    }),
    ...(territory.rendering?.scale && { scale: territory.rendering.scale }),
    ...(territory.rendering?.rotate && { rotate: territory.rendering.rotate }),
    ...(territory.rendering?.parallels && { parallels: territory.rendering.parallels }),
    ...(territory.rendering?.clipExtent && { clipExtent: territory.rendering.clipExtent }),
    ...(territory.rendering?.baseScaleMultiplier && {
      baseScaleMultiplier: territory.rendering.baseScaleMultiplier,
    }),
  }
}

/**
 * Extract territories from config
 */
function extractTerritories(config: any) {
  const mainlandTerritory = config.territories.find((t: any) => t.role === 'mainland')
  const overseasTerritories = config.territories.filter((t: any) => t.role === 'overseas')

  if (!mainlandTerritory) {
    throw new Error(`No mainland territory found in ${config.id}`)
  }

  const mainland = transformTerritory(mainlandTerritory)
  const overseas = overseasTerritories.map(transformTerritory)
  const all = [mainland, ...overseas]

  return { mainland, overseas, all }
}

/**
 * Create territory mode configurations
 */
function createTerritoryModes(
  config: any,
  mainlandCode: string,
): Record<string, TerritoryModeConfig> {
  return Object.fromEntries(
    (config.modes || []).map((mode: any) => [
      mode.id,
      {
        label: mode.label,
        codes: mode.territories.filter((code: string) => code !== mainlandCode),
      },
    ]),
  )
}

/**
 * Create territory group configurations
 */
function createTerritoryGroups(config: any): Record<string, TerritoryGroupConfig> {
  return Object.fromEntries(
    (config.groups || []).map((group: any) => [
      group.id.toUpperCase(),
      {
        label: group.label,
        codes: group.territories,
      },
    ]),
  )
}

/**
 * Create composite projection defaults
 */
function createCompositeDefaults(territories: TerritoryConfig[]): CompositeProjectionDefaults {
  return {
    territoryProjections: Object.fromEntries(
      territories.map(t => [t.code, t.projectionType || 'mercator']),
    ),
    territoryTranslations: Object.fromEntries(
      territories.map(t => [t.code, { x: t.offset[0], y: t.offset[1] }]),
    ),
    territoryScales: Object.fromEntries(territories.map(t => [t.code, 1.0])),
  }
}

/**
 * Create GeoDataConfig
 */
function createGeoDataConfig(config: any, territories: any): GeoDataConfig {
  const baseUrl = import.meta.env.BASE_URL
  return {
    dataPath: `${baseUrl}data/${config.id}-territories-50m.json`,
    metadataPath: `${baseUrl}data/${config.id}-metadata-50m.json`,
    topologyObjectName: 'territories',
    mainlandCode: territories.mainland.code,
    mainlandBounds: territories.mainland.bounds,
    overseasTerritories: territories.overseas,
  }
}

/**
 * Create RegionConfig
 */
/**
 * Create the main atlas configuration object
 */
function createAtlasConfig(
  config: any,
  territories: any,
  geoDataConfig: GeoDataConfig,
  territoryModes: Record<string, TerritoryModeConfig>,
  defaultCompositeConfig: CompositeProjectionDefaults,
): AtlasConfig {
  return {
    id: config.id,
    name: config.name,
    geoDataConfig,
    supportedViewModes: ['split', 'composite-existing', 'composite-custom', 'unified'],
    defaultViewMode: 'composite-custom',
    defaultTerritoryMode:
      config.modes?.[config.modes.length - 1]?.id || 'all-territories',
    defaultCompositeConfig,
    compositeProjections: [`conic-conformal-${config.id}`],
    defaultCompositeProjection: `conic-conformal-${config.id}`,
    compositeProjectionConfig: {
      mainland: territories.mainland,
      overseasTerritories: territories.overseas,
    },
    splitModeConfig: {
      mainlandTitle: territories.mainland.name,
      mainlandCode: territories.mainland.code,
      territoriesTitle: 'Overseas Territories',
    },
    hasTerritorySelector: true,
    territoryModeOptions: (config.modes || []).map((mode: any) => ({
      value: mode.id,
      label: territoryModes[mode.id]!.label,
    })),
  }
}

/**
 * Load complete atlas configuration from JSON config
 *
 * This is the main entry point that transforms a JSON config
 * into all necessary configuration objects for the application.
 */
export function loadAtlasConfig(jsonConfig: any): LoadedAtlasConfig {
  // Extract territories
  const territories = extractTerritories(jsonConfig)

  // Create projection parameters
  const projectionParams: ProjectionParams = jsonConfig.projection as ProjectionParams

  // Create territory modes and groups
  const territoryModes = createTerritoryModes(jsonConfig, territories.mainland.code)
  const territoryGroups = createTerritoryGroups(jsonConfig)

  // Create composite defaults
  const defaultCompositeConfig = createCompositeDefaults(territories.all)

  // Create geo data config
  const geoDataConfig = createGeoDataConfig(jsonConfig, territories)

  // Create atlas config
  const atlasConfig = createAtlasConfig(
    jsonConfig,
    territories,
    geoDataConfig,
    territoryModes,
    defaultCompositeConfig,
  )

  // Extract projection preferences if provided
  const projectionPreferences: ProjectionPreferences | undefined = jsonConfig.projectionPreferences

  // Create atlas-specific config
  const atlasSpecificConfig: AtlasSpecificConfig = {
    projectionParams,
    territoryModes,
    territoryGroups,
    defaultCompositeConfig,
    projectionPreferences,
  }

  return {
    atlasConfig,
    atlasSpecificConfig,
    territories,
  }
}
